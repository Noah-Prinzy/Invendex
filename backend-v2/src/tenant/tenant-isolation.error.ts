import { HttpStatus } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';

/**
 * Raised when a data access is missing the tenant filter or targets another
 * tenant. Always a 500: it indicates a server-side bug, and we fail closed.
 */
export class TenantIsolationError extends AppError {
  constructor(message: string) {
    super(
      `Tenant isolation violation: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
