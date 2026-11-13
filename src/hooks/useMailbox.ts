import { useCallback, useEffect, useRef, useState } from 'react';
import type { MailboxMessageSummary, Pagination } from 'wazobiamail';
import { useWazobiaMail } from '../context';
import type { UseMailboxOptions, UseMailboxReturn } from '../types';
import { toError } from '../utils';

/**
 * Hook for reading, paginating, deleting, and polling enterprise mailbox messages.
 */
export function useMailbox(
  mailboxId: string,
  options: UseMailboxOptions = {}
): UseMailboxReturn {
  const client = useWazobiaMail(options.client);
  const initialPage = options.page ?? 1;
  const limit = options.limit ?? 20;

  const [messages, setMessages] = useState<MailboxMessageSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);
  const pageRef = useRef(initialPage);
  const paginationRef = useRef<Pagination | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    pageRef.current = initialPage;
  }, [mailboxId, initialPage]);

  const fetchPage = useCallback(
    async (targetPage: number): Promise<void> => {
      if (!mailboxId) {
        return;
      }

      if (mountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const response = await client.mailboxes.messages.list(mailboxId, {
          unreadOnly: options.unreadOnly,
          page: targetPage,
          limit,
        });

        const items = response.data?.items ?? [];
        const data = response.data;
        let nextPagination: Pagination | null = null;

        if (data) {
          const page = data.page ?? targetPage;
          const pageSize = data.limit ?? limit;
          const totalItems = data.total ?? items.length;
          const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 0;
          nextPagination = {
            page,
            pageSize,
            totalItems,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          };
        }

        paginationRef.current = nextPagination;

        if (mountedRef.current) {
          setMessages(items);
          setPagination(nextPagination);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(toError(err));
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [client, mailboxId, options.unreadOnly, limit]
  );

  const refresh = useCallback(async (): Promise<void> => {
    await fetchPage(pageRef.current);
  }, [fetchPage]);

  const nextPage = useCallback(async (): Promise<void> => {
    if (paginationRef.current?.hasNext) {
      pageRef.current += 1;
      await fetchPage(pageRef.current);
    }
  }, [fetchPage]);

  const prevPage = useCallback(async (): Promise<void> => {
    if (paginationRef.current?.hasPrev || pageRef.current > 1) {
      pageRef.current = Math.max(1, pageRef.current - 1);
      await fetchPage(pageRef.current);
    }
  }, [fetchPage]);

  const deleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      if (!mailboxId) {
        return;
      }

      try {
        await client.mailboxes.messages.delete(mailboxId, messageId);
        if (mountedRef.current) {
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        }
      } catch (err) {
        const caught = toError(err);
        if (mountedRef.current) {
          setError(caught);
        }
        throw caught;
      }
    },
    [client, mailboxId]
  );

  const stopPolling = useCallback((): void => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (intervalMs: number = options.pollInterval ?? 10_000): void => {
      stopPolling();
      if (intervalMs > 0) {
        pollTimerRef.current = setInterval(() => {
          void fetchPage(pageRef.current);
        }, intervalMs);
      }
    },
    [fetchPage, options.pollInterval, stopPolling]
  );

  useEffect(() => {
    if (options.immediate !== false && mailboxId) {
      void fetchPage(pageRef.current);
    }
  }, [fetchPage, mailboxId, options.immediate]);

  useEffect(() => {
    if (options.pollInterval && options.pollInterval > 0) {
      startPolling(options.pollInterval);
    }
    return () => {
      stopPolling();
    };
  }, [options.pollInterval, startPolling, stopPolling, mailboxId]);

  return {
    messages,
    pagination,
    isLoading,
    error,
    refresh,
    nextPage,
    prevPage,
    deleteMessage,
    startPolling,
    stopPolling,
  };
}
