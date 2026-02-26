import mongoose from 'mongoose';
import BinInventory from '../models/BinInventory.js';
import Inventory from '../models/Inventory.js';
import InventoryBatch from '../models/InventoryBatch.js';
import InventorySerial from '../models/InventorySerial.js';
import PickTicket from '../models/PickTicket.js';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import Warehouse from '../models/Warehouse.js';
import WarehouseBin from '../models/WarehouseBin.js';
import {
  consumeOutboundTracking,
  reserveInventorySerials
} from './inventory/trackingService.js';
import { AppError } from '../errors/AppError.js';
import { logInventoryMutation } from '../observability/inventoryMutationLogger.js';

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

const ensureWarehouseInOrganization = async (organizationId, warehouseId) => {
  const warehouse = await Warehouse.findOne({
    _id: warehouseId,
    organization: organizationId,
    isActive: true,
    isArchived: false
  }).select('_id');

  if (!warehouse) {
    throw new AppError('Warehouse not found in your organization', 404);
  }
};

const ensureBinInWarehouse = async ({ organizationId, warehouseId, binId }) => {
  const bin = await WarehouseBin.findOne({
    _id: binId,
    organization: organizationId,
    warehouse: warehouseId,
    isActive: true
  });

  if (!bin) {
    throw new AppError('Bin not found in the selected warehouse', 404);
  }

  return bin;
};

