import './dom-setup';
import { describe, it, expect, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import { WazobiaMail, useDomains, useSpamCheck } from '../src';

describe('useDomains & useSpamCheck Hooks', () => {
  it('lists, registers, reads DNS records, and verifies sending domains', async () => {
    const mockClient = new WazobiaMail('wzbm_mock_key');
    mockClient.domains.list = mock(async () => ({
      success: true,
      data: {
        items: [{ id: 'dom_1', domain: 'mail.acme.com', verificationStatus: 'pending', verified: false }],
      },
    })) as any;

    mockClient.domains.create = mock(async ({ domain }: { domain: string }) => ({
      success: true,
      data: {
        domain: { id: 'dom_2', domain, verificationStatus: 'pending', verified: false },
      },
    })) as any;

    mockClient.domains.getDnsRecords = mock(async () => ({
      success: true,
      data: {
        domain: {
          records: [{ type: 'TXT', name: '@', value: 'v=spf1 include:wazobiamail.com ~all' }],
        },
      },
    })) as any;

    mockClient.domains.verify = mock(async () => ({
      success: true,
      data: { verification: { verificationStatus: 'verified' } },
    })) as any;

    const { result } = renderHook(() => useDomains({ client: mockClient }));

    await waitFor(() => {
      expect(result.current.domains).toHaveLength(1);
    });

    await act(async () => {
      await result.current.create('alerts.acme.com');
    });
    expect(result.current.domains).toHaveLength(2);

    const dns = await result.current.getDnsRecords('dom_1');
    expect(dns[0]?.type).toBe('TXT');

    let verified = false;
    await act(async () => {
      verified = await result.current.verify('dom_1');
    });
    expect(verified).toBe(true);
    expect(result.current.domains[0]?.verified).toBe(true);
  });

  it('scores spam checks and resets cleanly', async () => {
    const mockClient = new WazobiaMail('wzbm_mock_key');
    mockClient.messages.spamCheck = mock(async () => ({
      success: true,
      data: {
        score: 1.2,
        threshold: 5,
        isSpam: false,
        rating: 'excellent',
        badgeColor: 'green',
        deliverabilityScore: 95,
        summary: 'Looks clean',
        rules: [],
      },
    })) as any;

    const { result } = renderHook(() => useSpamCheck(mockClient));

    await act(async () => {
      await result.current.check({ subject: 'Monthly Invoice', textBody: 'Attached.' });
    });

    expect(result.current.result?.isSpam).toBe(false);
    expect(result.current.result?.deliverabilityScore).toBe(95);

    act(() => {
      result.current.reset();
    });
    expect(result.current.result).toBeNull();
  });
});
