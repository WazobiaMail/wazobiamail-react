import { describe, it, expect, mock } from 'bun:test';
import { WazobiaMail, htmlToPlainText, renderEmail, sendReactEmail } from '../src';

function InvoiceEmail({ amount, url }: { amount: string; url: string }) {
  return (
    <div>
      <h1>Invoice Ready</h1>
      <p>Total due: {amount} &amp; tax included.</p>
      <p>
        <a href={url}>Pay Invoice</a>
      </p>
    </div>
  );
}

describe('React Email helpers', () => {
  it('renders JSX elements to doctyped HTML and deterministic plain text', async () => {
    const rendered = await renderEmail(
      <InvoiceEmail amount="$42.00" url="https://pay.acme.test/inv_1" />
    );

    expect(rendered.html.startsWith('<!DOCTYPE html')).toBe(true);
    expect(rendered.html).toContain('<h1>Invoice Ready</h1>');
    expect(rendered.text).toContain('Invoice Ready');
    expect(rendered.text).toContain('Total due: $42.00 & tax included.');
    expect(rendered.text).toContain('Pay Invoice (https://pay.acme.test/inv_1)');
  });

  it('omits plain text generation when plainText is false', async () => {
    const rendered = await renderEmail(<p>Only HTML</p>, { plainText: false });
    expect(rendered.html).toContain('<p>Only HTML</p>');
    expect(rendered.text).toBeUndefined();
  });

  it('sendReactEmail renders JSX and respects explicit html/text overrides', async () => {
    const mockClient = new WazobiaMail('wzbm_mock_key');
    const sendSpy = mock(async () => ({
      success: true,
      message: 'Queued',
      data: { result: { trackingId: 'trk_1', status: 'queued', recipients: 1 } },
    }));
    mockClient.messages.send = sendSpy as any;

    await sendReactEmail(
      mockClient,
      {
        from: 'billing@acme.com',
        to: 'user@example.com',
        subject: 'Your Invoice',
        react: <InvoiceEmail amount="$42.00" url="https://pay.acme.test/inv_1" />,
        text: 'Custom plain fallback',
      },
      { idempotencyKey: 'inv-1' }
    );

    const req = sendSpy.mock.calls[0]?.[0] as any;
    expect(req.html).toContain('<h1>Invoice Ready</h1>');
    expect(req.text).toBe('Custom plain fallback');
    expect(req.react).toBeUndefined();
    expect(sendSpy.mock.calls[0]?.[1]).toEqual({ idempotencyKey: 'inv-1' });
  });

  it('strips style and script tags in htmlToPlainText', () => {
    const text = htmlToPlainText(
      '<style>.a{color:red}</style><script>alert(1)</script><p>Hello<br/>World</p>'
    );
    expect(text).toBe('Hello\nWorld');
  });
});
