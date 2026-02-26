import express from 'express';
import {
  getAuditLogs,
  getAuditLogById
} from '../controllers/auditLogController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requirePermission from '../middlewares/requirePermission.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.AUDIT_LOGS_VIEW)
);

/**
 * 📄 Get audit logs
 * Query:
 *  ?page=1
 *  ?limit=20
 *  ?user=
 *  ?action=
 *  ?resource=
 *  ?success=true|false
 *  ?from=YYYY-MM-DD
 *  ?to=YYYY-MM-DD
 */
router.get('/', getAuditLogs);

/**
 * 🔍 Get single audit log by ID
 */
router.get('/:id', getAuditLogById);

export default router;
