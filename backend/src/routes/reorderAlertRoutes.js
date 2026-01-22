import express from 'express';
import { compareReorderAlerts } from '../controllers/reorderAlertController.js';

const router = express.Router();

/**
 * 🔍 Compare reorder alerts (STATIC vs FORECAST)
 */
router.get('/compare', compareReorderAlerts);

export default router;
