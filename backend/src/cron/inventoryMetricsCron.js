import cron from 'node-cron';
import Organization from '../models/Organization.js';
import {
  BACKGROUND_JOB_TYPES,
  createBackgroundJob
} from '../services/jobs/backgroundJobService.js';

let cronStarted = false;

/**
 * 📊 Daily inventory metrics cron
 * Runs every day at 00:10
 * Generates metrics for the previous full day
 */
export const startInventoryMetricsCron = () => {
  if (cronStarted) return;
  cronStarted = true;

  console.log('⏱️ Inventory metrics cron scheduled (daily at 00:10)');

  cron.schedule('10 0 * * *', async () => {
    try {
      console.log('📊 Queueing daily inventory metrics jobs...');

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);
      targetDate.setHours(0, 0, 0, 0);
      const runDateKey = targetDate.toISOString().slice(0, 10);

      const organizations = await Organization.find({
        isActive: true
      })
        .select('_id')
        .lean();

      let queuedCount = 0;
      let failedCount = 0;
      for (const organization of organizations) {
        try {
          await createBackgroundJob({
            organizationId: organization._id,
            type: BACKGROUND_JOB_TYPES.INVENTORY_METRICS_DAILY,
            payload: {
              targetDate: targetDate.toISOString(),
              runDateKey
            },
            dedupeKey: `inventory_metrics_daily:${runDateKey}`
          });
          queuedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      console.log(
        `✅ Inventory metrics jobs queued (${queuedCount} orgs, ${failedCount} failures)`
      );
    } catch (err) {
      console.error('❌ Inventory metrics cron failed:', err);
    }
  });
};
