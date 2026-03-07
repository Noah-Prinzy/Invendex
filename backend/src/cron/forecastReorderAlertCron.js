import cron from 'node-cron';
import Inventory from '../models/Inventory.js';
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
        const inventoryRows = await Inventory.find({
          organization: organization._id
        })
          .select('product warehouse quantityOnHand')
          .lean();

        for (const product of products) {
          try {
            const forecast = await ForecastResult.findOne({
              organization: organization._id,
              product: product._id
            }).sort({ generatedAt: -1 });

            if (!forecast || forecast.avgDailyDemand <= 0) continue;

            const leadTimeDays = product.supplierLeadTimeDays || 7;

            const forecastedDemand = forecast.avgDailyDemand * leadTimeDays;

            const productInventories = inventoryRows.filter(
              (row) => String(row.product) === String(product._id)
            );

            for (const inventoryRow of productInventories) {
              const currentStock = Number(inventoryRow.quantityOnHand || 0);
              if (forecastedDemand <= currentStock) continue;

              // ❗ Prevent duplicate unresolved alerts
              const exists = await ReorderAlert.findOne({
                organization: organization._id,
                product: product._id,
                warehouse: inventoryRow.warehouse,
                resolved: false
              });

              if (exists) continue;

              await ReorderAlert.create({
                organization: organization._id,
                product: product._id,
                warehouse: inventoryRow.warehouse,
                sku: product.sku,
                stock: currentStock,
                reorderLevel: Math.ceil(forecastedDemand),
                reorderQuantity: Math.max(
                  Math.ceil(forecastedDemand - currentStock),
                  1
                ),
                triggeredAt: new Date(),
                source: 'forecast',

                // 🧠 Forecast context
                metadata: {
                  forecastId: forecast._id,
                  confidenceScore: forecast.confidenceScore,
                  avgDailyDemand: forecast.avgDailyDemand,
                  leadTimeDays,
                  warehouseId: String(inventoryRow.warehouse || '')
                },

                // 🧊 Supplier snapshot
                supplier: null,
                supplierLeadTimeDays: leadTimeDays,
                supplierUnitCost: null
              });

              console.warn(
                `🔮 FORECAST ALERT | ${product.sku} | Stock: ${currentStock}`
              );
            }
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
