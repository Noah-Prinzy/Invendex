import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { EnvelopePayload } from '../dto/envelope';

/**
 * Wraps controller results into the legacy public envelope
 * `{ success: true, message, data, meta? }`. Values that already carry a
 * `success` flag (e.g. health payloads) pass through untouched.
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (value && typeof value === 'object' && 'success' in value) {
          return value;
        }
        if (value === null || value === undefined) {
          return { success: true, message: 'Success', data: null };
        }
        if (
          typeof value === 'object' &&
          ('data' in value || 'message' in value || 'meta' in value)
        ) {
          const payload = value as EnvelopePayload;
          return {
            success: true,
            message: payload.message ?? 'Success',
            data: payload.data ?? null,
            ...(payload.meta ? { meta: payload.meta } : {})
          };
        }
        return { success: true, message: 'Success', data: value };
      })
    );
  }
}
