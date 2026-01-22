import ReorderAlert from '../models/ReorderAlert.js';

/**
 * 🔍 Compare STATIC vs FORECAST reorder alerts
 *
 * Query params:
 * - fromDate (optional)
 * - toDate (optional)
 * - productId (optional)
 */
export const compareReorderAlerts = async (req, res, next) => {
  try {
    const { fromDate, toDate, productId } = req.query;

    const query = {};

    if (productId) {
      query.product = productId;
    }

    if (fromDate || toDate) {
      query.triggeredAt = {};
      if (fromDate) query.triggeredAt.$gte = new Date(fromDate);
      if (toDate) query.triggeredAt.$lte = new Date(toDate);
    }

    const alerts = await ReorderAlert.find(query)
      .populate('product', 'sku name stock')
      .populate('supplier', 'name leadTimeDays')
      .sort({ triggeredAt: -1 })
      .lean();

    const staticAlerts = [];
    const forecastAlerts = [];

    for (const alert of alerts) {
      if (alert.source === 'FORECAST') {
        forecastAlerts.push(alert);
      } else if (alert.source === 'STATIC') {
        staticAlerts.push(alert);
      }
    }

    const forecastHighConfidence = forecastAlerts.filter(
      a => a.forecastMeta?.confidenceScore >= 0.7
    ).length;

    res.json({
      staticAlerts,
      forecastAlerts,
      summary: {
        totalAlerts: alerts.length,
        staticCount: staticAlerts.length,
        forecastCount: forecastAlerts.length,
        forecastHighConfidence
      }
    });
  } catch (err) {
    next(err);
  }
};