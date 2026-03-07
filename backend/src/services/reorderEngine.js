import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import ReorderAlert from '../models/ReorderAlert.js';
import SupplierProduct from '../models/SupplierProduct.js';
import { getAverageDailyDemandPerSku } from './inventoryMetricsService.js';
import {
  sendLowStockEmailNotification,
  sendLowStockSmsNotification,
  sendLowStockWhatsappNotification
} from './notifications/notificationService.js';
import { createInAppNotification } from './notifications/inAppNotificationService.js';
import { getOrganizationLowStockNotificationRecipients } from './notifications/notificationRecipientService.js';

const ENGINE_VERSION = 'v1.3';

/**
 * 🔁 Reorder Engine
 * Generates reorder alerts based on demand & stock
 */
export const runReorderEngine = async ({
  triggeredBy: _triggeredBy = 'system',
  lookbackDays = 30,
  source = 'cron',
  runDate = null, // ✅ deterministic engine date
  organizationId = null
} = {}) => {
  if (!organizationId) {
    throw new Error('organizationId is required to run reorder engine');
  }

  // ✅ ENUM-SAFE normalization
  const normalizedSource = String(source).toLowerCase();

  const ALLOWED_SOURCES = ['cron', 'system', 'forecast', 'static', 'manual'];

  if (!ALLOWED_SOURCES.includes(normalizedSource)) {
    throw new Error(`Invalid reorder source: ${source}`);
  }

  // 🕒 Engine execution date (normalized)
  const engineDate = runDate ? new Date(runDate) : new Date();
  engineDate.setHours(0, 0, 0, 0);

  // 🔢 Demand calculation
  const avgDemandPerSku = await getAverageDailyDemandPerSku(
    lookbackDays,
    engineDate,
    organizationId
  );

  // 📦 Active products + warehouse inventory
  const products = await Product.find({
    organization: organizationId,
    isActive: true
  }).lean();
  const productMap = new Map(
    products.map((product) => [String(product._id), product])
  );
  const inventoryRows = await Inventory.find({
    organization: organizationId
  })
    .select('product warehouse quantityOnHand')
    .lean();

  // 🏭 Supplier links
  const supplierLinks = await SupplierProduct.find({
    organization: organizationId,
    isActive: true
  }).lean();

  const alertsCreated = [];
  const notificationRecipients =
    await getOrganizationLowStockNotificationRecipients({
      organizationId
    });

  for (const inventoryRow of inventoryRows) {
    const product = productMap.get(String(inventoryRow.product || ''));
    if (!product) continue;

    const avgDailyDemand = avgDemandPerSku[product.sku] || 0;

    const supplierLink =
      supplierLinks
        .filter((s) => s.product.toString() === product._id.toString())
        .sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred))[0] ||
      null;

    const leadTimeDays =
      supplierLink?.leadTimeDays || product.supplierLeadTimeDays || 7;

    const minimumOrderQuantity = supplierLink?.minimumOrderQuantity || 1;

    // 🧮 Adjusted demand
    const adjustedDailyDemand = avgDailyDemand;

    // 🧠 Forecast confidence
    const trustScore = avgDailyDemand > 0 ? 0.7 : 0.3;

    // 🧮 Reorder level
    const reorderLevel = Math.max(
      Math.ceil(adjustedDailyDemand * leadTimeDays * 1.2),
      product.lowStockThreshold || 0
    );

    // 🚫 No reorder needed
    const currentStock = Number(inventoryRow.quantityOnHand || 0);
    if (currentStock > reorderLevel) continue;

    // ❗ Prevent duplicate active alerts (same product, same day)
    const exists = await ReorderAlert.findOne({
      organization: organizationId,
      product: product._id,
      warehouse: inventoryRow.warehouse,
      triggeredAt: { $gte: engineDate },
      resolved: false
    }).lean();

    if (exists) continue;

    /**
     * ✅ BUSINESS RULE:
     * Always respect supplier MOQ
     */
    const calculatedReorderQty = Math.ceil(adjustedDailyDemand * leadTimeDays);

    const reorderQuantity = Math.max(
      calculatedReorderQty,
      minimumOrderQuantity,
      1
    );

    const alert = await ReorderAlert.create({
      organization: organizationId,
      product: product._id,
      warehouse: inventoryRow.warehouse,
      sku: product.sku,
      stock: currentStock,
      reorderLevel,
      reorderQuantity,
      status: 'ACTIVE',
      triggeredAt: engineDate,
      source: normalizedSource,

      metadata: {
        avgDailyDemand,
        adjustedDailyDemand,
        forecastTrustScore: trustScore,
        leadTimeDays,
        lowStockThreshold: product.lowStockThreshold,
        minimumOrderQuantity,
        engineVersion: ENGINE_VERSION,
        warehouseId: String(inventoryRow.warehouse || '')
      },

      supplier: supplierLink?.supplier || null,
      supplierLeadTimeDays: supplierLink?.leadTimeDays || null,
      supplierUnitCost: supplierLink?.unitCost || null
    });

    alertsCreated.push(alert);

    await createInAppNotification({
      organizationId,
      actorUserId: null,
      type: 'low_stock_alert',
      title: `Low stock: ${product.name}`,
      message: `${product.name} (${product.sku}) dropped to ${currentStock}. Reorder target is ${reorderLevel}.`,
      severity: 'warning',
      entityType: 'REORDER_ALERT',
      entityId: alert._id,
      metadata: {
        sku: product.sku,
        currentStock,
        reorderLevel,
        reorderQuantity,
        warehouseId: String(inventoryRow.warehouse || '')
      }
    });

    sendLowStockEmailNotification({
      organizationName:
        notificationRecipients?.organizationName || 'Organization',
      sku: product.sku,
      productName: product.name,
      currentStock,
      reorderLevel,
      recipients:
        notificationRecipients?.emailEnabled === true
          ? notificationRecipients?.emailRecipients || []
          : []
    }).catch(() => {});

    // Non-blocking operational notification.
    sendLowStockSmsNotification({
      organizationName:
        notificationRecipients?.organizationName || 'Organization',
      sku: product.sku,
      productName: product.name,
      currentStock,
      reorderLevel,
      recipients:
        notificationRecipients?.smsEnabled === true
          ? notificationRecipients?.smsRecipients || []
          : []
    }).catch(() => {});

    sendLowStockWhatsappNotification({
      organizationName:
        notificationRecipients?.organizationName || 'Organization',
      sku: product.sku,
      productName: product.name,
      currentStock,
      reorderLevel,
      recipients:
        notificationRecipients?.whatsappEnabled === true
          ? notificationRecipients?.whatsappRecipients || []
          : []
    }).catch(() => {});
  }

  return {
    generated: alertsCreated.length,
    alerts: alertsCreated
  };
};

export default {
  runReorderEngine
};
