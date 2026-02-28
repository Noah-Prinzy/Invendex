import Product from '../models/Product.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/auditLogger.js';
import mongoose from 'mongoose';
import { adjustInventoryFromManualInput } from '../services/inventory/manualAdjustmentService.js';
import {
  generateUniqueSku,
  normalizeManualSku,
  previewUniqueSku
} from '../services/product/skuService.js';
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
  'price',
  'description',
  'category',
  'lowStockThreshold',
  'barcode',
  'barcodeType'
];
const BULK_IMPORT_DUPLICATE_POLICIES = new Set(['skip', 'update', 'fail']);

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

const mapBulkImportRow = ({ row, fieldMap }) => {
  const resolvedFieldMap =
    fieldMap && typeof fieldMap === 'object' ? fieldMap : {};
  const getField = (canonicalName) => {
    const mappedFieldName = String(
      resolvedFieldMap[canonicalName] || canonicalName
    ).trim();
    return row?.[mappedFieldName];
  };

  return {
    name: getField('name'),
    sku: getField('sku'),
    skuPrefix: getField('skuPrefix'),
    price: getField('price'),
    category: getField('category'),
    description: getField('description'),
    lowStockThreshold: getField('lowStockThreshold'),
    barcode: getField('barcode'),
    barcodeType: getField('barcodeType')
  };
};

const normalizeBulkImportOptions = (options = {}) => {
  const validateOnly = options?.validateOnly === true;
  const atomic = options?.atomic === true;
  const duplicatePolicy = String(options?.duplicatePolicy || 'skip')
    .trim()
    .toLowerCase();

  return {
    validateOnly,
    atomic,
    duplicatePolicy: BULK_IMPORT_DUPLICATE_POLICIES.has(duplicatePolicy)
      ? duplicatePolicy
      : 'skip'
  };
};

