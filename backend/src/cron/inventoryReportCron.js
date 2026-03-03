import cron from 'node-cron';
import Organization from '../models/Organization.js';
import {
  BACKGROUND_JOB_TYPES,
  createBackgroundJob
} from '../services/jobs/backgroundJobService.js';

let cronStarted = false;

/**
 * 📦 Daily inventory snapshot cron
 * Runs every day at 00:05
 * Captures inventory state for the previous full day
 */
export const startInventoryReportCron = () => {
  if (cronStarted) return;
  cronStarted = true;

  console.log('⏱️ Inventory snapshot cron scheduled (daily at 00:05)');

  cron.schedule('5 0 * * *', async () => {
    try {
      console.log('📦 Queueing daily inventory snapshot jobs...');

      const snapshotDate = new Date();
      snapshotDate.setDate(snapshotDate.getDate() - 1);
      snapshotDate.setHours(0, 0, 0, 0);
      const runDateKey = snapshotDate.toISOString().slice(0, 10);

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
            type: BACKGROUND_JOB_TYPES.INVENTORY_SNAPSHOT_DAILY,
            payload: {
              snapshotDate: snapshotDate.toISOString(),
              runDateKey
            },
            dedupeKey: `inventory_snapshot_daily:${runDateKey}`
          });
          queuedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      console.log(
        `✅ Inventory snapshot jobs queued (${queuedCount} orgs, ${failedCount} failures)`
      );
    } catch (err) {
      // ❗ NEVER throw — cron must not crash the app
      console.error('❌ Inventory snapshot cron failed:', err);
    }
  });
};
