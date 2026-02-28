import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  getSettings,
  patchSettings
} from '../controllers/settingsController.js';
import { patchSettingsValidator } from '../validations/settingsValidators.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';

const router = express.Router();

router.use(protect, requireOrganization);

router.get(
  '/',
  auditMiddleware({
    action: 'GET_SETTINGS',
    resource: 'SETTINGS'
  }),
  getSettings
);

router.patch(
  '/',
  requireRoles('manager'),
  patchSettingsValidator,
  validateRequest,
  auditMiddleware({
    action: 'PATCH_SETTINGS',
    resource: 'SETTINGS'
  }),
  patchSettings
);

export default router;
