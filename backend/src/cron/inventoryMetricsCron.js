import cron from 'node-cron';
import { generateDailyInventoryMetrics } from '../services/inventoryMetricsService.js';
import Organization from '../models/Organization.js';

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
      console.log('📊 Running daily inventory metrics cron...');

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);
      targetDate.setHours(0, 0, 0, 0);

      const organizations = await Organization.find({
        isActive: true
      }).select('_id');

      for (const organization of organizations) {
        await generateDailyInventoryMetrics(
          targetDate,
          'cron',
          organization._id
        );
      }

      console.log('✅ Inventory metrics generated successfully');
    } catch (err) {
      console.error('❌ Inventory metrics cron failed:', err);
    }
  });
};
