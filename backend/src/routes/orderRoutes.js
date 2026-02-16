import express from 'express';
import {
  completeOrder,
  createOrder,
  getOrderById,
  getOrders
} from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();

router.use(protect, requireOrganization, requireRoles('admin', 'manager', 'staff'));

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.patch('/:id/complete', completeOrder);

export default router;
