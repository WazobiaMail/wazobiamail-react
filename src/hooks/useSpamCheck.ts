import { useCallback, useEffect, useRef, useState } from 'react';
import { WazobiaMail, type SpamCheckRequest, type SpamCheckResponse } from 'wazobiamail';
import { useWazobiaMail } from '../context';
import type { UseSpamCheckOptions, UseSpamCheckReturn } from '../types';
import { toError } from '../utils';

/**
 * Hook for running pre-send spam and deliverability scoring against the WazobiaMail API.
 */
export function useSpamCheck(
  optionsOrClient?: WazobiaMail | UseSpamCheckOptions
): UseSpamCheckReturn {
  const clientOverride =
    optionsOrClient instanceof WazobiaMail ? optionsOrClient : optionsOrClient?.client;
  const client = useWazobiaMail(clientOverride);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<SpamCheckResponse['data'] | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResult(null);
  }, []);

  const check = useCallback(
    async (payload: SpamCheckRequest): Promise<SpamCheckResponse['data']> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await client.messages.spamCheck(payload);
        if (mountedRef.current) {
          setResult(response.data);
        }
        return response.data;
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

  return {
    isLoading,
    error,
    result,
    check,
    reset,
  };
}
