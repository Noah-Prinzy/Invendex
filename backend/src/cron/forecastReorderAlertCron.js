import cron from 'node-cron';
import Product from '../models/Product.js';
import ForecastResult from '../models/ForecastResult.js';
import ReorderAlert from '../models/ReorderAlert.js';
import Organization from '../models/Organization.js';

let cronStarted = false;

/**
 * 🔮 Forecast-based reorder alert cron
 * Runs daily at 00:40 (after forecast generation)
 */
export const startForecastReorderAlertCron = () => {
  if (cronStarted) return;
  cronStarted = true;

  console.log('⏱️ Forecast reorder alert cron scheduled (daily at 00:40)');

  cron.schedule('40 0 * * *', async () => {
    try {
      console.log('🔮 Running forecast reorder alert cron...');

      const organizations = await Organization.find({
        isActive: true
      }).select('_id');

      for (const organization of organizations) {
        const products = await Product.find({
          organization: organization._id,
          isActive: true
        }).lean();

        for (const product of products) {
          try {
            const forecast = await ForecastResult.findOne({
              organization: organization._id,
              product: product._id
            }).sort({ generatedAt: -1 });

            if (!forecast || forecast.avgDailyDemand <= 0) continue;

            const leadTimeDays = product.supplierLeadTimeDays || 7;

            const forecastedDemand = forecast.avgDailyDemand * leadTimeDays;

            if (forecastedDemand <= product.stock) continue;

            // ❗ Prevent duplicate unresolved alerts
            const exists = await ReorderAlert.findOne({
              organization: organization._id,
              product: product._id,
              resolved: false
            });

            if (exists) continue;

            await ReorderAlert.create({
              organization: organization._id,
              product: product._id,
              sku: product.sku,
              stock: product.stock,
              reorderLevel: Math.ceil(forecastedDemand),
              reorderQuantity: Math.max(
                Math.ceil(forecastedDemand - product.stock),
                1
              ),
              triggeredAt: new Date(),
              source: 'forecast',

              // 🧠 Forecast context
              metadata: {
                forecastId: forecast._id,
                confidenceScore: forecast.confidenceScore,
                avgDailyDemand: forecast.avgDailyDemand,
                leadTimeDays
              },

              // 🧊 Supplier snapshot
              supplier: null,
              supplierLeadTimeDays: leadTimeDays,
              supplierUnitCost: null
            });

            console.warn(
              `🔮 FORECAST ALERT | ${product.sku} | Stock: ${product.stock}`
            );
          } catch (err) {
            if (err.code !== 11000) {
              console.error(
                `❌ Forecast reorder failed for ${product.sku}:`,
                err
              );
            }
          }
        }
      }

      console.log('✅ Forecast reorder alert cron completed');
    } catch (err) {
      console.error('❌ Forecast reorder alert cron failed:', err);
    }
  });
};
