import express from 'express';
import {
  createSupplierProduct,
  getSupplierProducts,
  getSuppliersForProduct,
  updateSupplierProduct,
  deleteSupplierProduct
} from '../controllers/supplierProductController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requirePermission from '../middlewares/requirePermission.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import validateRequest from '../middlewares/validateRequest.js';
import { PERMISSIONS } from '../authorization/permissions.js';

import {
  createSupplierProductValidator,
  supplierProductIdParamValidator,
  supplierProductProductParamValidator,
  updateSupplierProductValidator
} from '../validations/supplierProductValidators.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.SUPPLIER_PRODUCTS_MANAGE)
);

/**
 * ➕ Link supplier to product
 */
router.post(
  '/',
  createSupplierProductValidator,
  validateRequest,
  createSupplierProduct
);

/**
 * 📄 Get all supplier-product links
 */
router.get('/', getSupplierProducts);

/**
 * 🔍 Get suppliers for a product
 */
router.get(
  '/product/:productId',
  supplierProductProductParamValidator,
  validateRequest,
  getSuppliersForProduct
);

/**
 * ✏️ Update supplier-product link
 */
router.put(
  '/:id',
  updateSupplierProductValidator,
  validateRequest,
  updateSupplierProduct
);

/**
 * 🗑️ Disable supplier-product link
 */
router.delete(
  '/:id',
  supplierProductIdParamValidator,
  validateRequest,
  deleteSupplierProduct
);

export default router;
