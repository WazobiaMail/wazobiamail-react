import type { ReactElement, ReactNode } from 'react';
import type {
  AttachmentUploadResponse,
  FileAttachment,
  WazobiaMail,
  WazobiaClientOptions,
  SendMessageRequest,
  SendMessageResponse,
  SpamCheckRequest,
  SpamCheckResponse,
  SendingDomain,
  DnsRecord,
  MailboxMessageSummary,
  Pagination,
} from 'wazobiamail';

export type WazobiaMailProviderProps =
  | {
      /** Pre-configured WazobiaMail client instance. */
      client: WazobiaMail;
      children?: ReactNode;
    }
  | (WazobiaClientOptions & {
      client?: undefined;
      children?: ReactNode;
    });

export interface RenderEmailOptions {
  /**
   * Generate a plain-text companion body alongside HTML.
   * @default true
   */
  plainText?: boolean;
  /**
   * Pretty-print rendered HTML when supported by the active renderer.
   * @default false
   */
  pretty?: boolean;
}

export interface RenderedEmail {
  html: string;
  text?: string;
}

export interface SendReactEmailPayload extends Omit<SendMessageRequest, 'html' | 'text'> {
  /** React Email or standard JSX element to render into HTML (and optional plain text). */
  react: ReactElement;
  /** Optional explicit HTML override (skips HTML rendering from `react` if supplied). */
  html?: string;
  /** Optional explicit plain-text override (skips text extraction if supplied). */
  text?: string;
}

export interface SendReactEmailOptions {
  idempotencyKey?: string;
  renderOptions?: RenderEmailOptions;
}

export interface UseSendMailOptions {
  client?: WazobiaMail;
  onSuccess?: (data: SendMessageResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseSendMailReturn {
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  data: SendMessageResponse | null;
  send: (
    payload: SendMessageRequest,
    options?: { idempotencyKey?: string }
  ) => Promise<SendMessageResponse>;
  sendWithAttachments: (
    payload: SendMessageRequest,
    attachments: FileAttachment[],
    options?: { idempotencyKey?: string }
  ) => Promise<SendMessageResponse>;
  uploadAttachment: (
    file: Blob | Uint8Array | string | FileAttachment,
    fileName?: string,
    options?: { idempotencyKey?: string }
  ) => Promise<AttachmentUploadResponse>;
  sendReact: (
    payload: SendReactEmailPayload,
    options?: SendReactEmailOptions
  ) => Promise<SendMessageResponse>;
  reset: () => void;
}

export interface UseMailboxOptions {
  client?: WazobiaMail;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
  /**
   * Polling interval in milliseconds. Automatically polls for new messages when > 0
   * and cleans up on unmount or when `mailboxId` changes.
   */
  pollInterval?: number;
  /**
   * Automatically fetch messages on mount and when `mailboxId` changes.
   * @default true
   */
  immediate?: boolean;
}

export interface UseMailboxReturn {
  messages: MailboxMessageSummary[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;
}

export interface UseDomainsOptions {
  client?: WazobiaMail;
  /**
   * Automatically fetch domains on mount.
   * @default true
   */
  immediate?: boolean;
}

export interface UseDomainsReturn {
  domains: SendingDomain[];
  isLoading: boolean;
  error: Error | null;
  list: () => Promise<SendingDomain[]>;
  create: (domainName: string) => Promise<SendingDomain>;
  getDnsRecords: (domainId: string) => Promise<DnsRecord[]>;
  verify: (domainId: string) => Promise<boolean>;
}

export interface UseSpamCheckOptions {
  client?: WazobiaMail;
}

export interface UseSpamCheckReturn {
  isLoading: boolean;
  error: Error | null;
  result: SpamCheckResponse['data'] | null;
  check: (payload: SpamCheckRequest) => Promise<SpamCheckResponse['data']>;
  reset: () => void;
}
