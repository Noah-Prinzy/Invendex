import Product from '../models/Product.js';
import ReorderAlert from '../models/ReorderAlert.js';

/**
 * Clamp value between min and max
 */
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

/**
 * Update forecast trust score for a product
 *
 * Rules:
 * - Valid forecast alert      → +0.05
 * - Very confident & valid   → +0.08
 * - False positive forecast  → -0.10
 */
export const updateForecastTrustForProduct = async (
  productId,
  organizationId = null
) => {
  const product = await Product.findOne({
    _id: productId,
    ...(organizationId ? { organization: organizationId } : {})
  });
  if (!product) return;

  const alerts = await ReorderAlert.find({
    ...(organizationId ? { organization: organizationId } : {}),
    product: productId,
    source: 'forecast',
    resolved: true,
    processed: { $ne: true }
  }).lean();

  if (alerts.length === 0) return;

  let trust = product.forecastTrustScore ?? 0.5;

  for (const alert of alerts) {
    const confidence = alert.metadata?.confidenceScore ?? 0;

    let delta = 0;

    if (alert.usedInPurchaseOrder) {
      delta = confidence >= 0.8 ? 0.08 : 0.05;
    } else {
      // Strict false positive
      delta = -0.1;
    }

    trust = clamp(trust + delta);
  }

  // Persist updated trust score
  product.forecastTrustScore = trust;
  await product.save();

  // Mark alerts as processed
  await ReorderAlert.updateMany(
    {
      ...(organizationId ? { organization: organizationId } : {}),
      product: productId,
      source: 'forecast',
      resolved: true,
      processed: { $ne: true }
    },
    {
      $set: {
        processed: true,
        processedAt: new Date()
      }
    }
  );
};

/**
 * Bulk update trust scores for all products
 */
export const updateAllForecastTrustScores = async (organizationId = null) => {
  const products = await Product.find({
    ...(organizationId ? { organization: organizationId } : {}),
    isActive: true
  }).select('_id');

  for (const product of products) {
    await updateForecastTrustForProduct(product._id, organizationId);
  }
};
