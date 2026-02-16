import express from 'express';
import { compareReorderAlerts } from '../controllers/reorderAlertController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();
router.use(protect, requireOrganization, requireRoles('admin', 'manager'));

/**
 * 🔍 Compare reorder alerts (STATIC vs FORECAST)
 */
router.get('/compare', compareReorderAlerts);

export default router;
