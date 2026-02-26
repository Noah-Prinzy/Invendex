import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

/**
 * 🛑 Request validation handler (A26.5.1)
 * Centralizes express-validator error handling
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new AppError(
        errors
          .array()
          .map((e) => e.msg)
          .join(', '),
        400
      )
    );
  }

  next();
};

export default validateRequest;
