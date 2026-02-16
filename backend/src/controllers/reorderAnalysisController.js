import ReorderAlert from '../models/ReorderAlert.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import { successResponse } from '../utils/response.js';

/**
 * 📊 Analyze forecast vs static reorder alert accuracy
 *
 * STRICT MODE:
 * - Auto-resolved alerts with no PO and no further stock drop = FALSE POSITIVE
 */
export const analyzeForecastVsStatic = async (req, res, next) => {
  try {
    const { fromDate, toDate, minConfidence } = req.query;
    const organizationId = req.organizationId;

    const dateFilter = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);

    const baseMatch = Object.keys(dateFilter).length
      ? { organization: organizationId, triggeredAt: dateFilter }
      : { organization: organizationId };

    const alerts = await ReorderAlert.find(baseMatch)
      .populate('product', 'stock')
      .lean();

    const purchaseOrders = await PurchaseOrder.find({
      organization: organizationId
    })
      .select('reorderAlerts createdAt')
      .lean();

    const poAlertSet = new Set(
      purchaseOrders
        .flatMap(po => po.reorderAlerts || [])
        .map(alertId => alertId.toString())
    );

    const result = {
      static: {
        total: 0,
        valid: 0,
        falsePositives: 0
      },
      forecast: {
        total: 0,
        valid: 0,
        falsePositives: 0,
        byConfidence: {}
      }
    };

    for (const alert of alerts) {
      const isForecast = alert.source === 'forecast';
      const bucket = isForecast ? result.forecast : result.static;

      // Forecast confidence filter (optional)
      if (
        isForecast &&
        minConfidence &&
        (!alert.metadata ||
          alert.metadata.confidenceScore < Number(minConfidence))
      ) {
        continue;
      }

      bucket.total++;

      let isValid = false;

      // 1️⃣ Purchase order created
      if (poAlertSet.has(alert._id.toString())) {
        isValid = true;
      }

      // 2️⃣ Stock dropped further after alert
      if (!isValid) {
        const laterSnapshot = await InventorySnapshot.findOne({
          organization: organizationId,
          product: alert.product,
          recordedAt: { $gt: alert.triggeredAt }
        })
          .sort({ recordedAt: 1 })
          .lean();

        if (
          laterSnapshot &&
          laterSnapshot.stock < alert.stock
        ) {
          isValid = true;
        }
      }

      if (isValid) {
        bucket.valid++;

        if (isForecast && alert.metadata?.confidenceScore) {
          const conf = alert.metadata.confidenceScore;
          const key = conf >= 0.8 ? '0.8+' : conf >= 0.6 ? '0.6+' : 'low';

          bucket.byConfidence[key] =
            bucket.byConfidence[key] || {
              total: 0,
              valid: 0
            };

          bucket.byConfidence[key].total++;
          bucket.byConfidence[key].valid++;
        }
      } else {
        bucket.falsePositives++;

        if (isForecast && alert.metadata?.confidenceScore) {
          const conf = alert.metadata.confidenceScore;
          const key = conf >= 0.8 ? '0.8+' : conf >= 0.6 ? '0.6+' : 'low';

          bucket.byConfidence[key] =
            bucket.byConfidence[key] || {
              total: 0,
              valid: 0
            };

          bucket.byConfidence[key].total++;
        }
      }
    }

    // 📐 Precision calculations
    const finalize = section => ({
      ...section,
      precision:
        section.total > 0
          ? Number((section.valid / section.total).toFixed(2))
          : 0
    });

    result.static = finalize(result.static);

    result.forecast.byConfidence = Object.entries(
      result.forecast.byConfidence
    ).map(([range, data]) => ({
      range,
      precision:
        data.total > 0
          ? Number((data.valid / data.total).toFixed(2))
          : 0,
      total: data.total
    }));

    result.forecast = finalize(result.forecast);

    return successResponse(
      res,
      result,
      'Reorder alert accuracy analysis completed'
    );
  } catch (err) {
    next(err);
  }
};
