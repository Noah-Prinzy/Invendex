import Product from '../models/Product.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/auditLogger.js';
import InventorySnapshot from '../models/InventorySnapshot.js';

/**
 * 📸 Record inventory snapshot
 */
const recordInventorySnapshot = async (product, source = 'SYSTEM') => {
  await InventorySnapshot.create({
    product: product._id,
    sku: product.sku,
    stock: product.stock,
    price: product.price,
    source
  });
};

/**
 * Fields allowed for metadata updates (NOT stock)
 */
const PRODUCT_FIELDS = ['name', 'sku', 'price', 'description', 'category'];

const pickProductFields = (source = {}) => {
  return PRODUCT_FIELDS.reduce((obj, key) => {
    if (source[key] !== undefined) obj[key] = source[key];
    return obj;
  }, {});
};

/**
 * GET all products (advanced filtering)
 */
export const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      minPrice,
      maxPrice,
      inStock,
      isActive,
      sort = '-createdAt'
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10), 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (req.user.role !== 'admin') {
      filter.isActive = true;
    } else if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (category) filter.category = category;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    if (inStock !== undefined) {
      filter.stock = inStock === 'true' ? { $gt: 0 } : { $eq: 0 };
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limitNum),
      Product.countDocuments(filter)
    ]);

    return successResponse(res, {
      data: products,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    }, 'Products fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET product by ID
 */
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) throw new AppError('Product not found', 404);
    if (!product.isActive && req.user.role !== 'admin') {
      throw new AppError('Product not available', 404);
    }

    return successResponse(res, product, 'Product fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * 📜 GET product stock history
 */
export const getProductStockHistory = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .select('name sku stockHistory')
      .populate({
        path: 'stockHistory.changedBy',
        select: 'name email role'
      });

    if (!product) throw new AppError('Product not found', 404);

    return successResponse(res, {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku
      },
      history: product.stockHistory
    }, 'Stock history fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * CREATE product
 */
export const createProduct = async (req, res, next) => {
  try {
    const data = pickProductFields(req.body);

    if (!data.name || !data.sku || data.price === undefined) {
      throw new AppError('Name, SKU and price are required', 400);
    }

    const product = await Product.create(data);

    logAudit({
      req,
      action: 'CREATE_PRODUCT',
      resource: 'PRODUCT',
      resourceId: product._id,
      metadata: data
    });

    return successResponse(res, product, 'Product created', 201);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.sku) {
      return next(
        new AppError(`SKU "${err.keyValue.sku}" already exists`, 409)
      );
    }
    next(err);
  }
};

/**
 * UPDATE product metadata
 */
export const updateProduct = async (req, res, next) => {
  try {
    const updates = pickProductFields(req.body);
    if (Object.keys(updates).length === 0) {
      throw new AppError('No valid fields provided', 400);
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) throw new AppError('Product not found', 404);

    logAudit({
      req,
      action: 'UPDATE_PRODUCT',
      resource: 'PRODUCT',
      resourceId: product._id,
      metadata: updates
    });

    return successResponse(res, product, 'Product updated');
  } catch (err) {
    next(err);
  }
};
/**
 * 📦 ADJUST STOCK
 */
export const adjustProductStock = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;

    if (typeof amount !== 'number' || amount === 0) {
      throw new AppError('Stock amount must be a non-zero number', 400);
    }

    if (!reason) {
      throw new AppError('Stock adjustment reason is required', 400);
    }

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    const previousStock = product.stock;

    await product.adjustStock(amount, reason, req.user._id);

    // ⚠️ LOW STOCK DETECTION (A17.5)
    const isLowStockNow =
      product.stock <= product.lowStockThreshold &&
      previousStock > product.lowStockThreshold;

    if (isLowStockNow) {
      logAudit({
        req,
        action: 'LOW_STOCK_ALERT_TRIGGERED',
        resource: 'PRODUCT',
        resourceId: product._id,
        metadata: {
          stock: product.stock,
          threshold: product.lowStockThreshold
        }
      });
    }

    logAudit({
      req,
      action: 'ADJUST_STOCK',
      resource: 'PRODUCT',
      resourceId: product._id,
      metadata: { amount, reason }
    });

    return successResponse(res, product, 'Stock adjusted');
  } catch (err) {
    next(err);
  }
};
/**
 * ⚠️ GET low-stock products
 */
export const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    }).sort({ stock: 1 });

    logAudit({
      req,
      action: 'VIEW_LOW_STOCK',
      resource: 'PRODUCT'
    });

    return successResponse(res, products, 'Low stock products fetched');
  } catch (err) {
    next(err);
  }
};
/**
 * 📊 GET low-stock summary (dashboard)
 */
