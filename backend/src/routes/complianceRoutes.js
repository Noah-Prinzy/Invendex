import express from 'express';

import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';
import { requireCsrf } from '../middlewares/csrfProtection.js';
import validateRequest from '../middlewares/validateRequest.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import {
  deleteMyAccount,
  deleteOrganization,
  exportOrganizationData
} from '../controllers/complianceController.js';
import {
  deleteMyAccountValidator,
  deleteOrganizationValidator,
  exportOrganizationDataValidator
} from '../validations/complianceValidators.js';

const router = express.Router();

router.use(protect, requireOrganization);

router.get(
  '/export',
  requireRoles('manager'),
  exportOrganizationDataValidator,
  validateRequest,
  auditMiddleware({
    action: 'EXPORT_ORGANIZATION_DATA',
    resource: 'COMPLIANCE'
  }),
  exportOrganizationData
);

router.post(
  '/delete-account',
  requireCsrf,
  deleteMyAccountValidator,
  validateRequest,
  auditMiddleware({
    action: 'DELETE_MY_ACCOUNT',
    resource: 'COMPLIANCE'
  }),
  deleteMyAccount
);

router.post(
  '/delete-organization',
  requireRoles('owner'),
  requireCsrf,
  deleteOrganizationValidator,
  validateRequest,
  auditMiddleware({
    action: 'DELETE_ORGANIZATION',
    resource: 'COMPLIANCE'
  }),
  deleteOrganization
);

export default router;
