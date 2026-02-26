import express from 'express';
import {
  allocateBinStock,
  completePickWorkflowTicket,
  createBin,
  createPickWorkflowTicket,
  getBins,
  getMovementLedger,
  getReplenishmentPlan,
  startPickWorkflowTicket,
  transferBinStock,
  updateBinRules
} from '../controllers/wmsController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import { wmsMutationLimiter } from '../middlewares/rateLimiter.js';
import validateRequest from '../middlewares/validateRequest.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import {
  allocateBinStockValidator,
  createBinValidator,
  createPickTicketValidator,
  listBinsQueryValidator,
  movementLedgerQueryValidator,
  pickTicketIdParamValidator,
  replenishmentQueryValidator,
  transferBinStockValidator,
  updateBinRulesValidator
} from '../validations/wmsValidators.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.WMS_VIEW)
);

router.post(
  '/bins',
  wmsMutationLimiter,
  createBinValidator,
  validateRequest,
  auditMiddleware({
    action: 'CREATE_WMS_BIN',
    resource: 'WMS_BIN'
  }),
  createBin
);
router.get('/bins', listBinsQueryValidator, validateRequest, getBins);
router.patch(
  '/bins/:binId/rules',
  wmsMutationLimiter,
  updateBinRulesValidator,
  validateRequest,
  auditMiddleware({
    action: 'UPDATE_WMS_BIN_RULES',
    resource: 'WMS_BIN',
    resourceIdFrom: 'params.binId'
  }),
  updateBinRules
);

router.post(
  '/bins/allocate',
  wmsMutationLimiter,
  allocateBinStockValidator,
  validateRequest,
  auditMiddleware({
    action: 'ALLOCATE_WMS_BIN_STOCK',
    resource: 'WMS_MOVEMENT'
  }),
  allocateBinStock
);
router.post(
  '/bins/transfer',
  wmsMutationLimiter,
  transferBinStockValidator,
  validateRequest,
  auditMiddleware({
    action: 'TRANSFER_WMS_BIN_STOCK',
    resource: 'WMS_MOVEMENT'
  }),
  transferBinStock
);

router.post(
  '/pick-tickets',
  wmsMutationLimiter,
  createPickTicketValidator,
  validateRequest,
  auditMiddleware({
    action: 'CREATE_WMS_PICK_TICKET',
    resource: 'WMS_PICK_TICKET'
  }),
  createPickWorkflowTicket
);
router.patch(
  '/pick-tickets/:ticketId/start',
  wmsMutationLimiter,
  pickTicketIdParamValidator,
  validateRequest,
  auditMiddleware({
    action: 'START_WMS_PICK_TICKET',
    resource: 'WMS_PICK_TICKET',
    resourceIdFrom: 'params.ticketId'
  }),
  startPickWorkflowTicket
);
router.patch(
  '/pick-tickets/:ticketId/complete',
  wmsMutationLimiter,
  pickTicketIdParamValidator,
  validateRequest,
  auditMiddleware({
    action: 'COMPLETE_WMS_PICK_TICKET',
    resource: 'WMS_PICK_TICKET',
    resourceIdFrom: 'params.ticketId'
  }),
  completePickWorkflowTicket
);

router.get(
  '/movements',
  movementLedgerQueryValidator,
  validateRequest,
  getMovementLedger
);
router.get(
  '/replenishment',
  replenishmentQueryValidator,
  validateRequest,
  getReplenishmentPlan
);

export default router;
