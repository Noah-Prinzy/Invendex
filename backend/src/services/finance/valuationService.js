import Inventory from '../../models/Inventory.js';
import InventoryCostLayer from '../../models/InventoryCostLayer.js';
import InventoryValuationConfig, {
  VALUATION_METHODS
} from '../../models/InventoryValuationConfig.js';
import Product from '../../models/Product.js';
import { AppError } from '../../errors/AppError.js';

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const normalizeMethod = method => {
  const normalized = String(method || '').trim().toUpperCase();
  return VALUATION_METHODS.includes(normalized) ? normalized : null;
};

const getSortedLayers = async ({
  organizationId,
  productId,
  warehouseId,
  method,
  session = null
}) => {
  const query = {
    organization: organizationId,
    product: productId,
    warehouse: warehouseId,
    quantityRemaining: { $gt: 0 }
  };

  const sort =
    method === 'LIFO'
      ? { receivedAt: -1, createdAt: -1 }
      : { receivedAt: 1, createdAt: 1 };

  const cursor = InventoryCostLayer.find(query).sort(sort);
  if (session) {
    cursor.session(session);
  }
  return cursor;
};

const getLayerTotals = layers => {
  const totalQuantity = layers.reduce(
    (sum, layer) => sum + Number(layer.quantityRemaining || 0),
    0
  );
  const totalValue = layers.reduce(
    (sum, layer) =>
      sum + Number(layer.quantityRemaining || 0) * Number(layer.unitCost || 0),
    0
  );
  return {
    totalQuantity,
    totalValue
  };
};

const estimateCostForQuantity = ({
  layers,
  quantity,
  method
}) => {
  if (quantity <= 0) {
    return {
      totalCost: 0,
      unitCost: 0
    };
  }

  const { totalQuantity, totalValue } = getLayerTotals(layers);
  if (totalQuantity <= 0) {
    return {
      totalCost: 0,
      unitCost: 0
    };
  }

  if (method === 'WEIGHTED_AVG') {
    const weightedUnit = totalValue / totalQuantity;
    return {
      totalCost: roundMoney(weightedUnit * quantity),
      unitCost: roundMoney(weightedUnit)
    };
  }

  let remaining = quantity;
  let totalCost = 0;
  for (const layer of layers) {
    if (remaining <= 0) break;
    const takeQty = Math.min(remaining, Number(layer.quantityRemaining || 0));
    totalCost += takeQty * Number(layer.unitCost || 0);
    remaining -= takeQty;
  }

  return {
    totalCost: roundMoney(totalCost),
    unitCost: roundMoney(totalCost / quantity)
  };
};

export const getOrCreateValuationConfig = async organizationId => {
  const existing = await InventoryValuationConfig.findOne({
    organization: organizationId
  });
  if (existing) return existing;

  return InventoryValuationConfig.create({
    organization: organizationId,
    defaultMethod: 'WEIGHTED_AVG',
    allowMethodOverride: true
  });
};

export const getEffectiveMethod = async (organizationId, overrideMethod = null) => {
  const config = await getOrCreateValuationConfig(organizationId);
  const normalizedOverride = normalizeMethod(overrideMethod);

  if (
    normalizedOverride &&
    config.allowMethodOverride
  ) {
    return normalizedOverride;
  }

  return normalizeMethod(config.defaultMethod) || 'WEIGHTED_AVG';
};

export const setDefaultValuationMethod = async ({
  organizationId,
  defaultMethod,
  allowMethodOverride
}) => {
  const normalizedDefault = normalizeMethod(defaultMethod);
  if (!normalizedDefault) {
    throw new AppError('Invalid valuation method', 400);
  }

  const update = {
    defaultMethod: normalizedDefault
  };
  if (typeof allowMethodOverride === 'boolean') {
    update.allowMethodOverride = allowMethodOverride;
  }

  return InventoryValuationConfig.findOneAndUpdate(
    { organization: organizationId },
    { $set: update, $setOnInsert: { organization: organizationId } },
    { upsert: true, new: true, runValidators: true }
  );
};

export const addCostLayerFromReceipt = async ({
  organizationId,
  productId,
  warehouseId,
  sourceType = 'PURCHASE_ORDER',
  sourceId = null,
  unitCost,
  quantity,
  receivedAt = new Date(),
  session = null
}) => {
  const safeUnitCost = Number(unitCost);
  const safeQuantity = Number(quantity);

  if (!Number.isFinite(safeUnitCost) || safeUnitCost < 0) {
    throw new AppError('unitCost must be a non-negative number', 400);
  }

  if (!Number.isFinite(safeQuantity) || safeQuantity <= 0) {
    throw new AppError('quantity must be a positive number', 400);
  }

  const payload = {
    organization: organizationId,
    product: productId,
    warehouse: warehouseId,
    sourceType,
    sourceId,
    unitCost: roundMoney(safeUnitCost),
    quantityReceived: safeQuantity,
    quantityRemaining: safeQuantity,
    receivedAt
  };

  if (session) {
    const rows = await InventoryCostLayer.create([payload], { session });
    return rows[0];
  }

  return InventoryCostLayer.create(payload);
};

