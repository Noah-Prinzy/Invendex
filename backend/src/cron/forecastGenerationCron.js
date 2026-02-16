import cron from 'node-cron';
import Product from '../models/Product.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Organization from '../models/Organization.js';

// ✅ Correct CJS ↔ ESM interop
import forecastService from '../services/inventory/forecastService.js';
const { generateProductForecast } = forecastService;

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
      console.log('🔮 Running inventory forecast cron...');

      const organizations = await Organization.find({
        isActive: true
      }).select('_id');

      for (const organization of organizations) {
        const products = await Product.find({
          organization: organization._id,
          isActive: true
        }).select('_id sku stock');

        for (const product of products) {
          try {
            // 🕒 Last 30 inventory snapshots (most recent first)
            const snapshots = await InventorySnapshot.find({
              organization: organization._id,
              product: product._id
            })
              .sort({ recordedAt: -1 })
              .limit(30)
              .lean();

            if (snapshots.length < 2) continue;

            // 📉 Build daily consumption history
            const historicalDemand = [];

            for (let i = 0; i < snapshots.length - 1; i++) {
              const consumed =
                snapshots[i].stock - snapshots[i + 1].stock;

              if (consumed > 0) {
                historicalDemand.push(consumed);
              }
            }

            if (historicalDemand.length === 0) continue;

            await generateProductForecast({
              organizationId: organization._id,
              productId: product._id,
              historicalDemand
            });
          } catch (err) {
            console.error(
              `❌ Forecast failed for product ${product.sku}:`,
              err.message
            );
          }
        }
      }

      console.log('✅ Inventory forecast cron completed');
    } catch (err) {
      console.error('❌ Inventory forecast cron failed:', err);
    }
  });
};
