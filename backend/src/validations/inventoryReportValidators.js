import { body, param, query } from 'express-validator';

const isDateString = (value) => {
  if (value == null || value === '') return true;
  const candidate = new Date(value);
  return Number.isFinite(candidate.getTime());
};

export const exportInventoryReportValidator = [
  query('format')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['csv', 'xlsx'])
    .withMessage('format must be csv or xlsx'),
  query('from')
    .optional({ values: 'falsy' })
    .custom((value) => isDateString(value))
    .withMessage('from must be a valid date'),
  query('to')
    .optional({ values: 'falsy' })
    .custom((value) => isDateString(value))
    .withMessage('to must be a valid date'),
  query('to').custom((value, { req }) => {
    const from = req.query?.from;
    if (!from || !value) return true;
    if (new Date(from).getTime() > new Date(value).getTime()) {
      throw new Error('from cannot be after to');
    }
    return true;
  }),
  query('warehouseId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('warehouseId must be a valid ID')
];

export const queueInventoryReportExportValidator = [
  body('format')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['csv', 'xlsx'])
    .withMessage('format must be csv or xlsx'),
  body('from')
    .optional({ values: 'falsy' })
    .custom((value) => isDateString(value))
    .withMessage('from must be a valid date'),
  body('to')
    .optional({ values: 'falsy' })
    .custom((value) => isDateString(value))
    .withMessage('to must be a valid date'),
  body('to').custom((value, { req }) => {
    const from = req.body?.from;
    if (!from || !value) return true;
    if (new Date(from).getTime() > new Date(value).getTime()) {
      throw new Error('from cannot be after to');
    }
    return true;
  }),
  body('warehouseId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('warehouseId must be a valid ID')
];

export const inventoryReportExportJobIdValidator = [
  param('jobId')
    .isMongoId()
    .withMessage('Invalid inventory report export job ID')
];

export default {
  exportInventoryReportValidator,
  queueInventoryReportExportValidator,
  inventoryReportExportJobIdValidator
};
