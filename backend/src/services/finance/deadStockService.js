import Inventory from '../../models/Inventory.js';

const normalizeDays = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 90;
  return Math.max(1, Math.min(3650, Math.floor(parsed)));
};

export const getDeadStockItems = async ({
  organizationId,
  days = 90,
  warehouseId = null
}) => {
  const thresholdDays = normalizeDays(days);
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

  const query = {
    organization: organizationId,
    quantityOnHand: { $gt: 0 },
    $or: [{ lastMovementAt: { $lte: thresholdDate } }, { lastMovementAt: null }]
  };

  if (warehouseId) {
    query.warehouse = warehouseId;
  }

  const rows = await Inventory.find(query)
    .populate('product', 'name sku category price')
    .populate('warehouse', 'name code')
    .lean();

  const now = new Date();
  const items = rows.map((row) => {
    const movementDate = row.lastMovementAt
      ? new Date(row.lastMovementAt)
      : null;
    const ageDays = movementDate
      ? Math.floor((now - movementDate) / (1000 * 60 * 60 * 24))
      : thresholdDays + 1;

    return {
      productId: row.product?._id || null,
      sku: row.product?.sku || null,
      productName: row.product?.name || null,
      warehouseId: row.warehouse?._id || null,
      warehouseCode: row.warehouse?.code || null,
      quantityOnHand: row.quantityOnHand,
      unitPrice: row.product?.price || 0,
      inventoryValue: Number(
        (row.quantityOnHand * (row.product?.price || 0)).toFixed(2)
      ),
      ageDays,
      lastMovementAt: row.lastMovementAt
    };
  });

  items.sort((a, b) => b.ageDays - a.ageDays);

  const totalValue = items.reduce((sum, item) => sum + item.inventoryValue, 0);
  return {
    thresholdDays,
    count: items.length,
    totalValue: Number(totalValue.toFixed(2)),
    items
  };
};

export default {
  getDeadStockItems
};
