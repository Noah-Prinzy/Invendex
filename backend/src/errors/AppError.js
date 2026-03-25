export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode || null;
    Error.captureStackTrace(this, this.constructor);
  }
}
