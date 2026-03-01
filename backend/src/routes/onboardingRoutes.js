import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import validateRequest from '../middlewares/validateRequest.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import { seedSampleData } from '../controllers/onboardingController.js';
import { seedSampleDataValidator } from '../validations/onboardingValidators.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.USERS_MANAGE)
);

router.post(
  '/seed-sample-data',
  seedSampleDataValidator,
  validateRequest,
  seedSampleData
);

export default router;
