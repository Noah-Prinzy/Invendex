import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Legacy-compatible application error: serialized as
 * `{ success: false, message }` with the given status code.
 */
export class AppError extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR
  ) {
    super({ message }, statusCode);
  }
}
