import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';
import validateRequest from '../middlewares/validateRequest.js';
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

router.use(protect, requireOrganization, requireRoles('admin', 'manager', 'staff'));

router.get('/batches', listInventoryBatchesValidator, validateRequest, getInventoryBatches);
router.get('/serials', listInventorySerialsValidator, validateRequest, getInventorySerials);
router.post('/serials/reserve', reserveSerialsValidator, validateRequest, reserveSerials);
router.post('/serials/release', releaseSerialsValidator, validateRequest, releaseSerials);
router.post(
  '/serials/verify-scan',
  verifySerialScanValidator,
  validateRequest,
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
  requireRoles('admin', 'manager'),
  recallBatchValidator,
  validateRequest,
  recallBatchLot
);

export default router;
