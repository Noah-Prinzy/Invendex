import express from 'express';
import {
  getAuditLogs,
  getAuditLogById
} from '../controllers/auditLogController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();

// 🔐 Admin only
router.use(protect, requireRoles('admin'));

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