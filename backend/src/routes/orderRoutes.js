import express from 'express';
import {
  completeOrder,
  createOrder,
  getOrderById,
  getOrders
} from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import {
  completeOrderLimiter,
  createOrderLimiter
} from '../middlewares/rateLimiter.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  createOrderValidator,
  orderIdParamValidator,
  orderQueryValidator
} from '../validations/orderValidator.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.INVENTORY_ADJUST)
);

router.post(
  '/',
  createOrderLimiter,
  createOrderValidator,
  validateRequest,
  auditMiddleware({
    action: 'CREATE_ORDER',
    resource: 'ORDER'
  }),
  createOrder
);
router.get('/', orderQueryValidator, validateRequest, getOrders);
router.get('/:id', orderIdParamValidator, validateRequest, getOrderById);
router.patch(
  '/:id/complete',
  completeOrderLimiter,
  orderIdParamValidator,
  validateRequest,
  auditMiddleware({
    action: 'COMPLETE_ORDER',
    resource: 'ORDER',
    resourceIdFrom: 'params.id'
  }),
  completeOrder
);

export default router;
