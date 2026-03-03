import express from 'express';

import {
  getOrganizationFeatureFlagByKey,
  getOrganizationFeatureFlags,
  patchOrganizationFeatureFlag
} from '../controllers/featureFlagController.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import { protect } from '../middlewares/authMiddleware.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  featureFlagKeyParamValidator,
  patchFeatureFlagValidator
} from '../validations/featureFlagValidators.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.USERS_MANAGE)
);

router.get(
  '/',
  auditMiddleware({
    action: 'GET_FEATURE_FLAGS',
    resource: 'FEATURE_FLAGS'
  }),
  getOrganizationFeatureFlags
);

router.get(
  '/:flagKey',
  featureFlagKeyParamValidator,
  validateRequest,
  auditMiddleware({
    action: 'GET_FEATURE_FLAG_BY_KEY',
    resource: 'FEATURE_FLAGS'
  }),
  getOrganizationFeatureFlagByKey
);

router.patch(
  '/:flagKey',
  patchFeatureFlagValidator,
  validateRequest,
  auditMiddleware({
    action: 'PATCH_FEATURE_FLAG',
    resource: 'FEATURE_FLAGS'
  }),
  patchOrganizationFeatureFlag
);

export default router;
