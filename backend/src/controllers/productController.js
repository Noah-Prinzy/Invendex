import Product from '../models/Product.js';
import ReorderAlert from '../models/ReorderAlert.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/auditLogger.js';
import mongoose from 'mongoose';
import bwipjs from 'bwip-js';
import { adjustInventoryFromManualInput } from '../services/inventory/manualAdjustmentService.js';
import {
  generateUniqueSku,
  normalizeManualSku
} from '../services/product/skuService.js';
import {
  executeProductBulkImport,
  normalizeBulkImportOptions
} from '../services/product/bulkImportService.js';
import {
  extractIdempotencyKeyFromRequest,
  IDEMPOTENCY_SCOPE,
  runIdempotentOperation
} from '../services/idempotency/idempotencyService.js';

/* ======================================================
   HELPERS
====================================================== */

const PRODUCT_FIELDS = [
  'name',
  'sku',
  'isVariant',
  'parentProduct',
  'variantAttributes',
  'uom',
  'price',
  'description',
  'category',
  'lowStockThreshold',
  'barcode',
  'barcodeType'
];

const pickProductFields = (source = {}) =>
  PRODUCT_FIELDS.reduce((obj, key) => {
    if (source[key] !== undefined) obj[key] = source[key];
    return obj;
  }, {});

const escapeRegExp = (value) =>
  String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeBarcode = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const normalizeBarcodeType = (value) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return normalized || null;
};

const clampInteger = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  if (normalized < min) return min;
  if (normalized > max) return max;
  return normalized;
};

const sanitizeFileToken = (value, fallback = 'label') => {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
};

const resolveBarcodeBcid = ({ requestedType, barcodeType }) => {
  const normalizedRequestedType = String(requestedType || '')
    .trim()
    .toLowerCase();
  if (normalizedRequestedType === 'qr' || normalizedRequestedType === 'qrcode')
    return 'qrcode';
  if (
    normalizedRequestedType === 'code128' ||
    normalizedRequestedType === 'barcode'
  )
    return 'code128';
  if (normalizedRequestedType === 'ean13') return 'ean13';
  if (normalizedRequestedType === 'upc') return 'upca';

  const normalizedBarcodeType = String(barcodeType || '')
    .trim()
    .toUpperCase();
  if (normalizedBarcodeType === 'QR') return 'qrcode';
  if (normalizedBarcodeType === 'EAN13') return 'ean13';
  if (normalizedBarcodeType === 'UPC') return 'upca';
  return 'code128';
};

const normalizeVariantAttributes = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [key, rawValue]) => {
    const normalizedKey = String(key || '').trim();
    const normalizedValue = String(rawValue ?? '').trim();
    if (!normalizedKey || !normalizedValue) {
      return acc;
    }
    acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});
};

const normalizeUomConfig = (value) => {
  const source =
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const base = String(source.base || '')
    .trim()
    .toLowerCase();
  const purchase = String(source.purchase || '')
    .trim()
    .toLowerCase();
  const factor = Number(source.purchaseToBaseFactor || 1);

  return {
    base: base || 'pcs',
    purchase: purchase || base || 'pcs',
    purchaseToBaseFactor:
      Number.isInteger(factor) && factor >= 1 ? Number(factor) : 1
  };
};

const getLastStockMovementDate = (product) => {
  const history = Array.isArray(product?.stockHistory)
    ? product.stockHistory
    : [];
  if (history.length) {
    const latestFromHistory = history.reduce((latest, entry) => {
      const asDate = new Date(entry?.changedAt || 0);
      if (Number.isNaN(asDate.getTime())) return latest;
      return !latest || asDate > latest ? asDate : latest;
    }, null);
    if (latestFromHistory) return latestFromHistory;
  }

  const fallbackDate = new Date(product?.updatedAt || product?.createdAt || 0);
  if (!Number.isNaN(fallbackDate.getTime())) return fallbackDate;
  return null;
};

const assertParentProductIfProvided = async ({
  organizationId,
  parentProductId,
  excludeProductId = null
}) => {
  if (!parentProductId) return;

  const parent = await Product.findOne({
    _id: parentProductId,
    organization: organizationId,
    isActive: true
  })
    .select('_id')
    .lean();

  if (!parent) {
    throw new AppError('parentProduct not found in organization', 400);
  }

  if (
    excludeProductId &&
    String(parent._id || '') === String(excludeProductId || '')
  ) {
    throw new AppError('A product cannot be its own parent variant', 400);
  }
};

