import express from 'express';
import {
  analyzeForecastVsStatic
} from '../controllers/reorderAnalysisController.js';

const router = express.Router();

/**
 * 📊 Forecast vs Static Reorder Alert Accuracy
 *
 * Query Params (optional):
 * - fromDate (ISO)
 * - toDate (ISO)
 * - minConfidence (number, 0–1)
 *
 * Example:
 * GET /api/reorder-analysis/forecast-vs-static?minConfidence=0.6
 */
router.get(
  '/forecast-vs-static',
  analyzeForecastVsStatic
);

export default router;