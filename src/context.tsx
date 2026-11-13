import { createContext, useContext, useMemo } from 'react';
import { WazobiaError, WazobiaMail } from 'wazobiamail';
import type { WazobiaMailProviderProps } from './types';

export const WazobiaMailContext = createContext<WazobiaMail | null>(null);

/**
 * Provides a shared, memoized `WazobiaMail` client instance to descendant components.
 */
export function WazobiaMailProvider(props: WazobiaMailProviderProps) {
  const { children } = props;

  const providedClient = 'client' in props ? props.client : undefined;
  const apiKey = 'client' in props ? undefined : props.apiKey;
  const baseUrl = 'client' in props ? undefined : props.baseUrl;
  const timeout = 'client' in props ? undefined : props.timeout;
  const customFetch = 'client' in props ? undefined : props.fetch;
  const authScheme = 'client' in props ? undefined : props.authScheme;
  const headers = 'client' in props ? undefined : props.headers;
  const serializedHeaders = headers ? JSON.stringify(headers) : '';

  const client = useMemo(() => {
    if (providedClient) {
      return providedClient;
    }

    return new WazobiaMail({
      apiKey,
      baseUrl,
      timeout,
      fetch: customFetch,
      authScheme,
      headers: serializedHeaders ? (JSON.parse(serializedHeaders) as Record<string, string>) : undefined,
    });
  }, [providedClient, apiKey, baseUrl, timeout, customFetch, authScheme, serializedHeaders]);

  return <WazobiaMailContext.Provider value={client}>{children}</WazobiaMailContext.Provider>;
}

/**
 * Resolves the active `WazobiaMail` client from `<WazobiaMailProvider>` or an explicit override.
 * Throws a `WazobiaError` if neither is available.
 */
export function useWazobiaMail(clientOverride?: WazobiaMail): WazobiaMail {
  const contextClient = useContext(WazobiaMailContext);
  const resolved = clientOverride ?? contextClient;

  if (!resolved) {
    throw new WazobiaError(
      'WazobiaMail client is not initialized. Wrap your component tree with <WazobiaMailProvider> or pass a { client } option.'
    );
  }

  return resolved;
}
