import cron from 'node-cron';
import { runReorderEngine } from '../services/reorderEngine.js';
import Organization from '../models/Organization.js';

let cronStarted = false;

/**
 * 🔮 Forecast-aware reorder engine cron
 *
 * Runs daily at 00:40
 *
 * Responsibilities:
 * - Evaluate forecast-aware reorder thresholds
 * - Create reorder alerts when needed
 * - Fallback to static logic automatically
 *
 * NOTE:
 * - Does NOT replace existing reorder cron
 * - Runs in parallel, safely
 */
export const startForecastReorderEngineCron = () => {
  if (cronStarted) return;
  cronStarted = true;

  console.log(
    '⏱️ Forecast-aware reorder engine cron scheduled (daily at 00:40)'
  );

  cron.schedule('40 0 * * *', async () => {
    try {
      console.log('🔮 Running forecast-aware reorder engine cron...');

      const organizations = await Organization.find({
        isActive: true
      }).select('_id');

      let totalGenerated = 0;
      for (const organization of organizations) {
        const result = await runReorderEngine({
          triggeredBy: 'FORECAST_CRON',
          organizationId: organization._id
        });
        totalGenerated += result.generated;
      }

      if (totalGenerated > 0) {
        console.warn(
          `⚠️ ${totalGenerated} forecast-aware reorder alert(s) created`
        );
      } else {
        console.log('✅ No forecast-aware reorder alerts needed');
      }

      console.log('🔮 Forecast-aware reorder engine cron completed');
    } catch (err) {
      console.error('❌ Forecast-aware reorder engine cron failed:', err);
    }
  });
};
