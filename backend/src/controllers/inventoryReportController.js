import InventorySnapshot from '../models/InventorySnapshot.js';
import InventoryReport from '../models/InventoryReport.js';
import { toCSV } from '../utils/exporters/csvExporter.js';
import { toExcelBuffer } from '../utils/exporters/excelExporter.js';

export const exportInventoryReport = async (req, res, next) => {
  try {
    const { format = 'csv', from, to } = req.query;

    const filter = {
      organization: req.organizationId
    };
    if (from || to) {
      filter.recordedAt = {};
      if (from) filter.recordedAt.$gte = new Date(from);
      if (to) filter.recordedAt.$lte = new Date(to);
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

    await InventoryReport.create({
      organization: req.organizationId,
      type: from || to ? 'range' : 'daily',
      generatedBy: req.user._id,
      filters: { from, to },
      recordCount: rows.length,
      format
    });

    if (format === 'xlsx') {
      const buffer = toExcelBuffer(rows, 'Inventory Report');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=inventory-report.xlsx'
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      return res.send(buffer);
    }

    const csv = toCSV(rows);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=inventory-report.csv'
    );
    res.setHeader('Content-Type', 'text/csv');
    return res.send(csv);
  } catch (err) {
    next(err);
  }
};
