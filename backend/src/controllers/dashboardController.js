import { successResponse } from '../utils/response.js';
import {
  getSlowMovingSkus,
  getStockAgingBuckets,
  getSupplierPerformanceRanking,
  getTopSellingItems,
  getTurnoverSkus
} from '../services/dashboardService.js';

export const getDashboardTopSellingItems = async (req, res, next) => {
  try {
    const data = await getTopSellingItems({
      organizationId: req.organizationId,
      days: req.query.days || 30,
      limit: req.query.limit || 10
    });

    return successResponse(res, data, 'Top selling items retrieved');
  } catch (err) {
    next(err);
  }
};

export const getDashboardTurnoverSkus = async (req, res, next) => {
  try {
    const data = await getTurnoverSkus({
      organizationId: req.organizationId,
      days: req.query.days || 30,
      limit: req.query.limit || 20
    });

    return successResponse(res, data, 'Fast turnover SKUs retrieved');
  } catch (err) {
    next(err);
  }
};

export const getDashboardSlowMovingSkus = async (req, res, next) => {
  try {
    const data = await getSlowMovingSkus({
      organizationId: req.organizationId,
      days: req.query.days || 60,
      limit: req.query.limit || 20
    });

    return successResponse(res, data, 'Slow moving stock retrieved');
  } catch (err) {
    next(err);
  }
};

export const getDashboardStockAgingBuckets = async (req, res, next) => {
  try {
    const data = await getStockAgingBuckets({
      organizationId: req.organizationId
    });

    return successResponse(res, data, 'Stock aging buckets retrieved');
  } catch (err) {
    next(err);
  }
};

export const getDashboardSupplierRanking = async (req, res, next) => {
  try {
    const data = await getSupplierPerformanceRanking({
      organizationId: req.organizationId,
      days: req.query.days || 180
    });

    return successResponse(res, data, 'Supplier ranking retrieved');
  } catch (err) {
    next(err);
  }
};