export const getLowStockSummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $match: {
          isActive: true,
          $expr: { $lte: ['$stock', '$lowStockThreshold'] }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          products: {
            $push: {
              id: '$_id',
              name: '$name',
              sku: '$sku',
              stock: '$stock',
              threshold: '$lowStockThreshold'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          category: { $ifNull: ['$_id', 'Uncategorized'] },
          count: 1,
          products: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    logAudit({
      req,
      action: 'VIEW_LOW_STOCK_SUMMARY',
      resource: 'PRODUCT'
    });

    return successResponse(
      res,
      {
        totalCategories: summary.length,
        totalLowStockProducts: summary.reduce(
          (sum, c) => sum + c.count,
          0
        ),
        categories: summary
      },
      'Low stock summary fetched'
    );
  } catch (err) {
    next(err);
  }
};
/**
 * 🧠 Inventory health overview
 */
export const getInventoryHealthOverview = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true })
      .select('name sku stock lowStockThreshold stockHistory')
      .lean();

    const overview = products.map(product => {
      let status = 'HEALTHY';
      let score = 100;

      if (product.stock <= product.lowStockThreshold) {
        status = 'CRITICAL';
        score = 20;
      } else if (product.stock <= product.lowStockThreshold * 2) {
        status = 'WARNING';
        score = 60;
      }

      // 📉 Trend detection (last 5 entries)
      const history = product.stockHistory?.slice(-5) || [];
      let trend = 'stable';

      if (history.length >= 2) {
        const deltas = history.map(h => h.changeAmount);
        const total = deltas.reduce((a, b) => a + b, 0);
        trend = total > 0 ? 'increasing' : total < 0 ? 'decreasing' : 'stable';
      }

      return {
        id: product._id,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        threshold: product.lowStockThreshold,
        status,
        score,
        trend
      };
    });

    return successResponse(
      res,
      {
        totalProducts: overview.length,
        healthy: overview.filter(p => p.status === 'HEALTHY').length,
        warning: overview.filter(p => p.status === 'WARNING').length,
        critical: overview.filter(p => p.status === 'CRITICAL').length,
        products: overview
      },
      'Inventory health overview fetched'
    );
  } catch (err) {
    next(err);
  }
};
/**
 * 📦 Smart reorder recommendations
 */
export const getReorderRecommendations = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true })
      .select('name sku stock lowStockThreshold stockHistory')
      .lean();

    const LEAD_TIME_DAYS = 7;

    const recommendations = products.map(product => {
      const history = product.stockHistory || [];

      // 📉 Calculate daily usage (last 14 days)
      const recent = history.filter(h => {
        return (
          h.changeAmount < 0 &&
          Date.now() - new Date(h.changedAt).getTime() <=
            14 * 24 * 60 * 60 * 1000
        );
      });

      const totalUsed = recent.reduce(
        (sum, h) => sum + Math.abs(h.changeAmount),
        0
      );

      const dailyUsage =
        recent.length > 0 ? totalUsed / 14 : product.lowStockThreshold / 7;

      const safetyBuffer = product.lowStockThreshold;
      const projectedNeed = dailyUsage * LEAD_TIME_DAYS + safetyBuffer;

      const recommendedQty = Math.max(
        Math.ceil(projectedNeed - product.stock),
        0
      );

      let urgency = 'LOW';

      if (product.stock <= product.lowStockThreshold) {
        urgency = 'IMMEDIATE';
      } else if (product.stock <= product.lowStockThreshold * 2) {
        urgency = 'SOON';
      }

      return {
        id: product._id,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        threshold: product.lowStockThreshold,
        dailyUsage: Number(dailyUsage.toFixed(2)),
        recommendedQty,
        urgency,
        reasoning:
          recommendedQty > 0
            ? `Based on ${dailyUsage.toFixed(
                2
              )}/day usage and ${LEAD_TIME_DAYS}-day lead time`
            : 'Stock sufficient'
      };
    });

    return successResponse(
      res,
      {
        total: recommendations.length,
        immediate: recommendations.filter(r => r.urgency === 'IMMEDIATE')
          .length,
        soon: recommendations.filter(r => r.urgency === 'SOON').length,
        recommendations
      },
      'Reorder recommendations generated'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * SOFT DELETE
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    product.isActive = false;
    await product.save();

    logAudit({
      req,
      action: 'DEACTIVATE_PRODUCT',
      resource: 'PRODUCT',
      resourceId: product._id
    });

    return successResponse(res, null, 'Product deactivated');
  } catch (err) {
    next(err);
  }
};
/**
 * RESTORE product
 */
export const restoreProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    product.isActive = true;
    await product.save();

    logAudit({
      req,
      action: 'RESTORE_PRODUCT',
      resource: 'PRODUCT',
      resourceId: product._id
    });

    return successResponse(res, product, 'Product restored');
  } catch (err) {
    next(err);
  }
};
/**
 * ⚙️ UPDATE low stock threshold (admin only)
 */
export const updateLowStockThreshold = async (req, res, next) => {
  try {
    const { threshold } = req.body;

    if (typeof threshold !== 'number' || threshold < 0) {
      throw new AppError('Low stock threshold must be a positive number', 400);
    }

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    product.lowStockThreshold = threshold;
    await product.save();

    logAudit({
      req,
      action: 'UPDATE_LOW_STOCK_THRESHOLD',
      resource: 'PRODUCT',
      resourceId: product._id,
      metadata: { threshold }
    });

    return successResponse(
      res,
      product,
      'Low stock threshold updated'
    );
  } catch (err) {
    next(err);
  }
};