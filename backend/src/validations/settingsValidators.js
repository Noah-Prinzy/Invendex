import { body } from 'express-validator';
import Warehouse from '../models/Warehouse.js';

const isValidTimeString = (value) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || '').trim());

const optionalBoolean = (field) =>
  body(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} must be a boolean`)
    .toBoolean();

const optionalInteger = (field, min, max) =>
  body(field)
    .optional()
    .isInt({ min, max })
    .withMessage(`${field} must be an integer between ${min} and ${max}`)
    .toInt();

const optionalFloat = (field, min, max) =>
  body(field)
    .optional()
    .isFloat({ min, max })
    .withMessage(`${field} must be a number between ${min} and ${max}`)
    .toFloat();

export const patchSettingsValidator = [
  body('organizationName')
    .optional()
    .isString()
    .withMessage('organizationName must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('organizationName must be between 2 and 120 characters'),
  body('organizationCode')
    .optional()
    .isString()
    .withMessage('organizationCode must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 24 })
    .withMessage('organizationCode must be between 2 and 24 characters')
    .customSanitizer((value) =>
      String(value || '')
        .trim()
        .toUpperCase()
    ),

  body('companyProfile.timezone')
    .optional()
    .isString()
    .withMessage('companyProfile.timezone must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('companyProfile.timezone must be between 2 and 80 characters'),
  body('companyProfile.currencyCode')
    .optional()
    .isString()
    .withMessage('companyProfile.currencyCode must be a string')
    .bail()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('companyProfile.currencyCode must be exactly 3 characters')
    .customSanitizer((value) =>
      String(value || '')
        .trim()
        .toUpperCase()
    ),
  body('companyProfile.dateFormat')
    .optional()
    .isIn(['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'])
    .withMessage(
      'companyProfile.dateFormat must be YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY'
    ),
  optionalFloat('companyProfile.vatRateDefault', 0, 100),

  optionalBoolean('notifications.lowStockEmailEnabled'),
  optionalBoolean('notifications.lowStockSmsEnabled'),
  body('notifications.lowStockRecipients')
    .optional()
    .isArray({ max: 20 })
    .withMessage(
      'notifications.lowStockRecipients must be an array with up to 20 items'
    ),
  body('notifications.lowStockRecipients.*')
    .optional()
    .isString()
    .withMessage('Each lowStockRecipients item must be a string')
    .bail()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage(
      'Each lowStockRecipients item must be between 3 and 100 chars'
    ),
  optionalBoolean('notifications.quietHours.enabled'),
  body('notifications.quietHours.start')
    .optional()
    .custom((value) => {
      if (!isValidTimeString(value)) {
        throw new Error('notifications.quietHours.start must be HH:mm');
      }
      return true;
    }),
  body('notifications.quietHours.end')
    .optional()
    .custom((value) => {
      if (!isValidTimeString(value)) {
        throw new Error('notifications.quietHours.end must be HH:mm');
      }
      return true;
    }),

  body('inventory.defaultWarehouse')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('inventory.defaultWarehouse must be a valid warehouse ID')
    .bail()
    .custom(async (warehouseId, { req }) => {
      const warehouse = await Warehouse.findOne({
        _id: warehouseId,
        organization: req.organizationId,
        isActive: true,
        isArchived: false
      })
        .select('_id')
        .lean();
      if (!warehouse) {
        throw new Error('inventory.defaultWarehouse not found');
      }
      return true;
    }),
  optionalBoolean('inventory.enforceWarehouseForAdjustments'),
  optionalBoolean('inventory.allowNegativeStock'),
  optionalInteger('inventory.deadStockThresholdDays', 1, 3650),

  body('finance.valuationMethod')
    .optional()
    .isIn(['FIFO', 'LIFO', 'WEIGHTED_AVG'])
    .withMessage('finance.valuationMethod must be FIFO, LIFO, or WEIGHTED_AVG'),
  optionalBoolean('finance.taxInclusivePricing'),

  optionalInteger('userAccess.defaultInviteExpiryHours', 1, 720),
  body('userAccess.defaultEmployeeRole')
    .optional()
    .isIn(['staff', 'manager'])
    .withMessage('userAccess.defaultEmployeeRole must be staff or manager'),
  optionalBoolean('userAccess.allowStaffProductCreation'),
  optionalBoolean('userAccess.allowStaffSoftDeleteOnly'),

  optionalInteger('securitySession.sessionIdleTimeoutMinutes', 5, 1440),
  optionalInteger('securitySession.refreshTokenTtlDays', 1, 60),
  optionalInteger('securitySession.passwordMinLength', 8, 64),
  optionalInteger('securitySession.loginMaxAttempts', 3, 20),
  optionalInteger('securitySession.lockoutDurationMinutes', 1, 120),

  optionalBoolean('realtimeOffline.realtimeEnabled'),
  optionalBoolean('realtimeOffline.autoReconnectEnabled'),
  optionalBoolean('realtimeOffline.offlineQueueAutoSync'),
  optionalInteger('realtimeOffline.offlineQueueRetrySeconds', 5, 600),

  optionalInteger('auditBackup.auditRetentionDays', 30, 3650),
  body('auditBackup.backupSchedule')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage(
      'auditBackup.backupSchedule must be daily, weekly, or monthly'
    ),
  optionalInteger('auditBackup.backupRetentionDays', 7, 3650),
  optionalBoolean('auditBackup.requireRestoreApproval')
];

export default {
  patchSettingsValidator
};
