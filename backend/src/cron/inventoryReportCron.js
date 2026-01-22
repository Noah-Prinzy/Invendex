import cron from 'node-cron';
import Product from '../models/Product.js';
import InventorySnapshot from '../models/InventorySnapshot.js';

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
      console.log('📦 Running daily inventory snapshot cron...');

      // Snapshot represents YESTERDAY (full closed day)
      const snapshotDate = new Date();
      snapshotDate.setDate(snapshotDate.getDate() - 1);
      snapshotDate.setHours(0, 0, 0, 0);

      // Prevent duplicate snapshots for the same day
      const existing = await InventorySnapshot.exists({
        recordedAt: snapshotDate
      });

      if (existing) {
        console.log('ℹ️ Inventory snapshot already exists for this date');
        return;
      }

      const products = await Product.find({ isActive: true }).select(
        'sku stock price'
      );

      if (!products.length) {
        console.log('ℹ️ No active products to snapshot');
        return;
      }

      const records = products.map(product => ({
        sku: product.sku,
        stock: product.stock,
        price: product.price,
        source: 'cron',
        recordedAt: snapshotDate
      }));

      await InventorySnapshot.insertMany(records);

      console.log(
        `✅ Inventory snapshot saved (${records.length} products)`
      );
    } catch (err) {
      // ❗ NEVER throw — cron must not crash the app
      console.error('❌ Inventory snapshot cron failed:', err);
    }
  });
};