export const consumeCostLayers = async ({
  organizationId,
  productId,
  warehouseId,
  quantity,
  method,
  session = null
}) => {
  const safeQuantity = Number(quantity);
  if (!Number.isFinite(safeQuantity) || safeQuantity <= 0) {
    throw new AppError('quantity must be a positive number', 400);
  }

  const normalizedMethod = normalizeMethod(method);
  if (!normalizedMethod) {
    throw new AppError('Invalid valuation method', 400);
  }

  let layers;
  try {
    layers = await getSortedLayers({
      organizationId,
      productId,
      warehouseId,
      method: normalizedMethod,
      session
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        scope: 'finance',
        message: 'load_cost_layers_failed',
        organizationId: String(organizationId),
        productId: String(productId),
        warehouseId: String(warehouseId),
        valuationMethod: normalizedMethod,
        error: err.message,
        occurredAt: new Date().toISOString()
      })
    );
    throw err;
  }

  const { totalQuantity, totalValue } = getLayerTotals(layers);
  if (totalQuantity < safeQuantity) {
    throw new AppError(
      `Insufficient cost layers for product ${productId} in warehouse ${warehouseId}`,
      409
    );
  }

  const consumedLayers = [];
  let totalCost = 0;
  let remaining = safeQuantity;

  if (normalizedMethod === 'WEIGHTED_AVG') {
    const weightedUnitCost = totalValue / totalQuantity;

    for (const layer of layers) {
      if (remaining <= 0) break;
      const takeQty = Math.min(remaining, Number(layer.quantityRemaining || 0));
      if (takeQty <= 0) continue;

      layer.quantityRemaining = Number(layer.quantityRemaining || 0) - takeQty;
      await layer.save({ session });

      const lineCost = roundMoney(takeQty * weightedUnitCost);
      consumedLayers.push({
        layerId: layer._id,
        quantity: takeQty,
        unitCost: roundMoney(weightedUnitCost),
        lineCost
      });
      totalCost += lineCost;
      remaining -= takeQty;
    }
  } else {
    for (const layer of layers) {
      if (remaining <= 0) break;
      const takeQty = Math.min(remaining, Number(layer.quantityRemaining || 0));
      if (takeQty <= 0) continue;

      layer.quantityRemaining = Number(layer.quantityRemaining || 0) - takeQty;
      await layer.save({ session });

      const unitCost = Number(layer.unitCost || 0);
      const lineCost = roundMoney(takeQty * unitCost);
      consumedLayers.push({
        layerId: layer._id,
        quantity: takeQty,
        unitCost: roundMoney(unitCost),
        lineCost
      });

      totalCost += lineCost;
      remaining -= takeQty;
    }
  }

  totalCost = roundMoney(totalCost);
  return {
    valuationMethod: normalizedMethod,
    quantityConsumed: safeQuantity,
    totalCost,
    unitCost: roundMoney(totalCost / safeQuantity),
    consumedLayers
  };
};

export const computeInventoryValuation = async ({
  organizationId,
  warehouseId = null,
  method = null
}) => {
  const effectiveMethod = await getEffectiveMethod(organizationId, method);
  const query = {
    organization: organizationId,
    quantityOnHand: { $gt: 0 }
  };
  if (warehouseId) {
    query.warehouse = warehouseId;
  }

  const inventories = await Inventory.find(query)
    .populate('product', 'name sku price')
    .populate('warehouse', 'name code')
    .lean();

  let totalInventoryValue = 0;
  const byProduct = [];

  for (const inventory of inventories) {
    const quantity = Number(inventory.quantityOnHand || 0);
    if (quantity <= 0) continue;

    const layers = await getSortedLayers({
      organizationId,
      productId: inventory.product._id,
      warehouseId: inventory.warehouse._id,
      method: effectiveMethod
    });

    let valuation = estimateCostForQuantity({
      layers,
      quantity,
      method: effectiveMethod
    });

    if (!valuation.totalCost || valuation.totalCost <= 0) {
      const fallbackUnitCost = Number(inventory.product?.price || 0);
      valuation = {
        totalCost: roundMoney(fallbackUnitCost * quantity),
        unitCost: roundMoney(fallbackUnitCost)
      };
    }

    totalInventoryValue += valuation.totalCost;

    byProduct.push({
      productId: inventory.product._id,
      productName: inventory.product?.name || null,
      sku: inventory.product?.sku || null,
      warehouseId: inventory.warehouse._id,
      warehouseCode: inventory.warehouse?.code || null,
      quantityOnHand: quantity,
      unitCost: valuation.unitCost,
      value: valuation.totalCost
    });
  }

  return {
    method: effectiveMethod,
    totalInventoryValue: roundMoney(totalInventoryValue),
    itemCount: byProduct.length,
    byProduct
  };
};

export default {
  getOrCreateValuationConfig,
  getEffectiveMethod,
  setDefaultValuationMethod,
  addCostLayerFromReceipt,
  consumeCostLayers,
  computeInventoryValuation
};
