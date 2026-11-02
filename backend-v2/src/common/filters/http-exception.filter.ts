import {
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Serializes errors in the legacy public contract: `{ success: false, message }`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body: unknown = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object' && 'message' in body) {
        const raw = (body as { message: unknown }).message;
        message = Array.isArray(raw) ? raw.join(', ') : String(raw);
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `${request.method} ${request.url} failed: ${exception.message}`,
        exception.stack
      );
    }

    response.status(status).json({ success: false, message });
  }
}
