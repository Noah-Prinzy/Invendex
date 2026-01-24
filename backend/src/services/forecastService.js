import Product from '../models/Product.js';
import ReorderAlert from '../models/ReorderAlert.js';

/**
 * 🔮 Generate forecast-based reorder alerts
 * Safe baseline implementation
 */
export const generateProductForecast = async ({
  triggeredBy = 'system'
} = {}) => {
  const products = await Product.find({ isActive: true });

  const createdAlerts = [];

  for (const product of products) {
    const avgDailyUsage = product.averageDailyUsage || 0;
    const leadTimeDays = product.supplierLeadTimeDays || 7;
    const safetyStockDays = product.safetyStockDays || 3;

    const reorderPoint = Math.ceil(
      avgDailyUsage * (leadTimeDays + safetyStockDays)
    );

    if (product.stock > reorderPoint) continue;

    const existingAlert = await ReorderAlert.findOne({
      product: product._id,
      resolved: false
    });

    if (existingAlert) continue;

    const alert = await ReorderAlert.create({
      product: product._id,
      sku: product.sku,
      stock: product.stock,
      reorderLevel: reorderPoint,
      triggeredAt: new Date(),
      source: 'forecast'
    });

    createdAlerts.push(alert);
  }

  return createdAlerts;
};