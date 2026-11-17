import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request / per-message correlation id. For saga messages it is the
 * orderId (`correlation_id`, ADR-005), shared with billing and execution.
 * AsyncLocalStorage keeps concurrent requests isolated.
 */
const storage = new AsyncLocalStorage<string>();

export const withCorrelation = <T>(id: string, fn: () => T): T =>
  storage.run(id, fn);

export const currentCorrelationId = (): string | undefined =>
  storage.getStore();
