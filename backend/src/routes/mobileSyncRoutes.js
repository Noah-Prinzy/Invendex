import express from 'express';
import {
  applyMobileMutations,
  getMobileSyncBootstrap
} from '../controllers/mobileSyncController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import validateRequest from '../middlewares/validateRequest.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import {
  mobileSyncBootstrapQueryValidator,
  mobileSyncMutationsValidator
} from '../validations/mobileSyncValidators.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.INVENTORY_VIEW)
);

router.get(
  '/bootstrap',
  mobileSyncBootstrapQueryValidator,
  validateRequest,
  getMobileSyncBootstrap
);
router.post(
  '/mutations',
  requirePermission(PERMISSIONS.INVENTORY_ADJUST),
  mobileSyncMutationsValidator,
  validateRequest,
  applyMobileMutations
);

export default router;
