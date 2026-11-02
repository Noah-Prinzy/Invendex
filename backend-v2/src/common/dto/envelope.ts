/**
 * Controller return shape before the envelope interceptor wraps it into the
 * legacy public contract: `{ success: true, message, data, meta? }`.
 */
export interface EnvelopePayload<T = unknown> {
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
}
