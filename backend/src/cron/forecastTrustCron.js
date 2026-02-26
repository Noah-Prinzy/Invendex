import cron from 'node-cron';
import { updateAllForecastTrustScores } from '../services/forecastTrustService.js';
import Organization from '../models/Organization.js';

let cronStarted = false;

/**
 * 🔁 Forecast trust score cron
 *
 * Runs daily at 00:40
 *
 * Responsibilities:
 * - Evaluate resolved FORECAST alerts
 * - Update Product.forecastTrustScore
 * - Mark alerts as processed
 */
export const startForecastTrustCron = () => {
  if (cronStarted) return;
  cronStarted = true;

  console.log('⏱️ Forecast trust cron scheduled (daily at 00:40)');

  cron.schedule('40 0 * * *', async () => {
    try {
      console.log('🔁 Running forecast trust score update cron...');

      const organizations = await Organization.find({
        isActive: true
      }).select('_id');

      for (const organization of organizations) {
        await updateAllForecastTrustScores(organization._id);
      }

      console.log('✅ Forecast trust scores updated successfully');
    } catch (err) {
      console.error('❌ Forecast trust cron failed:', err);
    }
  });
};
