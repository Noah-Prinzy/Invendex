import express from 'express';

import {
  getCurrentOrganizationSubscription,
  patchCurrentOrganizationSubscription
} from '../controllers/subscriptionController.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import { protect } from '../middlewares/authMiddleware.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import validateRequest from '../middlewares/validateRequest.js';
import { patchSubscriptionValidator } from '../validations/subscriptionValidators.js';

const router = express.Router();

router.use(protect, requireOrganization);

router.get(
  '/current',
  auditMiddleware({
    action: 'GET_SUBSCRIPTION',
    resource: 'SUBSCRIPTION'
  }),
  getCurrentOrganizationSubscription
);

router.patch(
  '/current',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  patchSubscriptionValidator,
  validateRequest,
  auditMiddleware({
    action: 'PATCH_SUBSCRIPTION',
    resource: 'SUBSCRIPTION'
  }),
  patchCurrentOrganizationSubscription
);

export default router;
