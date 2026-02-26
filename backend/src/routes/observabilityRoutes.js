import express from 'express';
import { getObservabilityPing } from '../controllers/observabilityController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requireRoles('owner', 'admin', 'manager', 'staff')
);

router.get('/ping', getObservabilityPing);

export default router;
