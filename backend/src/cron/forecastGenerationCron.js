import cron from 'node-cron';
import Organization from '../models/Organization.js';
import {
  BACKGROUND_JOB_TYPES,
  createBackgroundJob
} from '../services/jobs/backgroundJobService.js';

let cronStarted = false;

/**
 * 🔮 Inventory forecast generation cron
 * Runs daily at 00:20
 *
 * Responsibilities:
 * - Build historical demand from inventory snapshots
 * - Invoke forecast engine
 * - Persist forecast results (handled by service)
 */
export const startForecastGenerationCron = () => {
  if (cronStarted) return;
  cronStarted = true;

  console.log('⏱️ Inventory forecast cron scheduled (daily at 00:20)');

  cron.schedule('20 0 * * *', async () => {
    try {
      console.log('🔮 Queueing inventory forecast jobs...');
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
            type: BACKGROUND_JOB_TYPES.FORECAST_GENERATION_DAILY,
            payload: {
              runDate: runDate.toISOString(),
              runDateKey,
              lookbackLimit: 30
            },
            dedupeKey: `forecast_generation_daily:${runDateKey}`
          });
          queuedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      console.log(
        `✅ Inventory forecast jobs queued (${queuedCount} orgs, ${failedCount} failures)`
      );
    } catch (err) {
      console.error('❌ Inventory forecast cron failed:', err);
    }
  });
};
