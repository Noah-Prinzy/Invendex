import Inventory from '../../models/Inventory.js';
import InventorySnapshot from '../../models/InventorySnapshot.js';
import Product, {
  STOCK_REASONS,
  STOCK_REASON_POLICIES,
  SENSITIVE_STOCK_REASONS
} from '../../models/Product.js';
import Warehouse from '../../models/Warehouse.js';
import OrganizationSettings from '../../models/OrganizationSettings.js';
import { isRoleAllowed } from '../../authorization/permissions.js';
import { AppError } from '../../errors/AppError.js';
import { runWithMongoTransactionFallback } from '../../utils/runWithMongoTransactionFallback.js';
import { syncProductStockFromInventory } from './stockSyncService.js';
import {
  convertQuantityToBaseUnits,
  resolvePurchaseToBaseFactor,
  normalizeQuantityUnit,
  INVENTORY_QUANTITY_UNITS
} from './uomConversionService.js';
import { logAudit } from '../../utils/auditLogger.js';
import { logInventoryMutation } from '../../observability/inventoryMutationLogger.js';
import { logger } from '../../observability/logger.js';
import { publishInventoryUpdated } from '../../realtime/publisher.js';

const ORGANIZATION_ROLES = ['staff', 'manager', 'admin', 'owner'];

const normalizeRole = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const getWarehouseStrictModeDefault = () =>
  String(process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID || 'true')
    .trim()
    .toLowerCase() === 'true';

const getSensitiveAdjustmentMinRoleDefault = () => {
  const configured = normalizeRole(
    process.env.INVENTORY_SENSITIVE_REASON_MIN_ROLE
  );
  if (ORGANIZATION_ROLES.includes(configured)) {
    return configured;
  }
  return 'manager';
};

const isWarehouseStrictMode = async ({ organizationId, session = null }) => {
  const fallbackValue = getWarehouseStrictModeDefault();
  const settingsQuery = OrganizationSettings.findOne({
    organization: organizationId
  }).select('inventory.enforceWarehouseForAdjustments');
  if (session) {
    settingsQuery.session(session);
  }
  const settings = await settingsQuery.lean();
  if (
    typeof settings?.inventory?.enforceWarehouseForAdjustments === 'boolean'
  ) {
    return settings.inventory.enforceWarehouseForAdjustments;
  }
  return fallbackValue;
};

const getSensitiveAdjustmentMinRole = async ({
  organizationId,
  session = null
}) => {
  const fallbackValue = getSensitiveAdjustmentMinRoleDefault();
  const settingsQuery = OrganizationSettings.findOne({
    organization: organizationId
  }).select('inventory.sensitiveAdjustmentMinRole');
  if (session) {
    settingsQuery.session(session);
  }
  const settings = await settingsQuery.lean();
  const configured = normalizeRole(
    settings?.inventory?.sensitiveAdjustmentMinRole
  );
  if (ORGANIZATION_ROLES.includes(configured)) {
    return configured;
  }
  return fallbackValue;
};

const assertReasonDirection = ({ reason, amount }) => {
  const policy = STOCK_REASON_POLICIES[reason];
  if (!policy) {
    throw new AppError(
      `Reason must be one of: ${STOCK_REASONS.join(', ')}`,
      400
    );
  }

  if (policy.direction === 'increase' && amount < 0) {
    throw new AppError(
      `Reason "${reason}" only allows positive stock adjustments`,
      400
    );
  }

  if (policy.direction === 'decrease' && amount > 0) {
    throw new AppError(
      `Reason "${reason}" only allows negative stock adjustments`,
      400
    );
  }

  return policy;
};

const assertSensitiveReasonAccess = async ({
  organizationId,
  reason,
  actorRole = null,
  actorUserId = null,
  session = null
}) => {
  const isSensitiveReason = SENSITIVE_STOCK_REASONS.includes(reason);
  if (!isSensitiveReason) {
    return {
      isSensitiveReason: false,
      requiredRole: null
    };
  }

  const requiredRole = await getSensitiveAdjustmentMinRole({
    organizationId,
    session
  });

  const normalizedActorRole = normalizeRole(actorRole);
  if (!actorUserId && !normalizedActorRole) {
    return {
      isSensitiveReason: true,
      requiredRole
    };
  }

  if (!isRoleAllowed(normalizedActorRole, [requiredRole])) {
    throw new AppError(
      `Reason "${reason}" requires role ${requiredRole} or higher`,
      403
    );
  }

  return {
    isSensitiveReason: true,
    requiredRole
  };
};

const calculateAverageDailyUsage = (stockHistory = []) => {
  const sales = stockHistory.filter(
    (entry) => entry.reason === 'sale' && Number(entry.changeAmount || 0) < 0
  );

  if (sales.length < 2) return 0;

  const totalUnitsSold = sales.reduce(
    (sum, entry) => sum + Math.abs(Number(entry.changeAmount || 0)),
    0
  );

  const firstDate = new Date(sales[0].changedAt || sales[0].createdAt);
  const lastDate = new Date(
    sales[sales.length - 1].changedAt || sales[sales.length - 1].createdAt
  );

  const days = Math.max(
    1,
    Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24))
  );

  return Number((totalUnitsSold / days).toFixed(2));
};

