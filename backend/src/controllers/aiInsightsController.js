import { successResponse } from '../utils/response.js';
import {
  getLeadTimeVariabilityInsight,
  getSeasonalityInsight,
  getSupplierReliabilityScores,
  projectPromotionAwareDemand
} from '../services/aiInsightsService.js';

export const getProductSeasonality = async (req, res, next) => {
  try {
    const data = await getSeasonalityInsight({
      organizationId: req.organizationId,
      productId: req.params.productId,
      lookbackDays: req.query.days || 180
    });

    return successResponse(res, data, 'Seasonality insight generated');
  } catch (err) {
    next(err);
  }
};

export const getPromotionForecast = async (req, res, next) => {
  try {
    const data = projectPromotionAwareDemand({
      baseDailyDemand: req.body.baseDailyDemand,
      horizonDays: req.body.horizonDays,
      promotions: req.body.promotions
    });

    return successResponse(res, data, 'Promotion-aware forecast generated');
  } catch (err) {
    next(err);
  }
};

export const getSupplierLeadTimeVariability = async (req, res, next) => {
  try {
    const data = await getLeadTimeVariabilityInsight({
      organizationId: req.organizationId,
      supplierId: req.params.supplierId,
      lookback: req.query.lookback || 50
    });

    return successResponse(
      res,
      data,
      'Lead-time variability insight generated'
    );
  } catch (err) {
    next(err);
  }
};

export const getSupplierReliability = async (req, res, next) => {
  try {
    const data = await getSupplierReliabilityScores({
      organizationId: req.organizationId,
      lookbackDays: req.query.days || 180
    });

    return successResponse(res, data, 'Supplier reliability scoring generated');
  } catch (err) {
    next(err);
  }
};
