/**
 * Normalizes any thrown value into an `Error` instance.
 */
export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
