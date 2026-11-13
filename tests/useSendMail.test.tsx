import './dom-setup';
import { describe, it, expect, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { WazobiaMail, useSendMail } from '../src';

function WelcomeTemplate({ name }: { name: string }) {
  return (
    <main>
      <h1>Welcome, {name}!</h1>
      <p>
        Activate here: <a href="https://wazobiamail.com/start">Get Started</a>
      </p>
    </main>
  );
}

describe('useSendMail Hook', () => {
  it('tracks loading, success, data, idempotencyKey, and reset states', async () => {
    const mockClient = new WazobiaMail('wzbm_mock_key');
    const sendSpy = mock(async (_payload: any, _opts?: { idempotencyKey?: string }) => ({
      success: true,
      message: 'Email dispatched successfully',
      data: {
        result: {
          trackingId: 'trk_react_123',
          status: 'queued',
          recipients: 1,
        },
      },
    }));
    mockClient.messages.send = sendSpy as any;

    let succeededId = '';
    const { result } = renderHook(() =>
      useSendMail({
        client: mockClient,
        onSuccess: (res) => {
          succeededId = res.data.result.trackingId;
        },
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();

    await act(async () => {
      await result.current.send(
        {
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Hello React',
          html: '<p>Hi</p>',
        },
        { idempotencyKey: 'idem-001' }
      );
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.data?.data.result.trackingId).toBe('trk_react_123');
    expect(succeededId).toBe('trk_react_123');
    expect(sendSpy.mock.calls[0]?.[1]).toEqual({ idempotencyKey: 'idem-001' });

    act(() => {
      result.current.reset();
    });

    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('renders React Email JSX elements via sendReact()', async () => {
    const mockClient = new WazobiaMail('wzbm_mock_key');
    const sendSpy = mock(async () => ({
      success: true,
      message: 'Queued',
      data: {
        result: { trackingId: 'trk_jsx_456', status: 'queued', recipients: 1 },
      },
    }));
    mockClient.messages.send = sendSpy as any;

    const { result } = renderHook(() => useSendMail({ client: mockClient }));

    await act(async () => {
      await result.current.sendReact(
        {
          from: 'hello@acme.com',
          to: 'ada@example.com',
          subject: 'Welcome aboard',
          react: <WelcomeTemplate name="Ada" />,
        },
        { idempotencyKey: 'jsx-idem-1' }
      );
    });

    const sentPayload = sendSpy.mock.calls[0]?.[0] as any;
    expect(sentPayload.html).toContain('<h1>Welcome, Ada!</h1>');
    expect(sentPayload.text).toContain('Welcome, Ada!');
    expect(sentPayload.text).toContain('Get Started (https://wazobiamail.com/start)');
    expect(sendSpy.mock.calls[0]?.[1]).toEqual({ idempotencyKey: 'jsx-idem-1' });
  });

  it('captures errors cleanly and invokes onError callback', async () => {
    const mockClient = new WazobiaMail('wzbm_mock_key');
    mockClient.messages.send = mock(async () => {
      throw new Error('Quota exceeded');
    }) as any;

    let callbackMessage = '';
    const { result } = renderHook(() =>
      useSendMail({
        client: mockClient,
        onError: (err) => {
          callbackMessage = err.message;
        },
      })
    );

    await act(async () => {
      await expect(
        result.current.send({
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Fail test',
        })
      ).rejects.toThrow('Quota exceeded');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error?.message).toBe('Quota exceeded');
    expect(callbackMessage).toBe('Quota exceeded');
  });
});
