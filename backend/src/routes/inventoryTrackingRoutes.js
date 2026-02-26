import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import validateRequest from '../middlewares/validateRequest.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import {
  recallBatchLimiter,
  releaseSerialsLimiter,
  reserveSerialsLimiter,
  verifySerialScanLimiter
} from '../middlewares/rateLimiter.js';
import {
  getInventoryBatches,
  getSerialHistory,
  getInventorySerials,
  recallBatchLot,
  releaseSerials,
  reserveSerials,
  verifySerialScan
} from '../controllers/inventoryTrackingController.js';
import {
  listInventoryBatchesValidator,
  listInventorySerialsValidator,
  recallBatchValidator,
  releaseSerialsValidator,
  reserveSerialsValidator,
  serialHistoryValidator,
  verifySerialScanValidator
} from '../validations/inventoryTrackingValidators.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.INVENTORY_VIEW)
);

router.get(
  '/batches',
  listInventoryBatchesValidator,
  validateRequest,
  getInventoryBatches
);
router.get(
  '/serials',
  listInventorySerialsValidator,
  validateRequest,
  getInventorySerials
);
router.post(
  '/serials/reserve',
  reserveSerialsLimiter,
  reserveSerialsValidator,
  validateRequest,
  auditMiddleware({
    action: 'RESERVE_INVENTORY_SERIALS',
    resource: 'INVENTORY_SERIAL'
  }),
  reserveSerials
);
router.post(
  '/serials/release',
  releaseSerialsLimiter,
  releaseSerialsValidator,
  validateRequest,
  auditMiddleware({
    action: 'RELEASE_INVENTORY_SERIALS',
    resource: 'INVENTORY_SERIAL'
  }),
  releaseSerials
);
router.post(
  '/serials/verify-scan',
  verifySerialScanLimiter,
  verifySerialScanValidator,
  validateRequest,
  auditMiddleware({
    action: 'VERIFY_INVENTORY_SERIAL_SCAN',
    resource: 'INVENTORY_SERIAL'
  }),
  verifySerialScan
);
router.get(
  '/serials/:serialNumber/history',
  serialHistoryValidator,
  validateRequest,
  getSerialHistory
);
router.post(
  '/recall',
  requirePermission(PERMISSIONS.REORDER_MANAGE),
  recallBatchLimiter,
  recallBatchValidator,
  validateRequest,
  auditMiddleware({
    action: 'RECALL_INVENTORY_BATCH',
    resource: 'INVENTORY_BATCH'
  }),
  recallBatchLot
);

export default router;