const resolveSnapshotSource = (actorRole) => {
  const normalized = String(actorRole || '')
    .trim()
    .toLowerCase();

  if (['owner', 'admin', 'manager'].includes(normalized)) {
    return 'ADMIN';
  }
  if (normalized === 'staff') {
    return 'STAFF';
  }
  return 'MANUAL';
};

const resolveWarehouseForAdjustment = async ({
  organizationId,
  productId,
  warehouseId,
  session = null
}) => {
  const strictMode = await isWarehouseStrictMode({
    organizationId,
    session
  });

  if (warehouseId) {
    return {
      warehouseId,
      usedFallback: false
    };
  }

  if (strictMode) {
    throw new AppError('warehouseId is required for stock adjustment', 400);
  }

  const inventoryQuery = Inventory.findOne({
    organization: organizationId,
    product: productId
  }).sort({ quantityOnHand: -1, updatedAt: -1, createdAt: -1 });
  if (session) {
    inventoryQuery.session(session);
  }
  const inventoryRow = await inventoryQuery;
  if (inventoryRow?.warehouse) {
    logger.warn('inventory_adjustment_warehouse_fallback_used', {
      organizationId: String(organizationId),
      productId: String(productId),
      warehouseId: String(inventoryRow.warehouse),
      fallbackSource: 'inventory_record'
    });
    return {
      warehouseId: inventoryRow.warehouse,
      usedFallback: true
    };
  }

  const warehouseQuery = Warehouse.findOne({
    organization: organizationId,
    isActive: true,
    isArchived: false
  })
    .sort({ createdAt: 1, _id: 1 })
    .select('_id');
  if (session) {
    warehouseQuery.session(session);
  }
  const warehouse = await warehouseQuery;

  if (!warehouse?._id) {
    throw new AppError(
      'warehouseId is required because no organization warehouse could be resolved',
      400
    );
  }

  logger.warn('inventory_adjustment_warehouse_fallback_used', {
    organizationId: String(organizationId),
    productId: String(productId),
    warehouseId: String(warehouse._id),
    fallbackSource: 'organization_first_active_warehouse'
  });

  return {
    warehouseId: warehouse._id,
    usedFallback: true
  };
};

