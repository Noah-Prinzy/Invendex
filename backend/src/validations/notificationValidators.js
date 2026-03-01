import { param, query } from 'express-validator';

export const listNotificationsValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('unreadOnly')
    .optional()
    .isBoolean()
    .withMessage('unreadOnly must be a boolean')
];

export const notificationIdParamValidator = [
  param('id').isMongoId().withMessage('Invalid notification id')
];

export default {
  listNotificationsValidator,
  notificationIdParamValidator
};
