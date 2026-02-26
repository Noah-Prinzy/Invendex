import express from 'express';
import {
  getInventoryIntegrityReport,
  getInventoryIntegrityHistoryReport,
  getObservabilityPing,
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
router.get('/inventory-integrity', getInventoryIntegrityReport);
router.get('/inventory-integrity/history', getInventoryIntegrityHistoryReport);
router.post(
  '/inventory-integrity/autofix',
  requirePermission(PERMISSIONS.INVENTORY_MANAGE),
  runInventoryIntegrityAutoFix
);

export default router;
