export default class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    isOperational = true,
    errorCode = null
  ) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.errorCode = errorCode || null;

    Error.captureStackTrace(this, this.constructor);
  }
}
