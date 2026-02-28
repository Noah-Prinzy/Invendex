import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import { AppError } from '../../errors/AppError.js';
import {
  generateUniqueSku,
  normalizeManualSku,
  previewUniqueSku
} from './skuService.js';

const BULK_IMPORT_DUPLICATE_POLICIES = new Set(['skip', 'update', 'fail']);
const DEFAULT_DUPLICATE_POLICY = 'skip';
const ROW_PREVIEW_LIMIT = 50;

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

export const normalizeBulkImportOptions = (options = {}) => {
  const validateOnly = options?.validateOnly === true;
  const atomic = options?.atomic === true;
  const duplicatePolicy = String(
    options?.duplicatePolicy || DEFAULT_DUPLICATE_POLICY
  )
    .trim()
    .toLowerCase();

  return {
    validateOnly,
    atomic,
    duplicatePolicy: BULK_IMPORT_DUPLICATE_POLICIES.has(duplicatePolicy)
      ? duplicatePolicy
      : DEFAULT_DUPLICATE_POLICY
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

const buildProgressSnapshot = ({
  totalRows,
  processedRows,
  createdCount,
  updatedCount,
  skippedCount,
  failedCount
}) => {
  const safeTotal = Math.max(Number(totalRows || 0), 0);
  const safeProcessed = Math.max(
    Math.min(Number(processedRows || 0), safeTotal),
    0
  );
  const percent = safeTotal
    ? Number(((safeProcessed / safeTotal) * 100).toFixed(2))
    : 100;

  return {
    totalRows: safeTotal,
    processedRows: safeProcessed,
    percent,
    createdCount: Number(createdCount || 0),
    updatedCount: Number(updatedCount || 0),
    skippedCount: Number(skippedCount || 0),
    failedCount: Number(failedCount || 0)
  };
};

const processBulkImportRows = async ({
  organizationId,
  rows,
  fieldMap,
  options,
  mode,
  session = null,
  onProgress = null
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const rowErrors = [];
  const createdProducts = [];
  const updatedProducts = [];
  const previewRows = [];
  let skippedCount = 0;

  const previewSkuCursor = new Map();
  const seenManualSkus = new Map();
  const seenBarcodes = new Map();

  const emitProgress = async (processedRows) => {
    if (typeof onProgress !== 'function') return;

    await onProgress(
      buildProgressSnapshot({
        totalRows: safeRows.length,
        processedRows,
        createdCount: createdProducts.length,
        updatedCount: updatedProducts.length,
        skippedCount,
        failedCount: rowErrors.length
      })
    );
  };

  for (let index = 0; index < safeRows.length; index += 1) {
    const row = safeRows[index];
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
        err.suggestedFix = 'Provide a valid number greater than or equal to 0.';
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
          organizationId,
          category: payload.category,
          name: payload.name,
          prefixOverride: mappedRow.skuPrefix,
          session,
          cursorByPrefix: previewSkuCursor
        });
      } else {
        payload.sku = await generateUniqueSku({
          organizationId,
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
          organization: organizationId,
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
          await emitProgress(rowNumber);
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
        await emitProgress(rowNumber);
        continue;
      }

      if (mode === 'write') {
        let created;
        if (session) {
          [created] = await Product.create(
            [
              {
                ...payload,
                organization: organizationId
              }
            ],
            { session }
          );
        } else {
          created = await Product.create({
            ...payload,
            organization: organizationId
          });
        }
        createdProducts.push(created);
      }

      previewRows.push({
        row: rowNumber,
        sku: payload.sku,
        action: 'CREATE_NEW'
      });
      await emitProgress(rowNumber);
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
        await emitProgress(rowNumber);
        continue;
      }

      if (rowError?.code === 11000 && rowError?.keyPattern?.barcode) {
        rowErrors.push({
          row: rowNumber,
          field: 'barcode',
          error: 'Barcode already exists in organization',
          originalValue: row?.barcode ?? null,
          suggestedFix: 'Provide a unique barcode or remove duplicate barcode.'
        });
        await emitProgress(rowNumber);
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
      await emitProgress(rowNumber);
    }
  }

  const totalRows = safeRows.length;
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
    previewRows: previewRows.slice(0, ROW_PREVIEW_LIMIT),
    products: createdProducts,
    updatedProducts,
    rowErrors
  };
};

export const executeProductBulkImport = async ({
  organizationId,
  rows,
  fieldMap = {},
  options = {},
  onProgress = null
}) => {
  const normalizedOptions = normalizeBulkImportOptions(options);

  if (normalizedOptions.atomic && !normalizedOptions.validateOnly) {
    const dryRunValidation = await processBulkImportRows({
      organizationId,
      rows,
      fieldMap,
      options: normalizedOptions,
      mode: 'validate',
      onProgress
    });

    if (dryRunValidation.rowErrors.length > 0) {
      return {
        ...dryRunValidation,
        dryRun: true,
        atomic: true,
        duplicatePolicy: normalizedOptions.duplicatePolicy,
        validationBlocked: true
      };
    }

    const session = await mongoose.startSession();
    try {
      let writeResult = null;
      await session.withTransaction(async () => {
        writeResult = await processBulkImportRows({
          organizationId,
          rows,
          fieldMap,
          options: normalizedOptions,
          mode: 'write',
          session,
          onProgress
        });
      });

      return {
        ...writeResult,
        dryRun: false,
        atomic: true,
        duplicatePolicy: normalizedOptions.duplicatePolicy,
        validationBlocked: false
      };
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

  const result = await processBulkImportRows({
    organizationId,
    rows,
    fieldMap,
    options: normalizedOptions,
    mode: normalizedOptions.validateOnly ? 'validate' : 'write',
    onProgress
  });

  return {
    ...result,
    dryRun: normalizedOptions.validateOnly,
    atomic: normalizedOptions.atomic && !normalizedOptions.validateOnly,
    duplicatePolicy: normalizedOptions.duplicatePolicy,
    validationBlocked: false
  };
};

export default {
  normalizeBulkImportOptions,
  executeProductBulkImport
};
