import Inventory from '../../models/Inventory.js';
import StocktakeSession from '../../models/StocktakeSession.js';
import Warehouse from '../../models/Warehouse.js';
import { AppError } from '../../errors/AppError.js';
import { adjustInventoryFromManualInput } from './manualAdjustmentService.js';

const normalizeStatusFilter = (value) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();

  if (!normalized) return '';
  if (['OPEN', 'IN_REVIEW', 'APPROVED', 'CANCELLED'].includes(normalized)) {
    return normalized;
  }
  return '';
};

const toObjectIdString = (value) => String(value || '').trim();

export const createStocktakeSession = async ({
  organizationId,
  warehouseId,
  title,
  notes = '',
  productIds = [],
  createdBy
}) => {
  const warehouse = await Warehouse.findOne({
    _id: warehouseId,
    organization: organizationId,
    isActive: true,
    isArchived: false
  })
    .select('_id name')
    .lean();

  if (!warehouse) {
    throw new AppError('Warehouse not found or inactive', 404);
  }

  const normalizedProductIds = Array.isArray(productIds)
    ? productIds.map(toObjectIdString).filter(Boolean)
    : [];

  const inventoryFilter = {
    organization: organizationId,
    warehouse: warehouseId
  };
  if (normalizedProductIds.length) {
    inventoryFilter.product = { $in: normalizedProductIds };
  }

  const inventoryRows = await Inventory.find(inventoryFilter)
    .populate('product', 'name sku isActive organization')
    .sort({ updatedAt: -1, _id: 1 });

  const lines = inventoryRows
    .filter((row) => row?.product && row.product.isActive !== false)
    .map((row) => ({
      product: row.product._id,
      sku: String(row.product.sku || '').trim(),
      productName: String(row.product.name || '').trim(),
      expectedQuantity: Math.max(0, Number(row.quantityOnHand || 0)),
      countedQuantity: null,
      variance: null,
      countedBy: null,
      countedAt: null
    }))
    .filter((line) => line.sku && line.productName);

  if (!lines.length) {
    throw new AppError(
      'No inventory records found for stocktake scope in this warehouse',
      400
    );
  }

  const session = await StocktakeSession.create({
    organization: organizationId,
    warehouse: warehouseId,
    title:
      String(title || '').trim() ||
      `Stocktake ${new Date().toISOString().slice(0, 10)} - ${warehouse.name}`,
    notes: String(notes || '').trim(),
    status: 'OPEN',
    lines,
    createdBy,
    approvedBy: null,
    approvedAt: null,
    appliedAdjustments: []
  });

  return session;
};

