import { useCallback, useEffect, useRef, useState } from 'react';
import type { AttachmentUploadResponse, FileAttachment, SendMessageRequest, SendMessageResponse } from 'wazobiamail';
import { useWazobiaMail } from '../context';
import { sendReactEmail } from '../email/renderEmail';
import type {
  SendReactEmailOptions,
  SendReactEmailPayload,
  UseSendMailOptions,
  UseSendMailReturn,
} from '../types';
import { toError } from '../utils';

/**
 * Hook for dispatching transactional emails and React Email JSX templates with lifecycle state.
 */
export function useSendMail(options: UseSendMailOptions = {}): UseSendMailReturn {
  const client = useWazobiaMail(options.client);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<SendMessageResponse | null>(null);

  const mountedRef = useRef(true);
  const onSuccessRef = useRef(options.onSuccess);
  const onErrorRef = useRef(options.onError);

  onSuccessRef.current = options.onSuccess;
  onErrorRef.current = options.onError;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsSuccess(false);
    setError(null);
    setData(null);
  }, []);

  const executeDispatch = useCallback(async (dispatchFn: () => Promise<SendMessageResponse>) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const response = await dispatchFn();
      if (mountedRef.current) {
        setData(response);
        setIsSuccess(true);
      }
      onSuccessRef.current?.(response);
      return response;
    } catch (err) {
      const caught = toError(err);
      if (mountedRef.current) {
        setError(caught);
        setIsSuccess(false);
      }
      onErrorRef.current?.(caught);
      throw caught;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const send = useCallback(
    (payload: SendMessageRequest, sendOptions?: { idempotencyKey?: string }) =>
      executeDispatch(() => client.messages.send(payload, sendOptions)),
    [client, executeDispatch]
  );

  const sendWithAttachments = useCallback(
    (
      payload: SendMessageRequest,
      attachments: FileAttachment[],
      sendOptions?: { idempotencyKey?: string }
    ) => executeDispatch(() => client.messages.sendWithAttachments(payload, attachments, sendOptions)),
    [client, executeDispatch]
  );

  const uploadAttachment = useCallback(
    (
      file: Blob | Uint8Array | string | FileAttachment,
      fileName?: string,
      sendOptions?: { idempotencyKey?: string }
    ): Promise<AttachmentUploadResponse> => client.messages.uploadAttachment(file, fileName, sendOptions),
    [client]
  );

  const sendReact = useCallback(
    (payload: SendReactEmailPayload, sendOptions?: SendReactEmailOptions) =>
      executeDispatch(() => sendReactEmail(client, payload, sendOptions)),
    [client, executeDispatch]
  );

  return {
    isLoading,
    isSuccess,
    error,
    data,
    send,
    sendWithAttachments,
    uploadAttachment,
    sendReact,
    reset,
  };
}
