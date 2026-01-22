import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  adjustProductStock,
  getLowStockProducts,
  getLowStockSummary,
  getInventoryHealthOverview,
  getReorderRecommendations,
  getProductStockHistory
} from '../controllers/productController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requireRoles from '../middlewares/requireRoles.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import validateRequest from '../middlewares/validateRequest.js';

import {
  createProductValidator,
  updateProductValidator,
  adjustStockValidator
} from '../validations/productValidators.js';

import {
  createProductLimiter,
  updateProductLimiter,
  adjustStockLimiter
} from '../middlewares/rateLimiter.js';

const router = express.Router();

/**
 * 🔔 Evaluate reorder trigger (SYSTEM)
 * (left untouched intentionally)
 */
const evaluateReorderTrigger = async product => {
  if (!product.lowStockThreshold) return;

  const now = new Date();

  const isLow =
    product.stock <= product.lowStockThreshold * 2;

  const isCritical =
    product.stock <= product.lowStockThreshold;

  if (!isLow && !isCritical) return;

  if (
    product.lastReorderAlertAt &&
    now - product.lastReorderAlertAt < 24 * 60 * 60 * 1000
  ) {
    return;
  }

  product.lastReorderAlertAt = now;
  await product.save();
};

/**
 * 📄 Products (READ)
 */
router.get('/', protect, getProducts);

router.get(
  '/alerts/low-stock/summary',
  protect,
  requireRoles('admin', 'staff'),
  getLowStockSummary
);

router.get(
  '/alerts/low-stock',
  protect,
  requireRoles('admin', 'staff'),
  getLowStockProducts
);

router.get(
  '/inventory/health',
  protect,
  requireRoles('admin', 'staff'),
  getInventoryHealthOverview
);

router.get(
  '/inventory/reorder-recommendations',
  protect,
  requireRoles('admin', 'staff'),
  getReorderRecommendations
);

router.get(
  '/:id/stock-history',
  protect,
  requireRoles('admin', 'staff'),
  getProductStockHistory
);

/**
 * 📦 Stock adjustment (RATE LIMITED + VALIDATED + AUDITED)
 */
router.patch(
  '/:id/stock',
  protect,
  requireRoles('admin', 'staff'),
  adjustStockLimiter,
  adjustStockValidator,
  validateRequest,
  auditMiddleware({
    action: 'ADJUST_PRODUCT_STOCK',
    resource: 'PRODUCT'
  }),
  adjustProductStock
);

/**
 * ➕ Create product (RATE LIMITED + VALIDATED + AUDITED)
 */
router.post(
  '/',
  protect,
  requireRoles('admin'),
  createProductLimiter,
  createProductValidator,
  validateRequest,
  auditMiddleware({
    action: 'CREATE_PRODUCT',
    resource: 'PRODUCT'
  }),
  createProduct
);

/**
 * ✏️ Update product (RATE LIMITED + VALIDATED + AUDITED)
 */
router.put(
  '/:id',
  protect,
  requireRoles('admin'),
  updateProductLimiter,
  updateProductValidator,
  validateRequest,
  auditMiddleware({
    action: 'UPDATE_PRODUCT',
    resource: 'PRODUCT'
  }),
  updateProduct
);

/**
 * 🗑️ Delete product (AUDITED)
 */
router.delete(
  '/:id',
  protect,
  requireRoles('admin'),
  auditMiddleware({
    action: 'DELETE_PRODUCT',
    resource: 'PRODUCT'
  }),
  deleteProduct
);

/**
 * ♻️ Restore product (AUDITED)
 */
router.patch(
  '/:id/restore',
  protect,
  requireRoles('admin'),
  auditMiddleware({
    action: 'RESTORE_PRODUCT',
    resource: 'PRODUCT'
  }),
  restoreProduct
);

router.get('/:id', protect, getProductById);

export default router;