import express from 'express';
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getSupplierPerformance,
  getSupplierRankings
} from '../controllers/supplierController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();

// 🔐 Admin only
router.use(protect, requireRoles('admin'));

/**
 * ➕ Create supplier
 */
router.post('/', createSupplier);

/**
 * 📄 Get all suppliers
 */
router.get('/', getSuppliers);

/**
 * 📊 Supplier performance analytics
 */
router.get(
  '/:supplierId/performance',
  getSupplierPerformance
);
/**
 * 🏆 Supplier rankings
 */
router.get(
  '/rankings',
  getSupplierRankings
);

/**
 * 🔍 Get supplier by ID
 */
router.get('/:id', getSupplierById);

/**
 * ✏️ Update supplier
 */
router.put('/:id', updateSupplier);

/**
 * 🗑️ Delete supplier
 */
router.delete('/:id', deleteSupplier);

export default router;