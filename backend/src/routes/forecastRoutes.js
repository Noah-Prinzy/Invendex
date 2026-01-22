import express from 'express';
import { 
    forecastInventory,
    generateReorderAlertsFromForecast
 } from '../controllers/forecastController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();

// 🔐 Admin & Manager only
router.use(protect, requireRoles('admin', 'manager'));

router.get('/inventory', forecastInventory);

router.post(
    '/inventory/reorder-alerts',
    generateReorderAlertsFromForecast
);
export default router;