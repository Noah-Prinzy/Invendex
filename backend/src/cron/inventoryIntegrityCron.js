import cron from 'node-cron';
import Organization from '../models/Organization.js';
import {
  persistInventoryIntegrityReport,
  runInventoryIntegrityCheck
} from '../services/inventory/inventoryIntegrityService.js';
import { logger } from '../observability/logger.js';

let cronStarted = false;

const isCronEnabled = () =>
  String(process.env.INVENTORY_INTEGRITY_CRON_ENABLED || 'true')
    .trim()
    .toLowerCase() === 'true';

const getCronExpression = () =>
  String(process.env.INVENTORY_INTEGRITY_CRON || '50 0 * * *').trim();

const shouldAutoFix = () =>
  String(process.env.INVENTORY_INTEGRITY_AUTOFIX || 'false')
    .trim()
    .toLowerCase() === 'true';

const getMaxFindings = () => {
  const value = Number(process.env.INVENTORY_INTEGRITY_MAX_FINDINGS || 200);
  if (!Number.isFinite(value) || value <= 0) {
    return 200;
  }
  return Math.floor(value);
};

const getAlertThreshold = () => {
  const value = Number(process.env.INVENTORY_INTEGRITY_ALERT_THRESHOLD || 1);
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.floor(value);
};

export const startInventoryIntegrityCron = () => {
  if (cronStarted) return;
  cronStarted = true;

  if (!isCronEnabled()) {
    logger.info('inventory_integrity_cron_disabled');
    return;
  }

  const expression = getCronExpression();
  logger.info('inventory_integrity_cron_scheduled', {
    expression,
    autoFix: shouldAutoFix(),
    maxFindings: getMaxFindings(),
    alertThreshold: getAlertThreshold()
  });

  cron.schedule(expression, async () => {
    try {
      logger.info('inventory_integrity_cron_started', {
        expression
      });

      const organizations = await Organization.find({
        isActive: true
      }).select('_id');

      for (const organization of organizations) {
        try {
          const result = await runInventoryIntegrityCheck({
            organizationId: organization._id,
            maxFindings: getMaxFindings(),
            autoFix: shouldAutoFix()
          });

          const persistedReport = await persistInventoryIntegrityReport({
            organizationId: organization._id,
            report: result
          });

          if (result.driftCount > 0) {
            logger.warn('inventory_integrity_drift_detected', {
              organizationId: String(organization._id),
              driftCount: result.driftCount,
              autoFixAppliedCount: result.autoFixAppliedCount,
              issueCounts: result.issueCounts,
              reportId: String(persistedReport?._id || '')
            });
          } else {
            logger.info('inventory_integrity_check_clean', {
              organizationId: String(organization._id),
              inventoryRecordsChecked: result.inventoryRecordsChecked,
              reportId: String(persistedReport?._id || '')
            });
          }

          if (result.driftCount >= getAlertThreshold()) {
            logger.warn('inventory_integrity_alert_threshold_breached', {
              organizationId: String(organization._id),
              driftCount: result.driftCount,
              threshold: getAlertThreshold(),
              reportId: String(persistedReport?._id || '')
            });
          }
        } catch (error) {
          logger.error('inventory_integrity_check_failed', {
            organizationId: String(organization._id),
            err: error
          });
        }
      }
    } catch (error) {
      logger.error('inventory_integrity_cron_failed', {
        err: error
      });
    }
  });
};

export default {
  startInventoryIntegrityCron
};
