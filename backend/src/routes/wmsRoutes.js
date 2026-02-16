import express from 'express';
import {
  allocateBinStock,
  completePickWorkflowTicket,
  createBin,
  createPickWorkflowTicket,
  getBins,
  getMovementLedger,
  startPickWorkflowTicket,
  transferBinStock
} from '../controllers/wmsController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requireRoles('admin', 'manager', 'staff')
);

router.post('/bins', createBin);
router.get('/bins', getBins);

router.post('/bins/allocate', allocateBinStock);
router.post('/bins/transfer', transferBinStock);

router.post('/pick-tickets', createPickWorkflowTicket);
router.patch('/pick-tickets/:ticketId/start', startPickWorkflowTicket);
router.patch('/pick-tickets/:ticketId/complete', completePickWorkflowTicket);

router.get('/movements', getMovementLedger);

export default router;