export const adjustInventoryFromManualInput = async ({
  organizationId,
  productId,
  amount,
  amountUnit = INVENTORY_QUANTITY_UNITS.BASE,
  reason,
  warehouseId = null,
  actorUserId = null,
  actorRole = null
}) => {
  const parsedAmount = Number(amount);
  const normalizedAmountUnit = normalizeQuantityUnit(amountUnit);
  if (!Number.isInteger(parsedAmount) || parsedAmount === 0) {
    throw new AppError(
      'Stock adjustment amount must be a non-zero integer',
      400
    );
  }

  const normalizedReason = String(reason || '')
    .trim()
    .toLowerCase();
  if (!STOCK_REASONS.includes(normalizedReason)) {
    throw new AppError(
      `Reason must be one of: ${STOCK_REASONS.join(', ')}`,
      400
    );
  }
  const reasonPolicy = assertReasonDirection({
    reason: normalizedReason,
    amount: parsedAmount
  });

  const result = await runWithMongoTransactionFallback({
    operationName: 'manual_inventory_adjustment',
    operationMeta: {
      organizationId: String(organizationId),
      productId: String(productId),
      requestedAmount: parsedAmount,
      requestedAmountUnit: normalizedAmountUnit,
      reason: normalizedReason,
      isSensitiveReason: reasonPolicy.sensitive === true,
      hasWarehouseId: Boolean(warehouseId)
    },
    runWithSession: async (session) => {
      const sensitiveAccess = await assertSensitiveReasonAccess({
        organizationId,
        reason: normalizedReason,
        actorRole,
        actorUserId,
        session
      });

      const productQuery = Product.findOne({
        _id: productId,
        organization: organizationId
      }).select('sku price stock stockHistory averageDailyUsage uom');
      if (session) {
        productQuery.session(session);
      }
      const product = await productQuery;
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      const purchaseToBaseFactor = resolvePurchaseToBaseFactor({
        product
      });
      const amountInBaseUnits = convertQuantityToBaseUnits({
        quantity: parsedAmount,
        quantityUnit: normalizedAmountUnit,
        purchaseToBaseFactor
      });
      if (!Number.isInteger(amountInBaseUnits) || amountInBaseUnits === 0) {
        throw new AppError(
          'Stock adjustment amount could not be converted to base units',
          400
        );
      }

      assertReasonDirection({
        reason: normalizedReason,
        amount: amountInBaseUnits
      });

      const resolvedWarehouse = await resolveWarehouseForAdjustment({
        organizationId,
        productId,
        warehouseId,
        session
      });

      const now = new Date();
      const adjustmentFilter = {
        organization: organizationId,
        product: productId,
        warehouse: resolvedWarehouse.warehouseId
      };

      if (amountInBaseUnits < 0) {
        adjustmentFilter.quantityOnHand = { $gte: Math.abs(amountInBaseUnits) };
      }

      const adjustmentOptions = {
        upsert: parsedAmount > 0,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      };
      if (session) {
        adjustmentOptions.session = session;
      }

      const inventory = await Inventory.findOneAndUpdate(
        adjustmentFilter,
        {
          $inc: {
            quantityOnHand: amountInBaseUnits
          },
          $set: {
            lastMovementAt: now
          },
          $setOnInsert: {
            quantityReserved: 0,
            reorderPoint: 0,
            reorderQuantity: 0
          }
        },
        adjustmentOptions
      );

      if (!inventory) {
        throw new AppError('Insufficient inventory for this adjustment', 409);
      }

      const previousProductStock = Number(product.stock || 0);
      const stockSync = await syncProductStockFromInventory({
        organizationId,
        productId,
        session
      });
      const newProductStock = Number(stockSync.stock || 0);

      const historyUpdateOptions = {
        new: true,
        runValidators: true
      };
      if (session) {
        historyUpdateOptions.session = session;
      }

      let updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          organization: organizationId
        },
        {
          $push: {
            stockHistory: {
              $each: [
                {
                  previousStock: previousProductStock,
                  newStock: newProductStock,
                  changeAmount: amountInBaseUnits,
                  reason: normalizedReason,
                  changedBy: actorUserId,
                  changedAt: now
                }
              ],
              $slice: -100
            }
          }
        },
        historyUpdateOptions
      );

      if (normalizedReason === 'sale' && updatedProduct) {
        updatedProduct.averageDailyUsage = calculateAverageDailyUsage(
          updatedProduct.stockHistory || []
        );
        await updatedProduct.save(session ? { session } : undefined);
      }

      const snapshotPayload = {
        organization: organizationId,
        product: productId,
        warehouse: resolvedWarehouse.warehouseId,
        sku: product.sku,
        stock: newProductStock,
        price: product.price,
        recordedAt: now,
        source: resolveSnapshotSource(actorRole)
      };
      if (session) {
        await InventorySnapshot.create([snapshotPayload], { session });
      } else {
        await InventorySnapshot.create(snapshotPayload);
      }

      await logAudit({
        action: 'ADJUST_PRODUCT_STOCK',
        entity: 'PRODUCT',
        entityId: productId,
        organizationId,
        source: 'system',
        success: true,
        meta: {
          warehouseId: String(resolvedWarehouse.warehouseId),
          amount: amountInBaseUnits,
          requestedAmount: parsedAmount,
          requestedAmountUnit: normalizedAmountUnit,
          purchaseToBaseFactor,
          reason: normalizedReason,
          isSensitiveReason: sensitiveAccess.isSensitiveReason,
          sensitiveAdjustmentMinRole: sensitiveAccess.requiredRole,
          usedWarehouseFallback: resolvedWarehouse.usedFallback,
          actorUserId: actorUserId ? String(actorUserId) : null
        },
        session,
        silent: true
      });

      logInventoryMutation({
        operation: 'manual_stock_adjustment',
        organizationId,
        warehouseId: resolvedWarehouse.warehouseId,
        productId,
        quantityDelta: amountInBaseUnits,
        quantityOnHand: inventory.quantityOnHand,
        quantityReserved: inventory.quantityReserved,
        sourceType: 'MANUAL',
        actorUserId,
        metadata: {
          reason: normalizedReason,
          requestedAmount: parsedAmount,
          requestedAmountUnit: normalizedAmountUnit,
          purchaseToBaseFactor,
          usedWarehouseFallback: resolvedWarehouse.usedFallback
        }
      });

      return {
        product: updatedProduct,
        inventory,
        warehouseId: resolvedWarehouse.warehouseId,
        usedWarehouseFallback: resolvedWarehouse.usedFallback,
        amount: amountInBaseUnits,
        requestedAmount: parsedAmount,
        requestedAmountUnit: normalizedAmountUnit,
        purchaseToBaseFactor,
        reason: normalizedReason,
        isSensitiveReason: sensitiveAccess.isSensitiveReason,
        sensitiveAdjustmentMinRole: sensitiveAccess.requiredRole,
        productStock: newProductStock
      };
    }
  });

  publishInventoryUpdated({
    organizationId,
    actorUserId,
    warehouseId: result.warehouseId,
    entityId: productId,
    data: {
      source: 'manual_stock_adjustment',
      amount: result.amount,
      requestedAmount: result.requestedAmount,
      requestedAmountUnit: result.requestedAmountUnit,
      purchaseToBaseFactor: result.purchaseToBaseFactor,
      reason: result.reason,
      isSensitiveReason: result.isSensitiveReason,
      sensitiveAdjustmentMinRole: result.sensitiveAdjustmentMinRole,
      warehouseId: String(result.warehouseId),
      usedWarehouseFallback: result.usedWarehouseFallback,
      productStock: result.productStock
    }
  });

  return result;
};

export default {
  adjustInventoryFromManualInput
};
