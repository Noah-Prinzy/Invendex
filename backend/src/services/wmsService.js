import mongoose from 'mongoose';
import BinInventory from '../models/BinInventory.js';
import Inventory from '../models/Inventory.js';
import InventoryBatch from '../models/InventoryBatch.js';
import InventorySerial from '../models/InventorySerial.js';
import PickTicket from '../models/PickTicket.js';
import Product from '../models/Product.js';
import StockTransfer from '../models/StockTransfer.js';
import StockMovement from '../models/StockMovement.js';
import Warehouse from '../models/Warehouse.js';
import WarehouseBin from '../models/WarehouseBin.js';
import {
  consumeOutboundTracking,
  reserveInventorySerials
} from './inventory/trackingService.js';
import { syncProductStockFromInventory } from './inventory/stockSyncService.js';
import { AppError } from '../errors/AppError.js';
import { logInventoryMutation } from '../observability/inventoryMutationLogger.js';
import { runWithMongoTransactionFallback } from '../utils/runWithMongoTransactionFallback.js';
import { logAudit } from '../utils/auditLogger.js';
import { publishInventoryUpdated } from '../realtime/publisher.js';

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const ensurePositiveInteger = (value, label) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${label} must be a positive integer`, 400);
  }
  return parsed;
};

const normalizeOptionalPositiveInteger = (value, label) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError(`${label} must be a non-negative integer`, 400);
  }
  return parsed;
};

const ensureWarehouseInOrganization = async (
  organizationId,
  warehouseId,
  session = null
) => {
  const query = Warehouse.findOne({
    _id: warehouseId,
    organization: organizationId,
    isActive: true,
    isArchived: false
  }).select('_id');
  if (session) {
    query.session(session);
  }
  const warehouse = await query;

  if (!warehouse) {
    throw new AppError('Warehouse not found in your organization', 404);
  }
};

const ensureBinInWarehouse = async ({
  organizationId,
  warehouseId,
  binId,
  session = null
}) => {
  const query = WarehouseBin.findOne({
    _id: binId,
    organization: organizationId,
    warehouse: warehouseId,
    isActive: true
  });
  if (session) {
    query.session(session);
  }
  const bin = await query;

  if (!bin) {
    throw new AppError('Bin not found in the selected warehouse', 404);
  }

  return bin;
};

const getBinTotalOnHand = async ({
  organizationId,
  warehouseId,
  binId,
  session = null
}) => {
  const aggregateQuery = BinInventory.aggregate([
    {
      $match: {
        organization: toObjectId(organizationId),
        warehouse: toObjectId(warehouseId),
        bin: toObjectId(binId)
      }
    },
    {
      $group: {
        _id: null,
        totalOnHand: { $sum: '$quantityOnHand' }
      }
    }
  ]);
  if (session) {
    aggregateQuery.session(session);
  }
  const rows = await aggregateQuery;

  return rows[0]?.totalOnHand || 0;
};

const assertBinCapacity = async ({
  organizationId,
  warehouseId,
  bin,
  incomingQuantity,
  session = null
}) => {
  const maxCapacityUnits =
    bin.maxCapacityUnits == null ? null : Number(bin.maxCapacityUnits);
  if (maxCapacityUnits == null) return;

  const currentOnHand = await getBinTotalOnHand({
    organizationId,
    warehouseId,
    binId: bin._id,
    session
  });

  if (currentOnHand + incomingQuantity > maxCapacityUnits) {
    throw new AppError(
      `Bin capacity exceeded. Current ${currentOnHand}, incoming ${incomingQuantity}, max ${maxCapacityUnits}`,
      409
    );
  }
};

const getFefoBatches = async ({
  organizationId,
  warehouseId,
  productId,
  session = null
}) => {
  const query = InventoryBatch.find({
    organization: organizationId,
    warehouse: warehouseId,
    product: productId,
    isRecalled: false
  });
  if (session) {
    query.session(session);
  }
  const batches = await query;

  const farFuture = Number.MAX_SAFE_INTEGER;
  const sorted = batches
    .map((batch) => ({
      batch,
      available:
        Number(batch.quantityOnHand || 0) - Number(batch.quantityReserved || 0)
    }))
    .filter((entry) => entry.available > 0)
    .sort((a, b) => {
      const aExpiry = a.batch.expiryDate
        ? new Date(a.batch.expiryDate).getTime()
        : farFuture;
      const bExpiry = b.batch.expiryDate
        ? new Date(b.batch.expiryDate).getTime()
        : farFuture;
      if (aExpiry !== bExpiry) return aExpiry - bExpiry;
      return (
        new Date(a.batch.createdAt).getTime() -
        new Date(b.batch.createdAt).getTime()
      );
    })
    .map((entry) => entry.batch);

  return sorted;
};

const getBinnedQuantity = async ({
  organizationId,
  warehouseId,
  productId,
  session = null
}) => {
  const aggregateQuery = BinInventory.aggregate([
    {
      $match: {
        organization: toObjectId(organizationId),
        warehouse: toObjectId(warehouseId),
        product: toObjectId(productId)
      }
    },
    {
      $group: {
        _id: null,
        quantityOnHand: { $sum: '$quantityOnHand' }
      }
    }
  ]);
  if (session) {
    aggregateQuery.session(session);
  }
  const rows = await aggregateQuery;

  return rows[0]?.quantityOnHand || 0;
};

export const createWarehouseBin = async ({
  organizationId,
  warehouseId,
  code,
  zone = null,
  aisle = null,
  rack = null,
  shelf = null,
  binType = 'STORAGE',
  maxCapacityUnits = null,
  replenishmentMinUnits = null,
  replenishmentTargetUnits = null
}) => {
  if (!code) {
    throw new AppError('Bin code is required', 400);
  }

  const parsedMaxCapacity = normalizeOptionalPositiveInteger(
    maxCapacityUnits,
    'maxCapacityUnits'
  );
  const parsedReplenishmentMin = normalizeOptionalPositiveInteger(
    replenishmentMinUnits,
    'replenishmentMinUnits'
  );
  const parsedReplenishmentTarget = normalizeOptionalPositiveInteger(
    replenishmentTargetUnits,
    'replenishmentTargetUnits'
  );

  if (
    parsedReplenishmentMin != null &&
    parsedReplenishmentTarget != null &&
    parsedReplenishmentTarget < parsedReplenishmentMin
  ) {
    throw new AppError(
      'replenishmentTargetUnits must be greater than or equal to replenishmentMinUnits',
      400
    );
  }

  await ensureWarehouseInOrganization(organizationId, warehouseId);

  const bin = await WarehouseBin.create({
    organization: organizationId,
    warehouse: warehouseId,
    code,
    zone,
    aisle,
    rack,
    shelf,
    binType,
    maxCapacityUnits: parsedMaxCapacity,
    replenishmentMinUnits: parsedReplenishmentMin,
    replenishmentTargetUnits: parsedReplenishmentTarget
  });

  return bin;
};

export const listWarehouseBins = async ({
  organizationId,
  warehouseId = null,
  includeInactive = false
}) => {
  const query = {
    organization: organizationId
  };

  if (warehouseId) {
    query.warehouse = warehouseId;
  }

  if (!includeInactive) {
    query.isActive = true;
  }

  return WarehouseBin.find(query)
    .sort({ warehouse: 1, zone: 1, aisle: 1, rack: 1, shelf: 1, code: 1 })
    .lean();
};

export const getBinInventoryContents = async ({
  organizationId,
  binId,
  warehouseId = null,
  limit = 200
}) => {
  const parsedLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);

  const binQuery = {
    _id: binId,
    organization: organizationId,
    isActive: true
  };
  if (warehouseId) {
    binQuery.warehouse = warehouseId;
  }

  const bin = await WarehouseBin.findOne(binQuery)
    .populate('warehouse', 'name code region')
    .lean();

  if (!bin) {
    throw new AppError('Bin not found in your organization', 404);
  }

  const rows = await BinInventory.find({
    organization: organizationId,
    warehouse: bin.warehouse?._id || bin.warehouse,
    bin: bin._id,
    quantityOnHand: { $gt: 0 }
  })
    .sort({ quantityOnHand: -1, updatedAt: -1 })
    .limit(parsedLimit)
    .populate('product', 'name sku barcode category price')
    .lean();

  const items = rows.map((row) => {
    const quantityOnHand = Number(row.quantityOnHand || 0);
    const quantityReserved = Number(row.quantityReserved || 0);
    const quantityAvailable = Math.max(quantityOnHand - quantityReserved, 0);

    return {
      inventoryId: String(row._id),
      productId: row.product?._id ? String(row.product._id) : null,
      sku: row.product?.sku || null,
      productName: row.product?.name || null,
      barcode: row.product?.barcode || null,
      category: row.product?.category || null,
      unitPrice: Number(row.product?.price || 0),
      quantityOnHand,
      quantityReserved,
      quantityAvailable,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null
    };
  });

  const totals = items.reduce(
    (acc, row) => {
      acc.lines += 1;
      acc.quantityOnHand += Number(row.quantityOnHand || 0);
      acc.quantityReserved += Number(row.quantityReserved || 0);
      acc.quantityAvailable += Number(row.quantityAvailable || 0);
      acc.inventoryValue +=
        Number(row.quantityOnHand || 0) * Number(row.unitPrice || 0);
      return acc;
    },
    {
      lines: 0,
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityAvailable: 0,
      inventoryValue: 0
    }
  );

  return {
    generatedAt: new Date().toISOString(),
    bin: {
      binId: String(bin._id),
      code: bin.code || null,
      zone: bin.zone || null,
      aisle: bin.aisle || null,
      rack: bin.rack || null,
      shelf: bin.shelf || null,
      binType: bin.binType || null,
      maxCapacityUnits:
        bin.maxCapacityUnits == null ? null : Number(bin.maxCapacityUnits),
      warehouseId: bin.warehouse?._id
        ? String(bin.warehouse._id)
        : String(bin.warehouse || ''),
      warehouseCode: bin.warehouse?.code || null,
      warehouseName: bin.warehouse?.name || null,
      warehouseRegion: bin.warehouse?.region || null
    },
    totals: {
      lines: Number(totals.lines || 0),
      quantityOnHand: Number(totals.quantityOnHand.toFixed(2)),
      quantityReserved: Number(totals.quantityReserved.toFixed(2)),
      quantityAvailable: Number(totals.quantityAvailable.toFixed(2)),
      inventoryValue: Number(totals.inventoryValue.toFixed(2))
    },
    items
  };
};

export const getBinMovementHistory = async ({
  organizationId,
  binId,
  warehouseId = null,
  movementType = null,
  limit = 200
}) => {
  const parsedLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);

  const binQuery = {
    _id: binId,
    organization: organizationId,
    isActive: true
  };
  if (warehouseId) {
    binQuery.warehouse = warehouseId;
  }

  const bin = await WarehouseBin.findOne(binQuery)
    .populate('warehouse', 'name code region')
    .lean();

  if (!bin) {
    throw new AppError('Bin not found in your organization', 404);
  }

  const movementQuery = {
    organization: organizationId,
    $or: [{ binFrom: bin._id }, { binTo: bin._id }]
  };

  if (movementType) {
    movementQuery.movementType = movementType;
  }

  const rows = await StockMovement.find(movementQuery)
    .sort({ movedAt: -1 })
    .limit(parsedLimit)
    .populate('product', 'name sku')
    .populate('warehouseFrom warehouseTo', 'name code')
    .populate('binFrom binTo', 'code zone aisle rack shelf')
    .populate('movedBy', 'email role')
    .lean();

  const binIdString = String(bin._id);
  const movements = rows.map((row) => {
    const fromBinId = row.binFrom?._id ? String(row.binFrom._id) : null;
    const toBinId = row.binTo?._id ? String(row.binTo._id) : null;

    let direction = 'INTERNAL';
    if (toBinId === binIdString && fromBinId !== binIdString) {
      direction = 'IN';
    } else if (fromBinId === binIdString && toBinId !== binIdString) {
      direction = 'OUT';
    }

    return {
      movementId: String(row._id),
      movedAt: row.movedAt ? new Date(row.movedAt).toISOString() : null,
      movementType: row.movementType || null,
      direction,
      quantity: Number(row.quantity || 0),
      productId: row.product?._id ? String(row.product._id) : null,
      sku: row.product?.sku || null,
      productName: row.product?.name || null,
      referenceType: row.referenceType || null,
      referenceId: row.referenceId ? String(row.referenceId) : null,
      reason: row.reason || null,
      warehouseFromId: row.warehouseFrom?._id
        ? String(row.warehouseFrom._id)
        : null,
      warehouseFromCode: row.warehouseFrom?.code || null,
      warehouseToId: row.warehouseTo?._id ? String(row.warehouseTo._id) : null,
      warehouseToCode: row.warehouseTo?.code || null,
      binFromId: fromBinId,
      binFromCode: row.binFrom?.code || null,
      binToId: toBinId,
      binToCode: row.binTo?.code || null,
      movedById: row.movedBy?._id ? String(row.movedBy._id) : null,
      movedByEmail: row.movedBy?.email || null
    };
  });

  const totals = movements.reduce(
    (acc, row) => {
      acc.count += 1;
      acc.quantity += Number(row.quantity || 0);
      if (row.direction === 'IN') {
        acc.inboundQuantity += Number(row.quantity || 0);
      } else if (row.direction === 'OUT') {
        acc.outboundQuantity += Number(row.quantity || 0);
      }

      const movementKey = String(row.movementType || 'UNKNOWN');
      acc.byType[movementKey] = (acc.byType[movementKey] || 0) + 1;
      return acc;
    },
    {
      count: 0,
      quantity: 0,
      inboundQuantity: 0,
      outboundQuantity: 0,
      byType: {}
    }
  );

  return {
    generatedAt: new Date().toISOString(),
    bin: {
      binId: String(bin._id),
      code: bin.code || null,
      zone: bin.zone || null,
      aisle: bin.aisle || null,
      rack: bin.rack || null,
      shelf: bin.shelf || null,
      binType: bin.binType || null,
      warehouseId: bin.warehouse?._id
        ? String(bin.warehouse._id)
        : String(bin.warehouse || ''),
      warehouseCode: bin.warehouse?.code || null,
      warehouseName: bin.warehouse?.name || null,
      warehouseRegion: bin.warehouse?.region || null
    },
    totals: {
      count: Number(totals.count || 0),
      quantity: Number(totals.quantity.toFixed(2)),
      inboundQuantity: Number(totals.inboundQuantity.toFixed(2)),
      outboundQuantity: Number(totals.outboundQuantity.toFixed(2)),
      byType: totals.byType
    },
    movements
  };
};

export const allocateStockToBin = async ({
  organizationId,
  warehouseId,
  binId,
  productId,
  quantity,
  movedBy = null,
  reason = 'Manual allocation'
}) => {
  const qty = ensurePositiveInteger(quantity, 'quantity');

  return runWithMongoTransactionFallback({
    operationName: 'wms_allocate_stock_to_bin',
    operationMeta: {
      organizationId: String(organizationId),
      warehouseId: String(warehouseId),
      binId: String(binId),
      productId: String(productId),
      quantity: qty
    },
    runWithSession: async (session) => {
      await ensureWarehouseInOrganization(organizationId, warehouseId, session);
      const bin = await ensureBinInWarehouse({
        organizationId,
        warehouseId,
        binId,
        session
      });

      const productQuery = Product.findOne({
        _id: productId,
        organization: organizationId
      }).select('_id sku name');
      if (session) {
        productQuery.session(session);
      }
      const product = await productQuery;
      if (!product) {
        throw new AppError('Product not found in your organization', 404);
      }

      const inventoryQuery = Inventory.findOne({
        organization: organizationId,
        warehouse: warehouseId,
        product: productId
      });
      if (session) {
        inventoryQuery.session(session);
      }
      const inventory = await inventoryQuery;

      if (!inventory || inventory.quantityOnHand <= 0) {
        throw new AppError(
          'No warehouse inventory available for this product',
          400
        );
      }

      const binnedQty = await getBinnedQuantity({
        organizationId,
        warehouseId,
        productId,
        session
      });

      const unallocatedQty = inventory.quantityOnHand - binnedQty;
      if (unallocatedQty < qty) {
        throw new AppError(
          `Only ${Math.max(unallocatedQty, 0)} units are available for bin allocation`,
          409
        );
      }

      await assertBinCapacity({
        organizationId,
        warehouseId,
        bin,
        incomingQuantity: qty,
        session
      });

      const binInventoryOptions = {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      };
      if (session) {
        binInventoryOptions.session = session;
      }

      const binInventory = await BinInventory.findOneAndUpdate(
        {
          organization: organizationId,
          warehouse: warehouseId,
          bin: binId,
          product: productId
        },
        {
          $inc: { quantityOnHand: qty }
        },
        binInventoryOptions
      );

      const stockMovementPayload = {
        organization: organizationId,
        movementType: 'ALLOCATION',
        product: productId,
        quantity: qty,
        warehouseTo: warehouseId,
        binTo: binId,
        reason,
        referenceType: 'MANUAL',
        movedBy
      };
      if (session) {
        await StockMovement.create([stockMovementPayload], { session });
      } else {
        await StockMovement.create(stockMovementPayload);
      }

      await logAudit({
        action: 'WMS_ALLOCATE_STOCK_TO_BIN',
        entity: 'WMS_BIN',
        entityId: binId,
        organizationId,
        source: 'system',
        success: true,
        meta: {
          warehouseId: String(warehouseId),
          productId: String(productId),
          quantity: qty,
          reason,
          movedBy: movedBy ? String(movedBy) : null
        },
        session,
        silent: true
      });

      logInventoryMutation({
        operation: 'bin_allocation',
        organizationId,
        warehouseId,
        productId,
        quantityDelta: 0,
        sourceType: 'MANUAL',
        actorUserId: movedBy,
        metadata: {
          binId,
          reason,
          allocatedQuantity: qty
        }
      });

      return binInventory;
    }
  });
};

export const transferStockBetweenBins = async ({
  organizationId,
  warehouseId,
  productId,
  fromBinId,
  toBinId,
  quantity,
  movedBy = null,
  reason = 'Bin transfer'
}) => {
  const qty = ensurePositiveInteger(quantity, 'quantity');

  if (String(fromBinId) === String(toBinId)) {
    throw new AppError('Source and destination bins must be different', 400);
  }

  return runWithMongoTransactionFallback({
    operationName: 'wms_transfer_stock_between_bins',
    operationMeta: {
      organizationId: String(organizationId),
      warehouseId: String(warehouseId),
      productId: String(productId),
      fromBinId: String(fromBinId),
      toBinId: String(toBinId),
      quantity: qty
    },
    runWithSession: async (session) => {
      await ensureWarehouseInOrganization(organizationId, warehouseId, session);
      await ensureBinInWarehouse({
        organizationId,
        warehouseId,
        binId: fromBinId,
        session
      });
      const toBin = await ensureBinInWarehouse({
        organizationId,
        warehouseId,
        binId: toBinId,
        session
      });

      await assertBinCapacity({
        organizationId,
        warehouseId,
        bin: toBin,
        incomingQuantity: qty,
        session
      });

      const fromInventoryOptions = {
        new: true,
        runValidators: true
      };
      if (session) {
        fromInventoryOptions.session = session;
      }

      const fromInventory = await BinInventory.findOneAndUpdate(
        {
          organization: organizationId,
          warehouse: warehouseId,
          bin: fromBinId,
          product: productId,
          quantityOnHand: { $gte: qty },
          quantityReserved: { $lte: Number.MAX_SAFE_INTEGER - qty },
          $expr: {
            $gte: [{ $subtract: ['$quantityOnHand', '$quantityReserved'] }, qty]
          }
        },
        {
          $inc: { quantityOnHand: -qty }
        },
        fromInventoryOptions
      );

      if (!fromInventory) {
        throw new AppError(
          'Insufficient available stock in source bin for transfer',
          409
        );
      }

      const toInventoryOptions = {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      };
      if (session) {
        toInventoryOptions.session = session;
      }

      const toInventory = await BinInventory.findOneAndUpdate(
        {
          organization: organizationId,
          warehouse: warehouseId,
          bin: toBinId,
          product: productId
        },
        {
          $inc: { quantityOnHand: qty }
        },
        toInventoryOptions
      );

      const stockMovementPayload = {
        organization: organizationId,
        movementType: 'TRANSFER',
        product: productId,
        quantity: qty,
        warehouseFrom: warehouseId,
        warehouseTo: warehouseId,
        binFrom: fromBinId,
        binTo: toBinId,
        reason,
        referenceType: 'MANUAL',
        movedBy
      };
      if (session) {
        await StockMovement.create([stockMovementPayload], { session });
      } else {
        await StockMovement.create(stockMovementPayload);
      }

      await logAudit({
        action: 'WMS_TRANSFER_STOCK_BETWEEN_BINS',
        entity: 'WMS_MOVEMENT',
        organizationId,
        source: 'system',
        success: true,
        meta: {
          warehouseId: String(warehouseId),
          productId: String(productId),
          fromBinId: String(fromBinId),
          toBinId: String(toBinId),
          quantity: qty,
          reason,
          movedBy: movedBy ? String(movedBy) : null
        },
        session,
        silent: true
      });

      logInventoryMutation({
        operation: 'bin_transfer',
        organizationId,
        warehouseId,
        productId,
        quantityDelta: 0,
        sourceType: 'MANUAL',
        actorUserId: movedBy,
        metadata: {
          fromBinId,
          toBinId,
          reason,
          transferredQuantity: qty
        }
      });

      return {
        from: fromInventory,
        to: toInventory
      };
    }
  });
};

export const transferStockBetweenWarehouses = async ({
  organizationId,
  productId,
  fromWarehouseId,
  toWarehouseId,
  quantity,
  movedBy = null,
  reason = 'Inter-warehouse transfer',
  notes = null,
  idempotencyKey = null
}) => {
  const qty = ensurePositiveInteger(quantity, 'quantity');

  if (String(fromWarehouseId) === String(toWarehouseId)) {
    throw new AppError(
      'Source and destination warehouses must be different',
      400
    );
  }

  const result = await runWithMongoTransactionFallback({
    operationName: 'wms_transfer_stock_between_warehouses',
    operationMeta: {
      organizationId: String(organizationId),
      fromWarehouseId: String(fromWarehouseId),
      toWarehouseId: String(toWarehouseId),
      productId: String(productId),
      quantity: qty
    },
    runWithSession: async (session) => {
      await ensureWarehouseInOrganization(
        organizationId,
        fromWarehouseId,
        session
      );
      await ensureWarehouseInOrganization(
        organizationId,
        toWarehouseId,
        session
      );

      const productQuery = Product.findOne({
        _id: productId,
        organization: organizationId
      }).select('_id sku name');
      if (session) {
        productQuery.session(session);
      }
      const product = await productQuery;
      if (!product) {
        throw new AppError('Product not found in your organization', 404);
      }

      const normalizedIdempotencyKey = String(idempotencyKey || '').trim();
      if (normalizedIdempotencyKey) {
        const existingTransferQuery = StockTransfer.findOne({
          organization: organizationId,
          idempotencyKey: normalizedIdempotencyKey
        });
        if (session) {
          existingTransferQuery.session(session);
        }
        const existingTransfer = await existingTransferQuery;
        if (existingTransfer) {
          return {
            transfer: existingTransfer,
            fromInventory: null,
            toInventory: null,
            deduplicated: true
          };
        }
      }

      const now = new Date();
      const fromInventoryOptions = {
        new: true,
        runValidators: true
      };
      if (session) {
        fromInventoryOptions.session = session;
      }

      const fromInventory = await Inventory.findOneAndUpdate(
        {
          organization: organizationId,
          warehouse: fromWarehouseId,
          product: productId,
          quantityOnHand: { $gte: qty },
          $expr: {
            $gte: [{ $subtract: ['$quantityOnHand', '$quantityReserved'] }, qty]
          }
        },
        {
          $inc: { quantityOnHand: -qty },
          $set: { lastMovementAt: now }
        },
        fromInventoryOptions
      );

      if (!fromInventory) {
        throw new AppError(
          'Insufficient available stock in source warehouse for transfer',
          409
        );
      }

      const toInventoryOptions = {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      };
      if (session) {
        toInventoryOptions.session = session;
      }

      const toInventory = await Inventory.findOneAndUpdate(
        {
          organization: organizationId,
          warehouse: toWarehouseId,
          product: productId
        },
        {
          $inc: { quantityOnHand: qty },
          $set: { lastMovementAt: now },
          $setOnInsert: {
            quantityReserved: 0,
            reorderPoint: 0,
            reorderQuantity: 0
          }
        },
        toInventoryOptions
      );

      const movementPayload = {
        organization: organizationId,
        movementType: 'TRANSFER',
        product: productId,
        quantity: qty,
        warehouseFrom: fromWarehouseId,
        warehouseTo: toWarehouseId,
        reason,
        referenceType: 'MANUAL',
        movedBy
      };
      if (session) {
        await StockMovement.create([movementPayload], { session });
      } else {
        await StockMovement.create(movementPayload);
      }

      let transfer;
      const transferPayload = {
        organization: organizationId,
        product: productId,
        fromWarehouse: fromWarehouseId,
        toWarehouse: toWarehouseId,
        quantity: qty,
        status: 'COMPLETED',
        reason,
        notes,
        requestedBy: movedBy,
        completedBy: movedBy,
        requestedAt: now,
        completedAt: now,
        idempotencyKey: normalizedIdempotencyKey || null
      };
      if (session) {
        [transfer] = await StockTransfer.create([transferPayload], { session });
      } else {
        transfer = await StockTransfer.create(transferPayload);
      }

      await syncProductStockFromInventory({
        organizationId,
        productId,
        session
      });

      await logAudit({
        action: 'WMS_TRANSFER_STOCK_BETWEEN_WAREHOUSES',
        entity: 'WMS_TRANSFER',
        entityId: transfer._id,
        organizationId,
        source: 'system',
        success: true,
        meta: {
          productId: String(productId),
          fromWarehouseId: String(fromWarehouseId),
          toWarehouseId: String(toWarehouseId),
          quantity: qty,
          reason,
          movedBy: movedBy ? String(movedBy) : null
        },
        session,
        silent: true
      });

      logInventoryMutation({
        operation: 'warehouse_transfer_outbound',
        organizationId,
        warehouseId: fromWarehouseId,
        productId,
        quantityDelta: -qty,
        quantityOnHand: fromInventory.quantityOnHand,
        quantityReserved: fromInventory.quantityReserved,
        sourceType: 'MANUAL',
        actorUserId: movedBy,
        metadata: {
          toWarehouseId
        }
      });

      logInventoryMutation({
        operation: 'warehouse_transfer_inbound',
        organizationId,
        warehouseId: toWarehouseId,
        productId,
        quantityDelta: qty,
        quantityOnHand: toInventory.quantityOnHand,
        quantityReserved: toInventory.quantityReserved,
        sourceType: 'MANUAL',
        actorUserId: movedBy,
        metadata: {
          fromWarehouseId
        }
      });

      return {
        transfer,
        fromInventory,
        toInventory,
        deduplicated: false
      };
    }
  });

  if (!result?.deduplicated) {
    publishInventoryUpdated({
      organizationId,
      actorUserId: movedBy,
      warehouseId: fromWarehouseId,
      entityId: productId,
      data: {
        source: 'warehouse_transfer',
        direction: 'OUTBOUND',
        quantityDelta: -qty,
        transferId: result?.transfer?._id || null,
        toWarehouseId: String(toWarehouseId)
      }
    });

    publishInventoryUpdated({
      organizationId,
      actorUserId: movedBy,
      warehouseId: toWarehouseId,
      entityId: productId,
      data: {
        source: 'warehouse_transfer',
        direction: 'INBOUND',
        quantityDelta: qty,
        transferId: result?.transfer?._id || null,
        fromWarehouseId: String(fromWarehouseId)
      }
    });
  }

  return result;
};

export const listWarehouseTransfers = async ({
  organizationId,
  fromWarehouseId = null,
  toWarehouseId = null,
  productId = null,
  status = null,
  limit = 100
}) => {
  const parsedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const query = {
    organization: organizationId
  };

  if (fromWarehouseId) {
    query.fromWarehouse = fromWarehouseId;
  }
  if (toWarehouseId) {
    query.toWarehouse = toWarehouseId;
  }
  if (productId) {
    query.product = productId;
  }
  if (status) {
    query.status = String(status).toUpperCase();
  }

  return StockTransfer.find(query)
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .populate('product', 'name sku')
    .populate('fromWarehouse toWarehouse', 'name code')
    .populate('requestedBy completedBy', 'email role')
    .lean();
};

export const createPickTicket = async ({
  organizationId,
  warehouseId,
  items,
  createdBy,
  notes = null
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Pick ticket items are required', 400);
  }

  return runWithMongoTransactionFallback({
    operationName: 'wms_create_pick_ticket',
    operationMeta: {
      organizationId: String(organizationId),
      warehouseId: String(warehouseId),
      itemCount: items.length
    },
    runWithSession: async (session) => {
      await ensureWarehouseInOrganization(organizationId, warehouseId, session);

      const normalizedItems = [];

      for (const item of items) {
        const productId = item.productId || item.product;
        const requestedQty = ensurePositiveInteger(
          item.quantity || item.requestedQuantity,
          'item quantity'
        );
        const fefoOverride =
          item.fefoOverride === true || item.allowFefoOverride === true;

        let lotNumber = item.lotNumber
          ? String(item.lotNumber).trim().toUpperCase()
          : null;
        let serialNumbers = Array.isArray(item.serialNumbers)
          ? item.serialNumbers
              .map((value) =>
                String(value || '')
                  .trim()
                  .toUpperCase()
              )
              .filter(Boolean)
          : [];

        const fefoBatches = await getFefoBatches({
          organizationId,
          warehouseId,
          productId,
          session
        });

        if (fefoBatches.length) {
          const fefoLotNumber = fefoBatches[0].lotNumber;
          if (!lotNumber) {
            lotNumber = fefoLotNumber;
          } else if (lotNumber !== fefoLotNumber && !fefoOverride) {
            throw new AppError(
              `FEFO enforcement: lot ${fefoLotNumber} must be picked before lot ${lotNumber}`,
              409
            );
          }
        }

        if (!serialNumbers.length) {
          const serialQuery = InventorySerial.find({
            organization: organizationId,
            warehouse: warehouseId,
            product: productId,
            status: 'AVAILABLE',
            ...(lotNumber ? { lotNumber } : {})
          })
            .sort({ expiryDate: 1, receivedAt: 1, createdAt: 1 })
            .limit(requestedQty);
          if (session) {
            serialQuery.session(session);
          }
          const serialRows = await serialQuery;

          if (serialRows.length) {
            if (serialRows.length !== requestedQty) {
              throw new AppError(
                `Insufficient AVAILABLE serials for product ${productId} in lot ${lotNumber || 'N/A'}`,
                409
              );
            }

            serialNumbers = serialRows.map((row) => row.serialNumber);
          }
        }

        if (serialNumbers.length && serialNumbers.length !== requestedQty) {
          throw new AppError(
            'serialNumbers count must equal requested quantity for pick item',
            400
          );
        }

        if (serialNumbers.length) {
          const serialCountQuery = InventorySerial.countDocuments({
            organization: organizationId,
            warehouse: warehouseId,
            product: productId,
            status: 'AVAILABLE',
            serialNumber: { $in: serialNumbers },
            ...(lotNumber ? { lotNumber } : {})
          });
          if (session) {
            serialCountQuery.session(session);
          }
          const matchingSerialCount = await serialCountQuery;

          if (matchingSerialCount !== serialNumbers.length) {
            throw new AppError(
              'One or more serialNumbers are not AVAILABLE for picking',
              409
            );
          }
        }

        const binStocksQuery = BinInventory.find({
          organization: organizationId,
          warehouse: warehouseId,
          product: productId,
          quantityOnHand: { $gt: 0 }
        }).sort({ quantityOnHand: -1 });
        if (session) {
          binStocksQuery.session(session);
        }
        const binStocks = await binStocksQuery;

        let remaining = requestedQty;
        const allocations = [];

        for (const binStock of binStocks) {
          const available = binStock.quantityOnHand - binStock.quantityReserved;
          if (available <= 0) continue;

          const allocated = Math.min(remaining, available);
          if (allocated <= 0) continue;

          const reserveOptions = {
            new: true,
            runValidators: true
          };
          if (session) {
            reserveOptions.session = session;
          }

          const reservedBinStock = await BinInventory.findOneAndUpdate(
            {
              _id: binStock._id,
              organization: organizationId,
              warehouse: warehouseId,
              product: productId,
              $expr: {
                $gte: [
                  { $subtract: ['$quantityOnHand', '$quantityReserved'] },
                  allocated
                ]
              }
            },
            {
              $inc: { quantityReserved: allocated }
            },
            reserveOptions
          );

          if (!reservedBinStock) {
            continue;
          }

          allocations.push({
            bin: binStock.bin,
            quantity: allocated
          });

          remaining -= allocated;
          if (remaining === 0) break;
        }

        if (remaining > 0) {
          throw new AppError(
            `Insufficient bin stock to reserve ${requestedQty} units for product ${productId}`,
            409
          );
        }

        const inventoryReserveOptions = {
          runValidators: true,
          new: true
        };
        if (session) {
          inventoryReserveOptions.session = session;
        }

        const reservedInventory = await Inventory.findOneAndUpdate(
          {
            organization: organizationId,
            warehouse: warehouseId,
            product: productId,
            $expr: {
              $gte: [
                { $subtract: ['$quantityOnHand', '$quantityReserved'] },
                requestedQty
              ]
            }
          },
          {
            $inc: { quantityReserved: requestedQty }
          },
          inventoryReserveOptions
        );

        if (!reservedInventory) {
          throw new AppError(
            `Insufficient warehouse stock to reserve ${requestedQty} units for product ${productId}`,
            409
          );
        }

        logInventoryMutation({
          operation: 'pick_reservation_created',
          organizationId,
          warehouseId,
          productId,
          quantityDelta: 0,
          sourceType: 'PICK_TICKET',
          actorUserId: createdBy,
          metadata: {
            reservedQuantity: requestedQty,
            lotNumber
          }
        });

        normalizedItems.push({
          product: productId,
          requestedQuantity: requestedQty,
          pickedQuantity: 0,
          allocations,
          lotNumber,
          serialNumbers
        });
      }

      let ticket;
      const payload = {
        organization: organizationId,
        warehouse: warehouseId,
        items: normalizedItems,
        notes,
        createdBy
      };
      if (session) {
        [ticket] = await PickTicket.create([payload], { session });
      } else {
        ticket = await PickTicket.create(payload);
      }

      await logAudit({
        action: 'WMS_CREATE_PICK_TICKET',
        entity: 'WMS_PICK_TICKET',
        entityId: ticket._id,
        organizationId,
        source: 'system',
        success: true,
        meta: {
          warehouseId: String(warehouseId),
          createdBy: createdBy ? String(createdBy) : null,
          itemCount: normalizedItems.length
        },
        session,
        silent: true
      });

      return ticket;
    }
  });
};

export const startPickTicket = async ({ organizationId, ticketId }) => {
  return runWithMongoTransactionFallback({
    operationName: 'wms_start_pick_ticket',
    operationMeta: {
      organizationId: String(organizationId),
      ticketId: String(ticketId)
    },
    runWithSession: async (session) => {
      const ticketQuery = PickTicket.findOne({
        _id: ticketId,
        organization: organizationId
      });
      if (session) {
        ticketQuery.session(session);
      }
      const ticket = await ticketQuery;

      if (!ticket) {
        throw new AppError('Pick ticket not found', 404);
      }

      if (ticket.status !== 'CREATED') {
        throw new AppError('Only CREATED tickets can be started', 409);
      }

      for (const item of ticket.items) {
        if (!Array.isArray(item.serialNumbers) || !item.serialNumbers.length) {
          continue;
        }

        await reserveInventorySerials({
          organizationId,
          productId: item.product,
          warehouseId: ticket.warehouse,
          serialNumbers: item.serialNumbers,
          lotNumber: item.lotNumber || null,
          referenceType: 'PICK_TICKET',
          referenceId: ticket._id,
          session
        });
      }

      ticket.status = 'PICKING';
      ticket.startedAt = new Date();
      await ticket.save(session ? { session } : undefined);

      await logAudit({
        action: 'WMS_START_PICK_TICKET',
        entity: 'WMS_PICK_TICKET',
        entityId: ticket._id,
        organizationId,
        source: 'system',
        success: true,
        meta: {
          warehouseId: String(ticket.warehouse || ''),
          status: ticket.status
        },
        session,
        silent: true
      });

      return ticket;
    }
  });
};

export const completePickTicket = async ({
  organizationId,
  ticketId,
  movedBy = null
}) => {
  return runWithMongoTransactionFallback({
    operationName: 'wms_complete_pick_ticket',
    operationMeta: {
      organizationId: String(organizationId),
      ticketId: String(ticketId)
    },
    runWithSession: async (session) => {
      const ticketQuery = PickTicket.findOne({
        _id: ticketId,
        organization: organizationId
      });
      if (session) {
        ticketQuery.session(session);
      }
      const ticket = await ticketQuery;

      if (!ticket) {
        throw new AppError('Pick ticket not found', 404);
      }

      if (!['CREATED', 'PICKING'].includes(ticket.status)) {
        throw new AppError(
          'Only CREATED or PICKING tickets can be completed',
          409
        );
      }

      for (const item of ticket.items) {
        for (const allocation of item.allocations) {
          const binUpdateOptions = {
            runValidators: true,
            new: true
          };
          if (session) {
            binUpdateOptions.session = session;
          }

          const binInventory = await BinInventory.findOneAndUpdate(
            {
              organization: organizationId,
              warehouse: ticket.warehouse,
              bin: allocation.bin,
              product: item.product,
              quantityReserved: { $gte: allocation.quantity },
              quantityOnHand: { $gte: allocation.quantity }
            },
            {
              $inc: {
                quantityOnHand: -allocation.quantity,
                quantityReserved: -allocation.quantity
              }
            },
            binUpdateOptions
          );

          if (!binInventory) {
            throw new AppError(
              'Reserved bin stock is inconsistent for pick completion',
              409
            );
          }

          const movementPayload = {
            organization: organizationId,
            movementType: 'PICK',
            product: item.product,
            quantity: allocation.quantity,
            warehouseFrom: ticket.warehouse,
            binFrom: allocation.bin,
            reason: 'Pick ticket packed',
            referenceType: 'PICK_TICKET',
            referenceId: ticket._id,
            movedBy
          };
          if (session) {
            await StockMovement.create([movementPayload], { session });
          } else {
            await StockMovement.create(movementPayload);
          }
        }

        const inventoryUpdateOptions = {
          runValidators: true,
          new: true
        };
        if (session) {
          inventoryUpdateOptions.session = session;
        }

        const inventory = await Inventory.findOneAndUpdate(
          {
            organization: organizationId,
            warehouse: ticket.warehouse,
            product: item.product,
            quantityOnHand: { $gte: item.requestedQuantity },
            quantityReserved: { $gte: item.requestedQuantity }
          },
          {
            $inc: {
              quantityOnHand: -item.requestedQuantity,
              quantityReserved: -item.requestedQuantity
            },
            $set: {
              lastMovementAt: new Date()
            }
          },
          inventoryUpdateOptions
        );

        if (!inventory) {
          throw new AppError(
            'Warehouse inventory is inconsistent for pick completion',
            409
          );
        }

        logInventoryMutation({
          operation: 'pick_ticket_completed',
          organizationId,
          warehouseId: ticket.warehouse,
          productId: item.product,
          quantityDelta: -item.requestedQuantity,
          quantityOnHand: inventory.quantityOnHand,
          quantityReserved: inventory.quantityReserved,
          sourceType: 'PICK_TICKET',
          sourceId: ticket._id,
          actorUserId: movedBy
        });

        await consumeOutboundTracking({
          organizationId,
          productId: item.product,
          warehouseId: ticket.warehouse,
          quantity: item.requestedQuantity,
          lotNumber: item.lotNumber || null,
          serialNumbers: item.serialNumbers || [],
          sourceType: 'PICK_TICKET',
          sourceId: ticket._id,
          movedBy,
          reason: 'Pick ticket packed',
          session
        });

        await syncProductStockFromInventory({
          organizationId,
          productId: item.product,
          session
        });

        item.pickedQuantity = item.requestedQuantity;
      }

      ticket.status = 'PACKED';
      ticket.packedAt = new Date();
      await ticket.save(session ? { session } : undefined);

      await logAudit({
        action: 'WMS_COMPLETE_PICK_TICKET',
        entity: 'WMS_PICK_TICKET',
        entityId: ticket._id,
        organizationId,
        source: 'system',
        success: true,
        meta: {
          warehouseId: String(ticket.warehouse || ''),
          movedBy: movedBy ? String(movedBy) : null,
          status: ticket.status
        },
        session,
        silent: true
      });

      return ticket;
    }
  });
};

export const listStockMovements = async ({
  organizationId,
  warehouseId = null,
  productId = null,
  movementType = null,
  limit = 100
}) => {
  const parsedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

  const query = {
    organization: organizationId
  };

  if (warehouseId) {
    query.$or = [{ warehouseFrom: warehouseId }, { warehouseTo: warehouseId }];
  }
  if (productId) {
    query.product = productId;
  }
  if (movementType) {
    query.movementType = movementType;
  }

  return StockMovement.find(query)
    .sort({ movedAt: -1 })
    .limit(parsedLimit)
    .populate('product', 'name sku')
    .populate('warehouseFrom warehouseTo', 'name code')
    .populate('binFrom binTo', 'code zone aisle rack shelf')
    .lean();
};

export const setWarehouseBinRules = async ({
  organizationId,
  warehouseId,
  binId,
  ...input
}) => {
  return runWithMongoTransactionFallback({
    operationName: 'wms_set_warehouse_bin_rules',
    operationMeta: {
      organizationId: String(organizationId),
      warehouseId: String(warehouseId),
      binId: String(binId)
    },
    runWithSession: async (session) => {
      await ensureWarehouseInOrganization(organizationId, warehouseId, session);

      const binQuery = WarehouseBin.findOne({
        _id: binId,
        organization: organizationId,
        warehouse: warehouseId
      });
      if (session) {
        binQuery.session(session);
      }
      const bin = await binQuery;
      if (!bin) {
        throw new AppError('Bin not found in the selected warehouse', 404);
      }

      if (Object.prototype.hasOwnProperty.call(input, 'maxCapacityUnits')) {
        bin.maxCapacityUnits = normalizeOptionalPositiveInteger(
          input.maxCapacityUnits,
          'maxCapacityUnits'
        );
      }
      if (
        Object.prototype.hasOwnProperty.call(input, 'replenishmentMinUnits')
      ) {
        bin.replenishmentMinUnits = normalizeOptionalPositiveInteger(
          input.replenishmentMinUnits,
          'replenishmentMinUnits'
        );
      }
      if (
        Object.prototype.hasOwnProperty.call(input, 'replenishmentTargetUnits')
      ) {
        bin.replenishmentTargetUnits = normalizeOptionalPositiveInteger(
          input.replenishmentTargetUnits,
          'replenishmentTargetUnits'
        );
      }

      if (
        bin.replenishmentMinUnits != null &&
        bin.replenishmentTargetUnits != null &&
        bin.replenishmentTargetUnits < bin.replenishmentMinUnits
      ) {
        throw new AppError(
          'replenishmentTargetUnits must be greater than or equal to replenishmentMinUnits',
          400
        );
      }

      await bin.save(session ? { session } : undefined);

      await logAudit({
        action: 'WMS_UPDATE_BIN_RULES',
        entity: 'WMS_BIN',
        entityId: bin._id,
        organizationId,
        source: 'system',
        success: true,
        meta: {
          warehouseId: String(warehouseId),
          maxCapacityUnits: bin.maxCapacityUnits,
          replenishmentMinUnits: bin.replenishmentMinUnits,
          replenishmentTargetUnits: bin.replenishmentTargetUnits
        },
        session,
        silent: true
      });

      return bin;
    }
  });
};

export const getReplenishmentRecommendations = async ({
  organizationId,
  warehouseId
}) => {
  await ensureWarehouseInOrganization(organizationId, warehouseId);

  const rows = await BinInventory.find({
    organization: organizationId,
    warehouse: warehouseId
  })
    .populate(
      'bin',
      'code zone binType replenishmentMinUnits replenishmentTargetUnits'
    )
    .populate('product', 'name sku')
    .lean();

  const recommendations = [];

  for (const row of rows) {
    const bin = row.bin;
    if (!bin || bin.replenishmentMinUnits == null) continue;

    const available =
      Number(row.quantityOnHand || 0) - Number(row.quantityReserved || 0);
    const minUnits = Number(bin.replenishmentMinUnits || 0);
    if (available >= minUnits) continue;

    const targetUnits =
      bin.replenishmentTargetUnits != null
        ? Number(bin.replenishmentTargetUnits)
        : minUnits;
    const needed = Math.max(targetUnits - available, 0);
    if (needed <= 0) continue;

    const sourceRows = await BinInventory.find({
      organization: organizationId,
      warehouse: warehouseId,
      product: row.product?._id || row.product,
      bin: { $ne: row.bin?._id || row.bin },
      quantityOnHand: { $gt: 0 }
    })
      .populate('bin', 'code zone binType')
      .lean();

    const sortedSources = sourceRows
      .map((sourceRow) => ({
        ...sourceRow,
        available:
          Number(sourceRow.quantityOnHand || 0) -
          Number(sourceRow.quantityReserved || 0)
      }))
      .filter((sourceRow) => sourceRow.available > 0)
      .sort((a, b) => b.available - a.available);

    let remaining = needed;
    const suggestedSources = [];
    for (const source of sortedSources) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, source.available);
      suggestedSources.push({
        binId: source.bin?._id || source.bin || null,
        binCode: source.bin?.code || null,
        zone: source.bin?.zone || null,
        quantity: take
      });
      remaining -= take;
    }

    recommendations.push({
      productId: row.product?._id || row.product || null,
      sku: row.product?.sku || null,
      productName: row.product?.name || null,
      targetBinId: bin._id || row.bin,
      targetBinCode: bin.code || null,
      currentAvailable: available,
      replenishmentMinUnits: minUnits,
      replenishmentTargetUnits: targetUnits,
      neededQuantity: needed,
      suggestedSources,
      shortfall: Math.max(remaining, 0)
    });
  }

  recommendations.sort((a, b) => b.neededQuantity - a.neededQuantity);
  return {
    count: recommendations.length,
    recommendations
  };
};

export default {
  createWarehouseBin,
  listWarehouseBins,
  getBinInventoryContents,
  getBinMovementHistory,
  allocateStockToBin,
  transferStockBetweenBins,
  transferStockBetweenWarehouses,
  listWarehouseTransfers,
  createPickTicket,
  startPickTicket,
  completePickTicket,
  listStockMovements,
  setWarehouseBinRules,
  getReplenishmentRecommendations
};
