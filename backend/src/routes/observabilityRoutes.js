import express from 'express';
import {
  getInventoryIntegrityReport,
  getInventoryIntegrityHistoryReport,
  getObservabilityRuntime,
  getOperationalAlerts,
  getObservabilityPing,
  patchResolveOperationalAlert,
  runInventoryIntegrityAutoFix
} from '../controllers/observabilityController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.OBSERVABILITY_VIEW)
);

router.get('/ping', getObservabilityPing);
router.get('/runtime', getObservabilityRuntime);
router.get('/inventory-integrity', getInventoryIntegrityReport);
router.get('/inventory-integrity/history', getInventoryIntegrityHistoryReport);
router.get('/alerts', getOperationalAlerts);
router.patch(
  '/alerts/:alertId/resolve',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  patchResolveOperationalAlert
);
router.post(
  '/inventory-integrity/autofix',
  requirePermission(PERMISSIONS.INVENTORY_MANAGE),
  runInventoryIntegrityAutoFix
);

export default router;
