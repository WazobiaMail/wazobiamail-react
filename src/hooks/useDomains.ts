import { useCallback, useEffect, useRef, useState } from 'react';
import type { DnsRecord, SendingDomain } from 'wazobiamail';
import { useWazobiaMail } from '../context';
import type { UseDomainsOptions, UseDomainsReturn } from '../types';
import { toError } from '../utils';

/**
 * Hook for listing, registering, inspecting DNS records, and verifying sending domains.
 */
export function useDomains(options: UseDomainsOptions = {}): UseDomainsReturn {
  const client = useWazobiaMail(options.client);

  const [domains, setDomains] = useState<SendingDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const list = useCallback(async (): Promise<SendingDomain[]> => {
    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await client.domains.list();
      const items = response.data.items;
      if (mountedRef.current) {
        setDomains(items);
      }
      return items;
    } catch (err) {
      const caught = toError(err);
      if (mountedRef.current) {
        setError(caught);
      }
      throw caught;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [client]);

  const create = useCallback(
    async (domainName: string): Promise<SendingDomain> => {
      if (mountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const response = await client.domains.create({ domain: domainName });
        const created = response.data.domain;
        if (mountedRef.current) {
          setDomains((prev) => [...prev, created]);
        }
        return created;
      } catch (err) {
        const caught = toError(err);
        if (mountedRef.current) {
          setError(caught);
        }
        throw caught;
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [client]
  );

  const getDnsRecords = useCallback(
    async (domainId: string): Promise<DnsRecord[]> => {
      const response = await client.domains.getDnsRecords(domainId);
      return response.data?.domain?.records ?? [];
    },
    [client]
  );

  const verify = useCallback(
    async (domainId: string): Promise<boolean> => {
      const response = await client.domains.verify(domainId);
      const verification = response.data?.verification;
      const isVerified = verification?.verificationStatus === 'verified';

      if (mountedRef.current) {
        setDomains((prev) =>
          prev.map((domain) =>
            domain.id === domainId
              ? {
                  ...domain,
                  verificationStatus:
                    verification?.verificationStatus ?? domain.verificationStatus,
                  verified: isVerified,
                  status: verification?.verificationStatus ?? domain.status,
                }
              : domain
          )
        );
      }

      return isVerified;
    },
    [client]
  );

  useEffect(() => {
    if (options.immediate !== false) {
      void list().catch(() => {
        // Error state is already captured inside `error`.
      });
    }
  }, [list, options.immediate]);

  return {
    domains,
    isLoading,
    error,
    list,
    create,
    getDnsRecords,
    verify,
  };
}