export const listStocktakeSessions = async ({
  organizationId,
  warehouseId = null,
  status = null,
  limit = 50
}) => {
  const safeLimit = Math.min(Math.max(Number(limit || 50), 1), 200);
  const filter = {
    organization: organizationId
  };

  if (warehouseId) {
    filter.warehouse = warehouseId;
  }

  const normalizedStatus = normalizeStatusFilter(status);
  if (normalizedStatus) {
    filter.status = normalizedStatus;
  }

  return StocktakeSession.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(safeLimit)
    .select(
      'warehouse title status totalLines countedLines varianceLines totalAbsoluteVariance createdBy approvedBy approvedAt createdAt updatedAt'
    )
    .populate('warehouse', 'name code')
    .populate('createdBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .lean();
};

export const getStocktakeSessionById = async ({
  organizationId,
  stocktakeSessionId
}) => {
  const session = await StocktakeSession.findOne({
    _id: stocktakeSessionId,
    organization: organizationId
  })
    .populate('warehouse', 'name code')
    .populate('createdBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .lean();

  if (!session) {
    throw new AppError('Stocktake session not found', 404);
  }

  return session;
};

export const submitStocktakeCounts = async ({
  organizationId,
  stocktakeSessionId,
  counts,
  actorUserId
}) => {
  const session = await StocktakeSession.findOne({
    _id: stocktakeSessionId,
    organization: organizationId
  });

  if (!session) {
    throw new AppError('Stocktake session not found', 404);
  }

  if (
    !['OPEN', 'IN_REVIEW'].includes(String(session.status || '').toUpperCase())
  ) {
    throw new AppError(
      'Only OPEN/IN_REVIEW stocktake sessions can be updated',
      409
    );
  }

  const safeCounts = Array.isArray(counts) ? counts : [];
  if (!safeCounts.length) {
    throw new AppError('At least one count entry is required', 400);
  }

  const lineIndexByProduct = new Map(
    (session.lines || []).map((line, index) => [String(line.product), index])
  );

  const now = new Date();
  for (const item of safeCounts) {
    const productId = String(item?.productId || '').trim();
    const countedQuantity = Number(item?.countedQuantity);

    if (!productId) {
      throw new AppError('counts[].productId is required', 400);
    }
    if (!Number.isInteger(countedQuantity) || countedQuantity < 0) {
      throw new AppError(
        'counts[].countedQuantity must be a non-negative integer',
        400
      );
    }

    const lineIndex = lineIndexByProduct.get(productId);
    if (lineIndex === undefined) {
      throw new AppError(
        `Product ${productId} is not in this stocktake scope`,
        400
      );
    }

    const line = session.lines[lineIndex];
    line.countedQuantity = countedQuantity;
    line.variance = countedQuantity - Number(line.expectedQuantity || 0);
    line.countedBy = actorUserId || null;
    line.countedAt = now;
  }

  const hasCountedLines = (session.lines || []).some((line) =>
    Number.isFinite(Number(line.countedQuantity))
  );
  session.status = hasCountedLines ? 'IN_REVIEW' : 'OPEN';

  await session.save();
  return session;
};

export const approveStocktakeSession = async ({
  organizationId,
  stocktakeSessionId,
  actorUserId,
  actorRole
}) => {
  const session = await StocktakeSession.findOne({
    _id: stocktakeSessionId,
    organization: organizationId
  });

  if (!session) {
    throw new AppError('Stocktake session not found', 404);
  }

  if (String(session.status || '').toUpperCase() === 'APPROVED') {
    return session;
  }

  if (String(session.status || '').toUpperCase() === 'CANCELLED') {
    throw new AppError('Cannot approve a cancelled stocktake session', 409);
  }

  const countedLines = (session.lines || []).filter((line) =>
    Number.isFinite(Number(line.countedQuantity))
  );

  if (!countedLines.length) {
    throw new AppError('No counted lines available to approve', 400);
  }

  const inventoryRows = await Inventory.find({
    organization: organizationId,
    warehouse: session.warehouse,
    product: {
      $in: countedLines.map((line) => line.product)
    }
  })
    .select('product quantityOnHand')
    .lean();

  const inventoryByProduct = new Map(
    inventoryRows.map((row) => [
      String(row.product),
      Number(row.quantityOnHand || 0)
    ])
  );

  const appliedAdjustments = [];
  for (const line of countedLines) {
    const productId = String(line.product);
    const currentQuantity = Number(inventoryByProduct.get(productId) || 0);
    const countedQuantity = Number(line.countedQuantity || 0);
    const adjustmentDelta = countedQuantity - currentQuantity;

    if (adjustmentDelta === 0) {
      continue;
    }

    await adjustInventoryFromManualInput({
      organizationId,
      productId,
      amount: adjustmentDelta,
      reason: 'adjustment',
      warehouseId: session.warehouse,
      actorUserId,
      actorRole
    });

    appliedAdjustments.push({
      product: line.product,
      sku: line.sku,
      expectedQuantity: Number(line.expectedQuantity || 0),
      currentQuantity,
      countedQuantity,
      appliedDelta: adjustmentDelta
    });
  }

  session.status = 'APPROVED';
  session.approvedBy = actorUserId || null;
  session.approvedAt = new Date();
  session.appliedAdjustments = appliedAdjustments;
  await session.save();

  return session;
};

export default {
  createStocktakeSession,
  listStocktakeSessions,
  getStocktakeSessionById,
  submitStocktakeCounts,
  approveStocktakeSession
};
