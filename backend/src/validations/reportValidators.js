import { body, param } from 'express-validator';
import { REPORT_EXPORT_TYPES } from '../services/reports/reportExportService.js';

export const queueReportExportJobValidator = [
  body('reportType')
    .trim()
    .toUpperCase()
    .isIn(Object.values(REPORT_EXPORT_TYPES))
    .withMessage(
      `reportType must be one of: ${Object.values(REPORT_EXPORT_TYPES).join(', ')}`
    ),
  body('format')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['csv', 'xlsx', 'pdf'])
    .withMessage('format must be csv, xlsx, or pdf')
];

export const reportExportJobIdValidator = [
  param('jobId').isMongoId().withMessage('Invalid report export job ID')
];

export default {
  queueReportExportJobValidator,
  reportExportJobIdValidator
};
