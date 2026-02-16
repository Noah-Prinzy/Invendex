import mongoose from 'mongoose';
import BinInventory from '../models/BinInventory.js';
import Inventory from '../models/Inventory.js';
import PickTicket from '../models/PickTicket.js';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import Warehouse from '../models/Warehouse.js';
import WarehouseBin from '../models/WarehouseBin.js';
import { AppError } from '../errors/AppError.js';

const toObjectId = value => new mongoose.Types.ObjectId(value);

const ensurePositiveInteger = (value, label) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${label} must be a positive integer`, 400);
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

const getBinnedQuantity = async ({ organizationId, warehouseId, productId }) => {
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
  binType = 'STORAGE'
}) => {
  if (!code) {
    throw new AppError('Bin code is required', 400);
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
    binType
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
  await ensureBinInWarehouse({ organizationId, warehouseId, binId });

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
    throw new AppError('No warehouse inventory available for this product', 400);
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
  await ensureBinInWarehouse({ organizationId, warehouseId, binId: toBinId });

  const fromInventory = await BinInventory.findOne({
    organization: organizationId,
    warehouse: warehouseId,
    bin: fromBinId,
    product: productId
  });

  if (!fromInventory) {
    throw new AppError('No stock found in source bin', 404);
  }

  const available = fromInventory.quantityOnHand - fromInventory.quantityReserved;
  if (available < qty) {
    throw new AppError(
      `Only ${Math.max(available, 0)} units are available in the source bin`,
      409
    );
  }

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

    normalizedItems.push({
      product: productId,
      requestedQuantity: requestedQty,
      pickedQuantity: 0,
      allocations
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

      if (!binInventory || binInventory.quantityReserved < allocation.quantity) {
        throw new AppError('Reserved bin stock is inconsistent for pick completion', 409);
      }

      if (binInventory.quantityOnHand < allocation.quantity) {
        throw new AppError('Bin stock is insufficient to complete the pick', 409);
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

    await Inventory.findOneAndUpdate(
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
      { runValidators: true }
    );

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

export default {
  createWarehouseBin,
  listWarehouseBins,
  allocateStockToBin,
  transferStockBetweenBins,
  createPickTicket,
  startPickTicket,
  completePickTicket,
  listStockMovements
};