const getBinTotalOnHand = async ({ organizationId, warehouseId, binId }) => {
  const rows = await BinInventory.aggregate([
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

  return rows[0]?.totalOnHand || 0;
};

const assertBinCapacity = async ({
  organizationId,
  warehouseId,
  bin,
  incomingQuantity
}) => {
  const maxCapacityUnits =
    bin.maxCapacityUnits == null ? null : Number(bin.maxCapacityUnits);
  if (maxCapacityUnits == null) return;

  const currentOnHand = await getBinTotalOnHand({
    organizationId,
    warehouseId,
    binId: bin._id
  });

  if (currentOnHand + incomingQuantity > maxCapacityUnits) {
    throw new AppError(
      `Bin capacity exceeded. Current ${currentOnHand}, incoming ${incomingQuantity}, max ${maxCapacityUnits}`,
      409
    );
  }
};

const getFefoBatches = async ({ organizationId, warehouseId, productId }) => {
  const batches = await InventoryBatch.find({
    organization: organizationId,
    warehouse: warehouseId,
    product: productId,
    isRecalled: false
  });

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
  productId
}) => {
  const rows = await BinInventory.aggregate([
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
  await ensureWarehouseInOrganization(organizationId, warehouseId);
  const bin = await ensureBinInWarehouse({
    organizationId,
    warehouseId,
    binId
  });

  const product = await Product.findOne({
    _id: productId,
    organization: organizationId
  }).select('_id sku name');
  if (!product) {
    throw new AppError('Product not found in your organization', 404);
  }

  const inventory = await Inventory.findOne({
    organization: organizationId,
    warehouse: warehouseId,
    product: productId
  });

  if (!inventory || inventory.quantityOnHand <= 0) {
    throw new AppError(
      'No warehouse inventory available for this product',
      400
    );
  }

  const binnedQty = await getBinnedQuantity({
    organizationId,
    warehouseId,
    productId
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
    incomingQuantity: qty
  });

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
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );

  await StockMovement.create({
    organization: organizationId,
    movementType: 'ALLOCATION',
    product: productId,
    quantity: qty,
    warehouseTo: warehouseId,
    binTo: binId,
    reason,
    referenceType: 'MANUAL',
    movedBy
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

  await ensureWarehouseInOrganization(organizationId, warehouseId);
  await ensureBinInWarehouse({ organizationId, warehouseId, binId: fromBinId });
  const toBin = await ensureBinInWarehouse({
    organizationId,
    warehouseId,
    binId: toBinId
  });

  const fromInventory = await BinInventory.findOne({
    organization: organizationId,
    warehouse: warehouseId,
    bin: fromBinId,
    product: productId
  });

  if (!fromInventory) {
    throw new AppError('No stock found in source bin', 404);
  }

  const available =
    fromInventory.quantityOnHand - fromInventory.quantityReserved;
  if (available < qty) {
    throw new AppError(
      `Only ${Math.max(available, 0)} units are available in the source bin`,
      409
    );
  }

  await assertBinCapacity({
    organizationId,
    warehouseId,
    bin: toBin,
    incomingQuantity: qty
  });

  fromInventory.quantityOnHand -= qty;
  await fromInventory.save();

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
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );

  await StockMovement.create({
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

  await ensureWarehouseInOrganization(organizationId, warehouseId);

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
      productId
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
      const serialRows = await InventorySerial.find({
        organization: organizationId,
        warehouse: warehouseId,
        product: productId,
        status: 'AVAILABLE',
        ...(lotNumber ? { lotNumber } : {})
      })
        .sort({ expiryDate: 1, receivedAt: 1, createdAt: 1 })
        .limit(requestedQty);

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
      const matchingSerialCount = await InventorySerial.countDocuments({
        organization: organizationId,
        warehouse: warehouseId,
        product: productId,
        status: 'AVAILABLE',
        serialNumber: { $in: serialNumbers },
        ...(lotNumber ? { lotNumber } : {})
      });

      if (matchingSerialCount !== serialNumbers.length) {
        throw new AppError(
          'One or more serialNumbers are not AVAILABLE for picking',
          409
        );
      }
    }

    const binStocks = await BinInventory.find({
      organization: organizationId,
      warehouse: warehouseId,
      product: productId,
      quantityOnHand: { $gt: 0 }
    }).sort({ quantityOnHand: -1 });

    let remaining = requestedQty;
    const allocations = [];

    for (const binStock of binStocks) {
      const available = binStock.quantityOnHand - binStock.quantityReserved;
      if (available <= 0) continue;

      const allocated = Math.min(remaining, available);
      if (allocated <= 0) continue;

      binStock.quantityReserved += allocated;
      await binStock.save();

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

    await Inventory.findOneAndUpdate(
      {
        organization: organizationId,
        warehouse: warehouseId,
        product: productId
      },
      {
        $inc: { quantityReserved: requestedQty }
      }
    );

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

  return PickTicket.create({
    organization: organizationId,
    warehouse: warehouseId,
    items: normalizedItems,
    notes,
    createdBy
  });
};

export const startPickTicket = async ({ organizationId, ticketId }) => {
  const ticket = await PickTicket.findOne({
    _id: ticketId,
    organization: organizationId
  });

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
      referenceId: ticket._id
    });
  }

  ticket.status = 'PICKING';
  ticket.startedAt = new Date();
  await ticket.save();

  return ticket;
};

export const completePickTicket = async ({
  organizationId,
  ticketId,
  movedBy = null
}) => {
  const ticket = await PickTicket.findOne({
    _id: ticketId,
    organization: organizationId
  });

  if (!ticket) {
    throw new AppError('Pick ticket not found', 404);
  }

  if (!['CREATED', 'PICKING'].includes(ticket.status)) {
    throw new AppError('Only CREATED or PICKING tickets can be completed', 409);
  }

  for (const item of ticket.items) {
    for (const allocation of item.allocations) {
      const binInventory = await BinInventory.findOne({
        organization: organizationId,
        warehouse: ticket.warehouse,
        bin: allocation.bin,
        product: item.product
      });

      if (
        !binInventory ||
        binInventory.quantityReserved < allocation.quantity
      ) {
        throw new AppError(
          'Reserved bin stock is inconsistent for pick completion',
          409
        );
      }

      if (binInventory.quantityOnHand < allocation.quantity) {
        throw new AppError(
          'Bin stock is insufficient to complete the pick',
          409
        );
      }

      binInventory.quantityOnHand -= allocation.quantity;
      binInventory.quantityReserved -= allocation.quantity;
      await binInventory.save();

      await StockMovement.create({
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
      });
    }

    const inventory = await Inventory.findOneAndUpdate(
      {
        organization: organizationId,
        warehouse: ticket.warehouse,
        product: item.product
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
      { runValidators: true, new: true }
    );

    if (inventory) {
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
    }

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
      reason: 'Pick ticket packed'
    });

    item.pickedQuantity = item.requestedQuantity;
  }

  ticket.status = 'PACKED';
  ticket.packedAt = new Date();
  await ticket.save();

  return ticket;
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
  await ensureWarehouseInOrganization(organizationId, warehouseId);

  const bin = await WarehouseBin.findOne({
    _id: binId,
    organization: organizationId,
    warehouse: warehouseId
  });
  if (!bin) {
    throw new AppError('Bin not found in the selected warehouse', 404);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'maxCapacityUnits')) {
    bin.maxCapacityUnits = normalizeOptionalPositiveInteger(
      input.maxCapacityUnits,
      'maxCapacityUnits'
    );
  }
  if (Object.prototype.hasOwnProperty.call(input, 'replenishmentMinUnits')) {
    bin.replenishmentMinUnits = normalizeOptionalPositiveInteger(
      input.replenishmentMinUnits,
      'replenishmentMinUnits'
    );
  }
  if (Object.prototype.hasOwnProperty.call(input, 'replenishmentTargetUnits')) {
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

  await bin.save();
  return bin;
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
  allocateStockToBin,
  transferStockBetweenBins,
  createPickTicket,
  startPickTicket,
  completePickTicket,
  listStockMovements,
  setWarehouseBinRules,
  getReplenishmentRecommendations
};
