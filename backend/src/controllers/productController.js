import Product from '../models/Product.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/auditLogger.js';
import mongoose from 'mongoose';
import { adjustInventoryFromManualInput } from '../services/inventory/manualAdjustmentService.js';
import {
  extractIdempotencyKeyFromRequest,
  IDEMPOTENCY_SCOPE,
  runIdempotentOperation
} from '../services/idempotency/idempotencyService.js';

/* ======================================================
   HELPERS
====================================================== */

const PRODUCT_FIELDS = ['name', 'sku', 'price', 'description', 'category'];

const pickProductFields = (source = {}) =>
  PRODUCT_FIELDS.reduce((obj, key) => {
    if (source[key] !== undefined) obj[key] = source[key];
    return obj;
  }, {});

/* ======================================================
   CONTROLLERS
====================================================== */

export const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      organization: req.organizationId,
      isActive: true
    });
    return successResponse(res, products, 'Products fetched');
  } catch (err) {
    next(err);
  }
};

export const getDeletedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      organization: req.organizationId,
      isActive: false,
      deleteStatus: { $in: [null, 'pending_admin_review'] }
    }).sort({ deletedAt: -1, updatedAt: -1 });

    return successResponse(
      res,
      products,
      'Deleted products awaiting admin review fetched'
    );
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      organization: req.organizationId
    });
    if (!product) throw new AppError('Product not found', 404);
    return successResponse(res, product, 'Product fetched');
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const data = pickProductFields(req.body);
    const product = await Product.create({
      ...data,
      organization: req.organizationId
    });

    logAudit({
      req,
      action: 'CREATE_PRODUCT',
      resource: 'PRODUCT',
      resourceId: product._id
    });

    return successResponse(res, product, 'Product created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const updates = pickProductFields(req.body);
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, organization: req.organizationId },
      updates,
      { new: true, runValidators: true }
    );

    if (!product) throw new AppError('Product not found', 404);

    return successResponse(res, product, 'Product updated');
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      organization: req.organizationId
    });
    if (!product) throw new AppError('Product not found', 404);

    if (!product.isActive) {
      return successResponse(
        res,
        product,
        'Product already removed from active list'
      );
    }

    product.isActive = false;
    product.deleteStatus = 'pending_admin_review';
    product.deletedAt = new Date();
    product.deletedBy = req.user?._id || null;
    product.deletedByRole = req.user?.role || null;
    await product.save();

    return successResponse(
      res,
      product,
      'Product removed from active list and queued for admin review'
    );
  } catch (err) {
    next(err);
  }
};

export const restoreProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      organization: req.organizationId
    });
    if (!product) throw new AppError('Product not found', 404);

    product.isActive = true;
    product.deleteStatus = 'active';
    product.deletedAt = null;
    product.deletedBy = null;
    product.deletedByRole = null;
    await product.save();

    return successResponse(res, product, 'Product restored');
  } catch (err) {
    next(err);
  }
};

export const permanentlyDeleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      organization: req.organizationId
    });
    if (!product) throw new AppError('Product not found', 404);

    if (product.isActive) {
      throw new AppError(
        'Only products in deleted-items review can be permanently deleted',
        400
      );
    }

    await product.deleteOne();
    return successResponse(res, null, 'Product permanently deleted');
  } catch (err) {
    next(err);
  }
};

export const adjustProductStock = async (req, res, next) => {
  try {
    const { amount, reason, warehouseId } = req.body;
    const idempotencyKey = extractIdempotencyKeyFromRequest(req);

    const operation = await runIdempotentOperation({
      organizationId: req.organizationId,
      scope: IDEMPOTENCY_SCOPE.MANUAL_STOCK_ADJUSTMENT,
      idempotencyKey,
      requestFingerprint: {
        productId: String(req.params.id),
        amount: Number(amount),
        reason: String(reason || ''),
        warehouseId: warehouseId ? String(warehouseId) : null
      },
      operation: async () =>
        adjustInventoryFromManualInput({
          organizationId: req.organizationId,
          productId: req.params.id,
          amount,
          reason,
          warehouseId: warehouseId || null,
          actorUserId: req.user?._id || null,
          actorRole: req.user?.role || null
        })
    });

    if (operation.keyUsed) {
      res.setHeader('X-Idempotency-Key', String(idempotencyKey));
    }
    if (operation.replayed) {
      res.setHeader('X-Idempotency-Replayed', 'true');
    }

    return successResponse(res, operation.result?.product, 'Stock adjusted');
  } catch (err) {
    next(err);
  }
};

export const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      organization: req.organizationId,
      isActive: true,
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    });

    return successResponse(res, products, 'Low stock products fetched');
  } catch (err) {
    next(err);
  }
};

export const getLowStockSummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $match: {
          organization: new mongoose.Types.ObjectId(req.organizationId)
        }
      },
      {
        $project: {
          sku: 1,
          stock: 1,
          lowStockThreshold: 1,
          isLow: { $lte: ['$stock', '$lowStockThreshold'] }
        }
      },
      { $match: { isLow: true } }
    ]);

    return successResponse(res, summary, 'Low stock summary fetched');
  } catch (err) {
    next(err);
  }
};

export const getInventoryHealthOverview = async (req, res, next) => {
  try {
    const products = await Product.find({
      organization: req.organizationId,
      isActive: true
    }).lean();

    const overview = products.map((p) => ({
      sku: p.sku,
      stock: p.stock,
      status:
        p.stock <= p.lowStockThreshold
          ? 'CRITICAL'
          : p.stock <= p.lowStockThreshold * 2
            ? 'WARNING'
            : 'HEALTHY'
    }));

    return successResponse(res, overview, 'Inventory health overview fetched');
  } catch (err) {
    next(err);
  }
};

export const getReorderRecommendations = async (req, res, next) => {
  try {
    const products = await Product.find({
      organization: req.organizationId,
      isActive: true
    }).lean();

    const recommendations = products.map((p) => ({
      sku: p.sku,
      currentStock: p.stock,
      reorderPoint:
        p.averageDailyUsage * (p.supplierLeadTimeDays + p.safetyStockDays)
    }));

    return successResponse(
      res,
      recommendations,
      'Reorder recommendations generated'
    );
  } catch (err) {
    next(err);
  }
};

export const getProductStockHistory = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      organization: req.organizationId
    }).select('sku stockHistory');

    if (!product) throw new AppError('Product not found', 404);

    return successResponse(res, product.stockHistory, 'Stock history fetched');
  } catch (err) {
    next(err);
  }
};
