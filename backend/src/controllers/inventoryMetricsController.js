import InventoryMetrics from '../models/InventoryMetrics.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';

/**
 * 📊 Get latest inventory metrics
 * Access: Admin, Staff
 */
export const getLatestInventoryMetrics = async (req, res, next) => {
  try {
    const metrics = await InventoryMetrics.findOne({
      organization: req.organizationId
    })
      .sort({ date: -1 })
      .lean();

    if (!metrics) {
      throw new AppError('No inventory metrics found', 404);
    }

    return successResponse(res, metrics, 'Latest inventory metrics fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * 📅 Get inventory metrics by date range
 * Query params:
 * - from=YYYY-MM-DD (optional)
 * - to=YYYY-MM-DD (optional)
 *
 * Access: Admin, Staff
 */
export const getInventoryMetricsRange = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const filter = {
      organization: req.organizationId
    };

    if (from || to) {
      filter.date = {};

      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        filter.date.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }

    const metrics = await InventoryMetrics.find(filter)
      .sort({ date: 1 })
      .lean();

    return successResponse(
      res,
      {
        count: metrics.length,
        data: metrics
      },
      'Inventory metrics fetched'
    );
  } catch (err) {
    next(err);
  }
};
