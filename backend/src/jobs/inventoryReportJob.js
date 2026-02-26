import cron from 'node-cron';
import { generateInventoryReport } from '../services/InventoryReportService.js';

export const startInventoryReportJob = () => {
  // Daily at 23:55
  cron.schedule('55 23 * * *', async () => {
    try {
      await generateInventoryReport({
        type: 'daily'
      });

      console.log('📊 Daily inventory report generated');
    } catch (err) {
      console.error('❌ Inventory report job failed:', err);
    }
  });
};
