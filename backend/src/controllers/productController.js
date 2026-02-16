import Product from '../models/Product.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/auditLogger.js';
import mongoose from 'mongoose';
import { publishInventoryUpdated } from '../realtime/publisher.js';

/* ======================================================
   HELPERS
====================================================== */

const PRODUCT_FIELDS = ['name', 'sku', 'price', 'description', 'category'];

const pickProductFields = (source = {}) =>
  PRODUCT_FIELDS.reduce((obj, key) => {
    if (source[key] !== undefined) obj[key] = source[key];
    return obj;
  }, {});

/**
 * 📊 Recalculate average daily usage from stock history
 */
const calculateAverageDailyUsage = (stockHistory = []) => {
  const sales = stockHistory.filter(
    h => h.reason === 'sale' && h.change < 0
  );

  if (sales.length < 2) return 0;

  const totalUnitsSold = sales.reduce(
    (sum, s) => sum + Math.abs(s.change),
    0
  );

  const firstDate = new Date(sales[0].createdAt);
  const lastDate = new Date(sales[sales.length - 1].createdAt);

  const days =
    Math.max(
      1,
      Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24))
    );

  return Number((totalUnitsSold / days).toFixed(2));
};

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

    product.isActive = false;
    await product.save();

    return successResponse(res, null, 'Product deactivated');
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
    await product.save();

    return successResponse(res, product, 'Product restored');
  } catch (err) {
    next(err);
  }
};

export const adjustProductStock = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      organization: req.organizationId
    });
    if (!product) throw new AppError('Product not found', 404);

    await product.adjustStock(amount, reason, req.user?._id);

    // 🔁 Recalculate usage after sales
    if (reason === 'sale') {
      product.averageDailyUsage = calculateAverageDailyUsage(
        product.stockHistory
      );
      await product.save();
    }

    await InventorySnapshot.create({
      organization: req.organizationId,
      product: product._id,
      sku: product.sku,
      stock: product.stock,
      price: product.price,
      source: 'MANUAL'
    });

    publishInventoryUpdated({
      organizationId: req.organizationId,
      actorUserId: req.user?._id || null,
      entityId: product._id,
      data: {
        source: 'manual_stock_adjustment',
        amount,
        reason,
        productStock: product.stock
      }
    });

    return successResponse(res, product, 'Stock adjusted');
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

    const overview = products.map(p => ({
      sku: p.sku,
      stock: p.stock,
      status:
        p.stock <= p.lowStockThreshold
          ? 'CRITICAL'
          : p.stock <= p.lowStockThreshold * 2
          ? 'WARNING'
          : 'HEALTHY'
    }));

    return successResponse(
      res,
      overview,
      'Inventory health overview fetched'
    );
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

    const recommendations = products.map(p => ({
      sku: p.sku,
      currentStock: p.stock,
      reorderPoint:
        p.averageDailyUsage *
        (p.supplierLeadTimeDays + p.safetyStockDays)
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

    return successResponse(
      res,
      product.stockHistory,
      'Stock history fetched'
    );
  } catch (err) {
    next(err);
  }
};