const isTransactionUnsupportedError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('transaction numbers are only allowed') ||
    message.includes('replica set') ||
    message.includes('standalone')
  );
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

    if (!data.barcode) {
      data.barcodeType = null;
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

    const processRows = async ({ mode = 'write', session = null }) => {
      const rowErrors = [];
      const createdProducts = [];
      const updatedProducts = [];
      const previewRows = [];
      let skippedCount = 0;
      const previewSkuCursor = new Map();
      const seenManualSkus = new Map();
      const seenBarcodes = new Map();

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const rowNumber = index + 1;
        try {
          const mappedRow = mapBulkImportRow({ row, fieldMap });

          const name = String(mappedRow.name || '').trim();
          if (!name) {
            const err = new Error('Product name is required');
            err.field = 'name';
            err.originalValue = mappedRow.name;
            err.suggestedFix = 'Provide a non-empty product name.';
            throw err;
          }

          const price = Number(mappedRow.price);
          if (!Number.isFinite(price) || price < 0) {
            const err = new Error('Price must be a non-negative number');
            err.field = 'price';
            err.originalValue = mappedRow.price;
            err.suggestedFix =
              'Provide a valid number greater than or equal to 0.';
            throw err;
          }

          let lowStockThreshold = 5;
          if (
            mappedRow.lowStockThreshold !== undefined &&
            mappedRow.lowStockThreshold !== null &&
            String(mappedRow.lowStockThreshold).trim() !== ''
          ) {
            lowStockThreshold = Number(mappedRow.lowStockThreshold);
            if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
              const err = new Error(
                'Low stock threshold must be a non-negative integer'
              );
              err.field = 'lowStockThreshold';
              err.originalValue = mappedRow.lowStockThreshold;
              err.suggestedFix = 'Use a whole number like 0, 5, or 10.';
              throw err;
            }
          }

          const payload = {
            name,
            price,
            category: String(mappedRow.category || '').trim(),
            description: String(mappedRow.description || '').trim(),
            lowStockThreshold,
            barcode: normalizeBarcode(mappedRow.barcode),
            barcodeType: normalizeBarcodeType(mappedRow.barcodeType)
          };

          if (!payload.barcode) {
            payload.barcodeType = null;
          }

          const manualSku = normalizeManualSku(mappedRow.sku);
          if (manualSku) {
            const firstSeenRow = seenManualSkus.get(manualSku);
            if (firstSeenRow && options.duplicatePolicy !== 'update') {
              const err = new Error(
                `Duplicate SKU in uploaded file (first seen on row ${firstSeenRow})`
              );
              err.field = 'sku';
              err.originalValue = mappedRow.sku;
              err.suggestedFix =
                'Remove duplicate rows or switch duplicate policy to "update".';
              throw err;
            }
            if (!firstSeenRow) {
              seenManualSkus.set(manualSku, rowNumber);
            }
            payload.sku = manualSku;
          } else if (mode === 'validate') {
            payload.sku = await previewUniqueSku({
              organizationId: req.organizationId,
              category: payload.category,
              name: payload.name,
              prefixOverride: mappedRow.skuPrefix,
              session,
              cursorByPrefix: previewSkuCursor
            });
          } else {
            payload.sku = await generateUniqueSku({
              organizationId: req.organizationId,
              category: payload.category,
              name: payload.name,
              prefixOverride: mappedRow.skuPrefix,
              session
            });
          }

          if (payload.barcode) {
            const firstSeenRow = seenBarcodes.get(payload.barcode);
            if (firstSeenRow && options.duplicatePolicy !== 'update') {
              const err = new Error(
                `Duplicate barcode in uploaded file (first seen on row ${firstSeenRow})`
              );
              err.field = 'barcode';
              err.originalValue = mappedRow.barcode;
              err.suggestedFix =
                'Remove duplicate rows or switch duplicate policy to "update".';
              throw err;
            }
            if (!firstSeenRow) {
              seenBarcodes.set(payload.barcode, rowNumber);
            }
          }

          let existingBySku = null;
          if (manualSku) {
            let existingQuery = Product.findOne({
              organization: req.organizationId,
              sku: manualSku
            });
            if (session) existingQuery = existingQuery.session(session);
            existingBySku = await existingQuery;
          }

          if (existingBySku) {
            if (options.duplicatePolicy === 'fail') {
              const err = new Error('SKU already exists in organization');
              err.field = 'sku';
              err.originalValue = mappedRow.sku;
              err.suggestedFix =
                'Use a unique SKU or switch duplicate policy to "skip" or "update".';
              throw err;
            }

            if (options.duplicatePolicy === 'skip') {
              skippedCount += 1;
              previewRows.push({
                row: rowNumber,
                sku: payload.sku,
                action: 'SKIP_DUPLICATE'
              });
              continue;
            }

            if (mode === 'write') {
              existingBySku.set({
                ...payload
              });
              await existingBySku.save(session ? { session } : undefined);
              updatedProducts.push(existingBySku);
            }
            previewRows.push({
              row: rowNumber,
              sku: payload.sku,
              action: 'UPDATE_EXISTING'
            });
            continue;
          }

          if (mode === 'write') {
            let created;
            if (session) {
              [created] = await Product.create(
                [
                  {
                    ...payload,
                    organization: req.organizationId
                  }
                ],
                { session }
              );
            } else {
              created = await Product.create({
                ...payload,
                organization: req.organizationId
              });
            }
            createdProducts.push(created);
          }

          previewRows.push({
            row: rowNumber,
            sku: payload.sku,
            action: 'CREATE_NEW'
          });
        } catch (rowError) {
          if (rowError?.code === 11000 && rowError?.keyPattern?.sku) {
            rowErrors.push({
              row: rowNumber,
              field: 'sku',
              error: 'SKU already exists in organization',
              originalValue: row?.sku ?? null,
              suggestedFix:
                'Provide a unique SKU or switch duplicate policy to "skip" or "update".'
            });
            continue;
          }

          if (rowError?.code === 11000 && rowError?.keyPattern?.barcode) {
            rowErrors.push({
              row: rowNumber,
              field: 'barcode',
              error: 'Barcode already exists in organization',
              originalValue: row?.barcode ?? null,
              suggestedFix:
                'Provide a unique barcode or remove duplicate barcode.'
            });
            continue;
          }

          rowErrors.push({
            row: rowNumber,
            field: String(rowError?.field || 'row'),
            error: String(rowError?.message || 'Unknown import row error'),
            originalValue: rowError?.originalValue ?? null,
            suggestedFix: String(
              rowError?.suggestedFix || 'Fix the row and retry import.'
            )
          });
        }
      }

      const totalRows = rows.length;
      const failedCount = rowErrors.length;
      const createdCount = createdProducts.length;
      const updatedCount = updatedProducts.length;
      const validRows = totalRows - failedCount;

      return {
        mode,
        totalRows,
        validRows: Math.max(validRows, 0),
        invalidRows: failedCount,
        createdCount,
        updatedCount,
        skippedCount,
        failedCount,
        previewRows: previewRows.slice(0, 50),
        products: createdProducts,
        updatedProducts,
        rowErrors
      };
    };

    if (options.atomic && !options.validateOnly) {
      const dryRunValidation = await processRows({
        mode: 'validate',
        session: null
      });
      if (dryRunValidation.rowErrors.length > 0) {
        return successResponse(
          res,
          {
            ...dryRunValidation,
            dryRun: true,
            atomic: true,
            duplicatePolicy: options.duplicatePolicy
          },
          'Atomic import validation failed. No rows were written.',
          200
        );
      }

      const session = await mongoose.startSession();
      try {
        let result = null;
        await session.withTransaction(async () => {
          result = await processRows({
            mode: 'write',
            session
          });
        });

        logAudit({
          req,
          action: 'BULK_CREATE_PRODUCTS',
          resource: 'PRODUCT',
          resourceId: null,
          details: {
            createdCount: result.createdCount,
            updatedCount: result.updatedCount,
            failedCount: result.failedCount,
            atomic: true,
            duplicatePolicy: options.duplicatePolicy
          }
        });

        return successResponse(
          res,
          {
            ...result,
            dryRun: false,
            atomic: true,
            duplicatePolicy: options.duplicatePolicy
          },
          'Bulk product import completed (atomic mode)',
          201
        );
      } catch (error) {
        if (isTransactionUnsupportedError(error)) {
          throw new AppError(
            'Atomic import requires MongoDB replica set transaction support',
            400
          );
        }
        throw error;
      } finally {
        await session.endSession();
      }
    }

    const result = await processRows({
      mode: options.validateOnly ? 'validate' : 'write',
      session: null
    });

    if (!options.validateOnly) {
      logAudit({
        req,
        action: 'BULK_CREATE_PRODUCTS',
        resource: 'PRODUCT',
        resourceId: null,
        details: {
          createdCount: result.createdCount,
          updatedCount: result.updatedCount,
          failedCount: result.failedCount,
          atomic: false,
          duplicatePolicy: options.duplicatePolicy
        }
      });
    }

    return successResponse(
      res,
      {
        ...result,
        dryRun: options.validateOnly,
        atomic: options.atomic && !options.validateOnly,
        duplicatePolicy: options.duplicatePolicy
      },
      options.validateOnly
        ? 'Bulk import validation completed (no database writes)'
        : 'Bulk product import completed',
      options.validateOnly ? 200 : 201
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

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, organization: req.organizationId },
      updates,
      { new: true, runValidators: true }
    );

    if (!product) throw new AppError('Product not found', 404);

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
