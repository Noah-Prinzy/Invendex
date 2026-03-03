import cron from 'node-cron';
import Organization from '../models/Organization.js';
import {
  BACKGROUND_JOB_TYPES,
  createBackgroundJob
} from '../services/jobs/backgroundJobService.js';

let cronStarted = false;

/**
 * 🔁 Forecast-aware reorder automation cron
 *
 * Runs daily at 00:40
 *
 * Responsibilities:
 * - Invoke reorder engine
 * - Let engine decide FORECAST vs STATIC logic
 * - Persist reorder alerts
 *
 * IMPORTANT:
 * - No business logic here
 * - No DB queries here
 * - Safe to run multiple times (idempotent)
 */
export const startForecastReorderCron = () => {
  if (cronStarted) return;
  cronStarted = true;

  console.log('⏱️ Forecast reorder cron scheduled (daily at 00:40)');

  cron.schedule('40 0 * * *', async () => {
    try {
      console.log('🔁 Queueing forecast-aware reorder jobs...');
      const runDate = new Date();
      runDate.setHours(0, 0, 0, 0);
      const runDateKey = runDate.toISOString().slice(0, 10);

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
            type: BACKGROUND_JOB_TYPES.FORECAST_REORDER_DAILY,
            payload: {
              runDate: runDate.toISOString(),
              runDateKey,
              lookbackDays: 30
            },
            dedupeKey: `forecast_reorder_daily:${runDateKey}`
          });
          queuedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      console.log(
        `✅ Forecast reorder jobs queued (${queuedCount} orgs, ${failedCount} failures)`
      );
    } catch (err) {
      console.error('❌ Forecast reorder cron failed:', err);
    }
  });
};
