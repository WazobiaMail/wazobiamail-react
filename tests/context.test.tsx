import './dom-setup';
import { describe, it, expect } from 'bun:test';
import { render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { WazobiaError, WazobiaMail, WazobiaMailProvider, useWazobiaMail } from '../src';

describe('WazobiaMailProvider & useWazobiaMail', () => {
  it('provides a memoized WazobiaMail client initialized from provider options', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WazobiaMailProvider apiKey="wzbm_react_provider_key">{children}</WazobiaMailProvider>
    );

    const { result, rerender } = renderHook(() => useWazobiaMail(), { wrapper });
    const firstInstance = result.current;

    expect(firstInstance).toBeInstanceOf(WazobiaMail);
    rerender();
    expect(result.current).toBe(firstInstance);
  });

  it('uses an explicit pre-configured client prop when supplied', () => {
    const customClient = new WazobiaMail('wzbm_explicit_client');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WazobiaMailProvider client={customClient}>{children}</WazobiaMailProvider>
    );

    const { result } = renderHook(() => useWazobiaMail(), { wrapper });
    expect(result.current).toBe(customClient);
  });

  it('uses a direct override argument even outside WazobiaMailProvider', () => {
    const overrideClient = new WazobiaMail('wzbm_override');
    const { result } = renderHook(() => useWazobiaMail(overrideClient));
    expect(result.current).toBe(overrideClient);
  });

  it('throws WazobiaError when invoked outside WazobiaMailProvider without an override', () => {
    function BrokenConsumer() {
      useWazobiaMail();
      return null;
    }

    expect(() => render(<BrokenConsumer />)).toThrow(WazobiaError);
  });
});
