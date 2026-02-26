import Inventory from '../../models/Inventory.js';
import OfflineSyncMutation from '../../models/OfflineSyncMutation.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import PurchaseOrder from '../../models/PurchaseOrder.js';
import { AppError } from '../../errors/AppError.js';
import { adjustInventoryFromManualInput } from '../inventory/manualAdjustmentService.js';

const MAX_SYNC_LIMIT = 500;
const DEFAULT_SYNC_LIMIT = 200;

const parseLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SYNC_LIMIT;
  return Math.min(Math.floor(parsed), MAX_SYNC_LIMIT);
};

const parseDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const buildSyncMatch = ({ organizationId, since }) => {
  const match = {
    organization: organizationId
  };
  if (since) {
    match.updatedAt = { $gt: since };
  }
  return match;
};

const applyMutation = async ({
  organizationId,
  mutation,
  actorUserId = null,
  actorRole = null
}) => {
  const mutationType = String(mutation?.type || '').trim();
  const payload = mutation?.payload || {};

  if (!mutationType) {
    throw new AppError('mutation.type is required', 400);
  }

  if (mutationType === 'inventory.adjust') {
    const result = await adjustInventoryFromManualInput({
      organizationId,
      productId: payload.productId,
      amount: payload.amount,
      reason: payload.reason,
      warehouseId: payload.warehouseId,
      actorUserId,
      actorRole
    });

    return {
      type: mutationType,
      status: 'APPLIED',
      data: {
        productId: payload.productId,
        warehouseId: String(result.warehouseId),
        amount: Number(payload.amount || 0),
        reason: payload.reason
      }
    };
  }

  throw new AppError(`Unsupported mobile mutation type: ${mutationType}`, 400);
};

export const getSyncBootstrap = async ({
  organizationId,
  since = null,
  limit = DEFAULT_SYNC_LIMIT,
  warehouseId = null
}) => {
  const parsedSince = parseDateOrNull(since);
  const parsedLimit = parseLimit(limit);

  const inventoryMatch = buildSyncMatch({
    organizationId,
    since: parsedSince
  });
  if (warehouseId) {
    inventoryMatch.warehouse = warehouseId;
  }

  const [products, inventory, purchaseOrders, orders] = await Promise.all([
    Product.find(buildSyncMatch({ organizationId, since: parsedSince }))
      .sort({ updatedAt: -1 })
      .limit(parsedLimit)
      .select(
        '_id name sku price stock lowStockThreshold category isActive updatedAt'
      )
      .lean(),
    Inventory.find(inventoryMatch)
      .sort({ updatedAt: -1 })
      .limit(parsedLimit)
      .select(
        '_id product warehouse quantityOnHand quantityReserved reorderPoint reorderQuantity lastMovementAt updatedAt'
      )
      .lean(),
    PurchaseOrder.find(buildSyncMatch({ organizationId, since: parsedSince }))
      .sort({ updatedAt: -1 })
      .limit(parsedLimit)
      .select('_id poNumber supplier warehouse status items updatedAt')
      .lean(),
    Order.find(buildSyncMatch({ organizationId, since: parsedSince }))
      .sort({ updatedAt: -1 })
      .limit(parsedLimit)
      .select(
        '_id type status warehouse products subtotalRevenue totalTax updatedAt'
      )
      .lean()
  ]);

  return {
    since: parsedSince ? parsedSince.toISOString() : null,
    generatedAt: new Date().toISOString(),
    nextSyncCursor: new Date().toISOString(),
    limits: {
      requested: Number(limit || DEFAULT_SYNC_LIMIT),
      applied: parsedLimit
    },
    datasets: {
      products,
      inventory,
      purchaseOrders,
      orders
    }
  };
};

export const applyOfflineMutations = async ({
  organizationId,
  deviceId,
  mutations = [],
  actorUserId = null,
  actorRole = null
}) => {
  const normalizedDeviceId = String(deviceId || '').trim();
  if (!normalizedDeviceId) {
    throw new AppError('deviceId is required', 400);
  }

  if (!Array.isArray(mutations) || mutations.length === 0) {
    throw new AppError('mutations must be a non-empty array', 400);
  }

  const results = [];

  for (const mutation of mutations) {
    const mutationId = String(mutation?.mutationId || '').trim();
    if (!mutationId) {
      throw new AppError('Each mutation must include mutationId', 400);
    }

    const existing = await OfflineSyncMutation.findOne({
      organization: organizationId,
      deviceId: normalizedDeviceId,
      mutationId
    }).lean();

    if (existing) {
      results.push({
        mutationId,
        deduplicated: true,
        status: existing.status,
        result: existing.result,
        errorMessage: existing.errorMessage || null
      });
      continue;
    }

    try {
      const applied = await applyMutation({
        organizationId,
        mutation,
        actorUserId,
        actorRole
      });

      await OfflineSyncMutation.create({
        organization: organizationId,
        deviceId: normalizedDeviceId,
        mutationId,
        mutationType: String(mutation.type || '').trim(),
        payload: mutation.payload || {},
        status: 'APPLIED',
        result: applied,
        actorUserId
      });

      results.push({
        mutationId,
        deduplicated: false,
        status: 'APPLIED',
        result: applied
      });
    } catch (error) {
      await OfflineSyncMutation.create({
        organization: organizationId,
        deviceId: normalizedDeviceId,
        mutationId,
        mutationType: String(mutation.type || '').trim() || 'UNKNOWN',
        payload: mutation.payload || {},
        status: 'FAILED',
        errorMessage: error?.message || 'Unknown mutation error',
        actorUserId
      });

      results.push({
        mutationId,
        deduplicated: false,
        status: 'FAILED',
        errorMessage: error?.message || 'Unknown mutation error'
      });
    }
  }

  return {
    deviceId: normalizedDeviceId,
    count: results.length,
    appliedCount: results.filter((row) => row.status === 'APPLIED').length,
    failedCount: results.filter((row) => row.status === 'FAILED').length,
    deduplicatedCount: results.filter((row) => row.deduplicated).length,
    results
  };
};

export default {
  getSyncBootstrap,
  applyOfflineMutations
};
