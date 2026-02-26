import express from 'express';
import { getObservabilityPing } from '../controllers/observabilityController.js';
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

export default router;