const getOrganizationUserAccessSettings = async (organizationId) => {
  const settings = await OrganizationSettings.findOne({
    organization: organizationId
  })
    .select(
      'userAccess.allowStaffProductCreation userAccess.allowStaffSoftDeleteOnly'
    )
    .lean();

  return {
    allowStaffProductCreation:
      settings?.userAccess?.allowStaffProductCreation !== false,
    allowStaffSoftDeleteOnly:
      settings?.userAccess?.allowStaffSoftDeleteOnly !== false
  };
};

/* ======================================================
   CONTROLLERS
====================================================== */

export const getProducts = async (req, res, next) => {
  try {
    const q = String(req.query?.q || '').trim();
    const skuQuery = String(req.query?.sku || '').trim();
    const sku = normalizeManualSku(skuQuery) || skuQuery;
    const barcode = String(req.query?.barcode || '').trim();
    const category = String(req.query?.category || '').trim();

    const filter = {
      organization: req.organizationId,
      isActive: true
    };

    if (category) {
      filter.category = {
        $regex: new RegExp(`^${escapeRegExp(category)}$`, 'i')
      };
    }

    if (sku) {
      filter.sku = { $regex: new RegExp(escapeRegExp(sku), 'i') };
    }

    if (barcode) {
      filter.barcode = { $regex: new RegExp(escapeRegExp(barcode), 'i') };
    }

    if (q) {
      const qRegex = new RegExp(escapeRegExp(q), 'i');
      filter.$or = [
        { name: qRegex },
        { sku: qRegex },
        { category: qRegex },
        { barcode: qRegex }
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
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

export const downloadProductLabel = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isActive: true
    }).lean();

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const encodedText = String(product.barcode || product.sku || '').trim();
    if (!encodedText) {
      throw new AppError(
        'Product does not have a barcode or SKU for label generation',
        400
      );
    }

    const bcid = resolveBarcodeBcid({
      requestedType: req.query?.type,
      barcodeType: product.barcodeType
    });
    const scale = clampInteger(req.query?.scale, 1, 6, 3);
    const includeText = String(req.query?.includeText || 'true')
      .trim()
      .toLowerCase();
    const showHumanText = includeText !== 'false' && bcid !== 'qrcode';

    const pngBuffer = await bwipjs.toBuffer({
      bcid,
      text: encodedText,
      scale,
      height: bcid === 'qrcode' ? undefined : 16,
      includetext: showHumanText,
      textxalign: 'center',
      paddingwidth: 10,
      paddingheight: 10
    });

    const fileName = `product-label-${sanitizeFileToken(product.sku || product.name || product._id)}.png`;
    res.setHeader('content-type', 'image/png');
    res.setHeader('content-disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(pngBuffer);
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const normalizedRole = String(req.user?.role || '')
      .trim()
      .toLowerCase();
    if (normalizedRole === 'staff') {
      const userAccessSettings = await getOrganizationUserAccessSettings(
        req.organizationId
      );
      if (!userAccessSettings.allowStaffProductCreation) {
        throw new AppError(
          'Staff product creation is disabled by organization policy',
          403
        );
      }
    }

    const data = pickProductFields(req.body);
    data.barcode = normalizeBarcode(data.barcode);
    data.barcodeType = normalizeBarcodeType(data.barcodeType);
    data.variantAttributes = normalizeVariantAttributes(data.variantAttributes);
    data.uom = normalizeUomConfig(data.uom);
    data.isVariant = data.isVariant === true;

    if (!data.barcode) {
      data.barcodeType = null;
    }

    if (!data.parentProduct) {
      data.parentProduct = null;
    } else {
      await assertParentProductIfProvided({
        organizationId: req.organizationId,
        parentProductId: data.parentProduct
      });
    }

    if (data.isVariant && !data.parentProduct) {
      throw new AppError('parentProduct is required when isVariant=true', 400);
    }

    const manualSku = normalizeManualSku(data.sku);
    if (manualSku) {
      data.sku = manualSku;
    } else {
      data.sku = await generateUniqueSku({
        organizationId: req.organizationId,
        category: data.category,
        name: data.name,
        prefixOverride: req.body?.skuPrefix
      });
    }

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
    if (err?.code === 11000) {
      if (err?.keyPattern?.sku) {
        return next(
          new AppError('SKU already exists for this organization', 409)
        );
      }
      if (err?.keyPattern?.barcode) {
        return next(
          new AppError('Barcode already exists for this organization', 409)
        );
      }
    }
    next(err);
  }
};

export const createProductsBulk = async (req, res, next) => {
  try {
    const normalizedRole = String(req.user?.role || '')
      .trim()
      .toLowerCase();
    if (normalizedRole === 'staff') {
      const userAccessSettings = await getOrganizationUserAccessSettings(
        req.organizationId
      );
      if (!userAccessSettings.allowStaffProductCreation) {
        throw new AppError(
          'Staff product creation is disabled by organization policy',
          403
        );
      }
    }

    const rows = Array.isArray(req.body?.products) ? req.body.products : [];
    const fieldMap =
      req.body?.fieldMap && typeof req.body.fieldMap === 'object'
        ? req.body.fieldMap
        : {};
    const options = normalizeBulkImportOptions(req.body?.options || {});
    const result = await executeProductBulkImport({
      organizationId: req.organizationId,
      rows,
      fieldMap,
      options
    });

    if (!result.dryRun) {
      logAudit({
        req,
        action: 'BULK_CREATE_PRODUCTS',
        resource: 'PRODUCT',
        resourceId: null,
        details: {
          createdCount: result.createdCount,
          updatedCount: result.updatedCount,
          failedCount: result.failedCount,
          atomic: result.atomic === true,
          duplicatePolicy: String(
            result.duplicatePolicy || options.duplicatePolicy
          )
        }
      });
    }

    const responseMessage =
      result.validationBlocked === true
        ? 'Atomic import validation failed. No rows were written.'
        : result.dryRun
          ? 'Bulk import validation completed (no database writes)'
          : result.atomic
            ? 'Bulk product import completed (atomic mode)'
            : 'Bulk product import completed';

    return successResponse(
      res,
      result,
      responseMessage,
      result.dryRun ? 200 : 201
    );
  } catch (err) {
    if (err?.code === 11000) {
      if (err?.keyPattern?.sku) {
        return next(
          new AppError('SKU already exists for this organization', 409)
        );
      }
      if (err?.keyPattern?.barcode) {
        return next(
          new AppError('Barcode already exists for this organization', 409)
        );
      }
    }
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const updates = pickProductFields(req.body);
    const existingProduct = await Product.findOne({
      _id: req.params.id,
      organization: req.organizationId
    }).select('_id parentProduct isVariant');

    if (!existingProduct) throw new AppError('Product not found', 404);

    if (updates.sku !== undefined) {
      const normalizedSku = normalizeManualSku(updates.sku);
      if (!normalizedSku) {
        throw new AppError('SKU cannot be empty when provided', 400);
      }
      updates.sku = normalizedSku;
    }
    if (updates.barcode !== undefined) {
      updates.barcode = normalizeBarcode(updates.barcode);
    }
    if (updates.barcodeType !== undefined) {
      updates.barcodeType = normalizeBarcodeType(updates.barcodeType);
    }
    if (updates.barcode === null) {
      updates.barcodeType = null;
    }

    if (updates.variantAttributes !== undefined) {
      updates.variantAttributes = normalizeVariantAttributes(
        updates.variantAttributes
      );
    }

    if (updates.uom !== undefined) {
      updates.uom = normalizeUomConfig(updates.uom);
    }

    if (updates.parentProduct !== undefined) {
      const normalizedParent = String(updates.parentProduct || '').trim();
      updates.parentProduct = normalizedParent || null;
      if (updates.parentProduct) {
        await assertParentProductIfProvided({
          organizationId: req.organizationId,
          parentProductId: updates.parentProduct,
          excludeProductId: req.params.id
        });
      }
    }

    if (updates.isVariant !== undefined) {
      updates.isVariant = updates.isVariant === true;
      if (!updates.isVariant) {
        updates.parentProduct = null;
      }
    }

    const finalIsVariant =
      updates.isVariant !== undefined
        ? updates.isVariant
        : existingProduct.isVariant === true;
    const finalParentProduct =
      updates.parentProduct !== undefined
        ? updates.parentProduct
        : existingProduct.parentProduct;

    if (finalIsVariant && !finalParentProduct) {
      throw new AppError('parentProduct is required when isVariant=true', 400);
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, organization: req.organizationId },
      updates,
      { new: true, runValidators: true }
    );

    return successResponse(res, product, 'Product updated');
  } catch (err) {
    if (err?.code === 11000) {
      if (err?.keyPattern?.sku) {
        return next(
          new AppError('SKU already exists for this organization', 409)
        );
      }
      if (err?.keyPattern?.barcode) {
        return next(
          new AppError('Barcode already exists for this organization', 409)
        );
      }
    }
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const normalizedRole = String(req.user?.role || '')
      .trim()
      .toLowerCase();
    if (normalizedRole === 'staff') {
      const userAccessSettings = await getOrganizationUserAccessSettings(
        req.organizationId
      );
      if (!userAccessSettings.allowStaffSoftDeleteOnly) {
        throw new AppError(
          'Staff product removal is disabled by organization policy',
          403
        );
      }
    }

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
    const { amount, reason, warehouseId, amountUnit } = req.body;
    const idempotencyKey = extractIdempotencyKeyFromRequest(req);

    const operation = await runIdempotentOperation({
      organizationId: req.organizationId,
      scope: IDEMPOTENCY_SCOPE.MANUAL_STOCK_ADJUSTMENT,
      idempotencyKey,
      requestFingerprint: {
        productId: String(req.params.id),
        amount: Number(amount),
        amountUnit: String(amountUnit || 'base')
          .trim()
          .toLowerCase(),
        reason: String(reason || ''),
        warehouseId: warehouseId ? String(warehouseId) : null
      },
      operation: async () =>
        adjustInventoryFromManualInput({
          organizationId: req.organizationId,
          productId: req.params.id,
          amount,
          amountUnit: amountUnit || 'base',
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

export const getInventoryHealthScore = async (req, res, next) => {
  try {
    const [products, settings, activeAlertsCount] = await Promise.all([
      Product.find({
        organization: req.organizationId,
        isActive: true
      })
        .select(
          'sku stock lowStockThreshold stockHistory createdAt updatedAt averageDailyUsage'
        )
        .lean(),
      OrganizationSettings.findOne({
        organization: req.organizationId
      })
        .select('inventory.deadStockThresholdDays')
        .lean(),
      ReorderAlert.countDocuments({
        organization: req.organizationId,
        resolved: false,
        status: 'ACTIVE'
      })
    ]);

    const deadStockDays = Math.max(
      1,
      Number(settings?.inventory?.deadStockThresholdDays || 90)
    );

    if (!products.length) {
      return successResponse(
        res,
        {
          score: 100,
          band: 'EXCELLENT',
          deadStockThresholdDays: deadStockDays,
          totals: {
            products: 0,
            lowStock: 0,
            stockouts: 0,
            staleStock: 0,
            activeAlerts: Number(activeAlertsCount || 0)
          },
          ratios: {
            lowStockRatio: 0,
            stockoutRatio: 0,
            staleStockRatio: 0,
            alertPressure: 0
          }
        },
        'Inventory health score generated'
      );
    }

    const nowMs = Date.now();
    let lowStockCount = 0;
    let stockoutCount = 0;
    let staleStockCount = 0;

    for (const product of products) {
      const stock = Number(product?.stock || 0);
      const threshold = Number(product?.lowStockThreshold || 0);

      if (stock <= threshold) {
        lowStockCount += 1;
      }
      if (stock <= 0) {
        stockoutCount += 1;
      }

      if (stock > 0) {
        const lastMovement = getLastStockMovementDate(product);
        if (lastMovement) {
          const ageDays =
            (nowMs - lastMovement.getTime()) / (1000 * 60 * 60 * 24);
          if (ageDays >= deadStockDays) {
            staleStockCount += 1;
          }
        }
      }
    }

    const totalProducts = products.length;
    const lowStockRatio = lowStockCount / totalProducts;
    const stockoutRatio = stockoutCount / totalProducts;
    const staleStockRatio = staleStockCount / totalProducts;
    const alertPressure = Math.min(
      1,
      Number(activeAlertsCount || 0) / Math.max(totalProducts, 1)
    );

    const penaltyScore =
      lowStockRatio * 35 +
      stockoutRatio * 35 +
      staleStockRatio * 20 +
      alertPressure * 10;

    const score = Math.max(
      0,
      Math.min(100, Number((100 - penaltyScore).toFixed(2)))
    );

    const band =
      score >= 85
        ? 'EXCELLENT'
        : score >= 70
          ? 'GOOD'
          : score >= 50
            ? 'WARNING'
            : 'CRITICAL';

    return successResponse(
      res,
      {
        score,
        band,
        deadStockThresholdDays: deadStockDays,
        totals: {
          products: totalProducts,
          lowStock: lowStockCount,
          stockouts: stockoutCount,
          staleStock: staleStockCount,
          activeAlerts: Number(activeAlertsCount || 0)
        },
        ratios: {
          lowStockRatio: Number((lowStockRatio * 100).toFixed(2)),
          stockoutRatio: Number((stockoutRatio * 100).toFixed(2)),
          staleStockRatio: Number((staleStockRatio * 100).toFixed(2)),
          alertPressure: Number((alertPressure * 100).toFixed(2))
        }
      },
      'Inventory health score generated'
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
