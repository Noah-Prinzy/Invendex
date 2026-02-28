import express from 'express';
import {
  getProducts,
  getDeletedProducts,
  getProductById,
  createProduct,
  createProductsBulk,
  updateProduct,
  deleteProduct,
  permanentlyDeleteProduct,
  restoreProduct,
  adjustProductStock,
  getLowStockProducts,
  getLowStockSummary,
  getInventoryHealthOverview,
  getReorderRecommendations,
  getProductStockHistory
} from '../controllers/productController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requirePermission from '../middlewares/requirePermission.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import validateRequest from '../middlewares/validateRequest.js';
import { PERMISSIONS } from '../authorization/permissions.js';

import {
  createProductValidator,
  createProductsBulkValidator,
  updateProductValidator,
  adjustStockValidator
} from '../validations/productValidators.js';

import {
  createProductLimiter,
  updateProductLimiter,
  adjustStockLimiter
} from '../middlewares/rateLimiter.js';

const router = express.Router();
router.use(protect, requireOrganization);

/**
 * 📄 Products (READ)
 */
router.get('/', protect, getProducts);

router.get(
  '/alerts/low-stock/summary',
  requirePermission(PERMISSIONS.PRODUCTS_VIEW),
  getLowStockSummary
);

router.get(
  '/alerts/low-stock',
  requirePermission(PERMISSIONS.PRODUCTS_VIEW),
  getLowStockProducts
);

router.get(
  '/inventory/health',
  requirePermission(PERMISSIONS.PRODUCTS_VIEW),
  getInventoryHealthOverview
);

router.get(
  '/inventory/reorder-recommendations',
  requirePermission(PERMISSIONS.PRODUCTS_VIEW),
  getReorderRecommendations
);

router.get(
  '/deleted',
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  getDeletedProducts
);

router.get(
  '/:id/stock-history',
  requirePermission(PERMISSIONS.PRODUCTS_VIEW),
  getProductStockHistory
);

/**
 * 📦 Stock adjustment (RATE LIMITED + VALIDATED + AUDITED)
 */
router.patch(
  '/:id/stock',
  requirePermission(PERMISSIONS.INVENTORY_ADJUST),
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
  requirePermission(PERMISSIONS.PRODUCTS_EDIT),
  createProductLimiter,
  createProductValidator,
  validateRequest,
  auditMiddleware({
    action: 'CREATE_PRODUCT',
    resource: 'PRODUCT'
  }),
  createProduct
);

router.post(
  '/bulk-import',
  requirePermission(PERMISSIONS.PRODUCTS_EDIT),
  createProductLimiter,
  createProductsBulkValidator,
  validateRequest,
  auditMiddleware({
    action: 'BULK_CREATE_PRODUCTS',
    resource: 'PRODUCT'
  }),
  createProductsBulk
);

/**
 * ✏️ Update product (RATE LIMITED + VALIDATED + AUDITED)
 */
router.put(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTS_EDIT),
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
  requirePermission(PERMISSIONS.PRODUCTS_EDIT),
  auditMiddleware({
    action: 'SOFT_DELETE_PRODUCT',
    resource: 'PRODUCT'
  }),
  deleteProduct
);

/**
 * 🗑️ Permanently delete product (ADMIN/OWNER ONLY)
 */
router.delete(
  '/:id/permanent',
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  auditMiddleware({
    action: 'PERMANENT_DELETE_PRODUCT',
    resource: 'PRODUCT'
  }),
  permanentlyDeleteProduct
);

/**
 * ♻️ Restore product (AUDITED)
 */
router.patch(
  '/:id/restore',
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  auditMiddleware({
    action: 'RESTORE_PRODUCT',
    resource: 'PRODUCT'
  }),
  restoreProduct
);

router.get('/:id', protect, getProductById);

export default router;
