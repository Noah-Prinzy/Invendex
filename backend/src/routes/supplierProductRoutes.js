import express from 'express';
import {
  createSupplierProduct,
  getSupplierProducts,
  getSuppliersForProduct,
  updateSupplierProduct,
  deleteSupplierProduct
} from '../controllers/supplierProductController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();

// 🔐 Admin only
router.use(protect, requireRoles('admin'));

/**
 * ➕ Link supplier to product
 */
router.post('/', createSupplierProduct);

/**
 * 📄 Get all supplier-product links
 */
router.get('/', getSupplierProducts);

/**
 * 🔍 Get suppliers for a product
 */
router.get('/product/:productId', getSuppliersForProduct);

/**
 * ✏️ Update supplier-product link
 */
router.put('/:id', updateSupplierProduct);

/**
 * 🗑️ Disable supplier-product link
 */
router.delete('/:id', deleteSupplierProduct);

export default router;
