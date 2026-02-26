import express from 'express';
import { analyzeForecastVsStatic } from '../controllers/reorderAnalysisController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();
router.use(protect, requireOrganization, requireRoles('admin', 'manager'));

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
router.get('/forecast-vs-static', analyzeForecastVsStatic);

export default router;
