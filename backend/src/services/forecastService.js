import Product from '../models/Product.js';
import ReorderAlert from '../models/ReorderAlert.js';

/**
 * 🔮 Generate forecast-based reorder alerts
 * Safe baseline implementation
 */
export const generateProductForecast = async ({
  triggeredBy = 'system',
  organizationId = null
} = {}) => {
  const products = await Product.find({
    ...(organizationId ? { organization: organizationId } : {}),
    isActive: true
  });

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
      ...(organizationId ? { organization: organizationId } : {}),
      product: product._id,
      resolved: false
    });

    if (existingAlert) continue;

    const alert = await ReorderAlert.create({
      ...(organizationId ? { organization: organizationId } : {}),
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
