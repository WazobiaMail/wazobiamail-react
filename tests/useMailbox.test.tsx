import './dom-setup';
import { describe, it, expect, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import { WazobiaMail, useMailbox } from '../src';

describe('useMailbox Hook', () => {
  it('loads messages, navigates pages, deletes optimistically, and cleans up polling on unmount', async () => {
    const mockClient = new WazobiaMail('wzbm_mock_key');
    const listSpy = mock(async (_mailboxId: string, params: any) => {
      const page = params?.page ?? 1;
      return {
        success: true,
        data: {
          items: [
            {
              id: `msg_p${page}_1`,
              from: 'a@example.com',
              subject: `Page ${page} Mail`,
              isRead: false,
            },
          ],
          page,
          limit: 1,
          total: 2,
        },
      };
    });
    const deleteSpy = mock(async () => ({ success: true }));

    mockClient.mailboxes.messages.list = listSpy as any;
    mockClient.mailboxes.messages.delete = deleteSpy as any;

    const { result, unmount } = renderHook(() =>
      useMailbox('mbx_123', {
        client: mockClient,
        limit: 1,
        pollInterval: 25,
      })
    );

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    expect(result.current.messages[0]?.id).toBe('msg_p1_1');
    expect(result.current.pagination?.hasNext).toBe(true);
    expect(result.current.pagination?.hasPrev).toBe(false);

    await act(async () => {
      await result.current.nextPage();
    });

    expect(result.current.messages[0]?.id).toBe('msg_p2_1');
    expect(result.current.pagination?.hasPrev).toBe(true);

    await act(async () => {
      await result.current.deleteMessage('msg_p2_1');
    });

    expect(deleteSpy).toHaveBeenCalledWith('mbx_123', 'msg_p2_1');
    expect(result.current.messages).toHaveLength(0);

    const callsBeforeUnmount = listSpy.mock.calls.length;
    unmount();

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(listSpy.mock.calls.length).toBe(callsBeforeUnmount);
  });
});
