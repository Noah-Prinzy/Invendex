import cron from 'node-cron';
import { runReorderEngine } from '../services/reorderEngine.js';

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
      console.log(
        '🔮 Running forecast-aware reorder engine cron...'
      );

      const alerts = await runReorderEngine({
        triggeredBy: 'FORECAST_CRON'
      });

      if (alerts.length > 0) {
        console.warn(
          `⚠️ ${alerts.length} forecast-aware reorder alert(s) created`
        );
      } else {
        console.log(
          '✅ No forecast-aware reorder alerts needed'
        );
      }

      console.log(
        '🔮 Forecast-aware reorder engine cron completed'
      );
    } catch (err) {
      console.error(
        '❌ Forecast-aware reorder engine cron failed:',
        err
      );
    }
  });
};
