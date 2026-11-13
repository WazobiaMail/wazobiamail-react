// Context & Provider
export { WazobiaMailContext, WazobiaMailProvider, useWazobiaMail } from './context';

// React Hooks
export { useSendMail } from './hooks/useSendMail';
export { useMailbox } from './hooks/useMailbox';
export { useDomains } from './hooks/useDomains';
export { useSpamCheck } from './hooks/useSpamCheck';

// React Email Helpers
export { renderEmail, sendReactEmail, htmlToPlainText } from './email/renderEmail';

// Package Types
export type {
  WazobiaMailProviderProps,
  RenderEmailOptions,
  RenderedEmail,
  SendReactEmailPayload,
  SendReactEmailOptions,
  UseSendMailOptions,
  UseSendMailReturn,
  UseMailboxOptions,
  UseMailboxReturn,
  UseDomainsOptions,
  UseDomainsReturn,
  UseSpamCheckOptions,
  UseSpamCheckReturn,
} from './types';

// Re-export Core Client, Errors, and Models for convenient single-import usage
export {
  WazobiaMail,
  Wazobia,
  WazobiaError,
  WazobiaApiError,
  WazobiaAuthenticationError,
  WazobiaForbiddenError,
  WazobiaNotFoundError,
  WazobiaValidationError,
  WazobiaRateLimitError,
  WazobiaTimeoutError,
} from 'wazobiamail';

export type * from 'wazobiamail';
