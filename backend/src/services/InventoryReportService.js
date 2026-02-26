import InventorySnapshot from '../models/InventorySnapshot.js';
import InventoryReport from '../models/InventoryReport.js';

export const generateInventoryReport = async ({
  type = 'daily',
  from = null,
  to = null,
  generatedBy = null,
  organizationId = null
}) => {
  if (!organizationId) {
    throw new Error('organizationId is required to generate inventory reports');
  }

  const filter = {
    organization: organizationId
  };

  if (from || to) {
    filter.recordedAt = {};
    if (from) filter.recordedAt.$gte = from;
    if (to) filter.recordedAt.$lte = to;
  }

  const snapshots = await InventorySnapshot.find(filter)
    .sort({ recordedAt: 1 })
    .select('sku stock price recordedAt source');

  const rows = snapshots.map((s) => ({
    sku: s.sku,
    stock: s.stock,
    price: s.price,
    inventoryValue: s.stock * s.price,
    recordedAt: s.recordedAt,
    source: s.source
  }));

  const report = await InventoryReport.create({
    organization: organizationId,
    type,
    generatedBy,
    filters: { from, to },
    recordCount: rows.length,
    format: 'csv'
  });

  return { report, rows };
};
