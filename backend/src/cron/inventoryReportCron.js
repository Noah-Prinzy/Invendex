import cron from 'node-cron';
import Product from '../models/Product.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Organization from '../models/Organization.js';

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

      const organizations = await Organization.find({
        isActive: true
      }).select('_id');

      let totalInserted = 0;

      for (const organization of organizations) {
        // Prevent duplicate snapshots for the same day + tenant.
        const existing = await InventorySnapshot.exists({
          organization: organization._id,
          recordedAt: snapshotDate,
          source: 'CRON'
        });

        if (existing) {
          continue;
        }

        const products = await Product.find({
          organization: organization._id,
          isActive: true
        }).select('_id sku stock price');

        if (!products.length) {
          continue;
        }

        const records = products.map(product => ({
          organization: organization._id,
          product: product._id,
          sku: product.sku,
          stock: product.stock,
          price: product.price,
          source: 'CRON',
          recordedAt: snapshotDate
        }));

        await InventorySnapshot.insertMany(records);
        totalInserted += records.length;
      }

      console.log(
        `✅ Inventory snapshot saved (${totalInserted} records)`
      );
    } catch (err) {
      // ❗ NEVER throw — cron must not crash the app
      console.error('❌ Inventory snapshot cron failed:', err);
    }
  });
};
