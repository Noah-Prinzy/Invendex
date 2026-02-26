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
import requireOrganization from '../middlewares/requireOrganization.js';
import validateRequest from '../middlewares/validateRequest.js';

import {
  createSupplierValidator,
  supplierIdParamValidator,
  supplierPerformanceParamValidator,
  updateSupplierValidator
} from '../validations/supplierValidators.js';

const router = express.Router();

// 🔐 Admin only
router.use(protect, requireOrganization, requireRoles('admin'));

/**
 * ➕ Create supplier
 */
router.post('/', createSupplierValidator, validateRequest, createSupplier);

/**
 * 📄 Get all suppliers
 */
router.get('/', getSuppliers);

/**
 * 📊 Supplier performance analytics
 */
router.get(
  '/:supplierId/performance',
  supplierPerformanceParamValidator,
  validateRequest,
  getSupplierPerformance
);
/**
 * 🏆 Supplier rankings
 */
router.get('/rankings', getSupplierRankings);

/**
 * 🔍 Get supplier by ID
 */
router.get('/:id', supplierIdParamValidator, validateRequest, getSupplierById);

/**
 * ✏️ Update supplier
 */
router.put('/:id', updateSupplierValidator, validateRequest, updateSupplier);

/**
 * 🗑️ Delete supplier
 */
router.delete(
  '/:id',
  supplierIdParamValidator,
  validateRequest,
  deleteSupplier
);

export default router;
