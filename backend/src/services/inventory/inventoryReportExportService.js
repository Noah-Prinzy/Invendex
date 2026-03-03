import InventorySnapshot from '../../models/InventorySnapshot.js';
import InventoryReport from '../../models/InventoryReport.js';
import { toCSV } from '../../utils/exporters/csvExporter.js';
import { toExcelBuffer } from '../../utils/exporters/excelExporter.js';

const ALLOWED_EXPORT_FORMATS = ['csv', 'xlsx'];

const normalizeDateOrNull = (value) => {
  if (value == null || value === '') return null;
  const candidate = new Date(value);
  if (!Number.isFinite(candidate.getTime())) {
    throw new Error('Invalid report date');
  }
  return candidate;
};

export const normalizeInventoryReportExportFormat = (value) => {
  const normalized = String(value || 'csv')
    .trim()
    .toLowerCase();
  if (!ALLOWED_EXPORT_FORMATS.includes(normalized)) {
    throw new Error('Unsupported export format');
  }
  return normalized;
};

export const buildInventoryReportFilters = ({
  from = null,
  to = null
} = {}) => {
  const fromDate = normalizeDateOrNull(from);
  const toDate = normalizeDateOrNull(to);

  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    throw new Error('from date cannot be after to date');
  }

  return {
    from: fromDate,
    to: toDate
  };
};

export const fetchInventoryReportRows = async ({
  organizationId,
  from = null,
  to = null
}) => {
  if (!organizationId) {
    throw new Error('organizationId is required to export inventory report');
  }

  const filters = buildInventoryReportFilters({ from, to });
  const query = {
    organization: organizationId
  };

  if (filters.from || filters.to) {
    query.recordedAt = {};
    if (filters.from) {
      query.recordedAt.$gte = filters.from;
    }
    if (filters.to) {
      query.recordedAt.$lte = filters.to;
    }
  }

  const snapshots = await InventorySnapshot.find(query)
    .sort({ recordedAt: 1 })
    .select('sku stock price recordedAt source')
    .lean();

  const rows = snapshots.map((snapshot) => ({
    sku: snapshot.sku,
    stock: Number(snapshot.stock || 0),
    price: Number(snapshot.price || 0),
    inventoryValue: Number(snapshot.stock || 0) * Number(snapshot.price || 0),
    recordedAt: snapshot.recordedAt,
    source: snapshot.source
  }));

  return {
    rows,
    filters
  };
};

export const createInventoryReportExportBuffer = ({
  format = 'csv',
  rows = []
}) => {
  const normalizedFormat = normalizeInventoryReportExportFormat(format);

  if (normalizedFormat === 'xlsx') {
    return {
      extension: 'xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: toExcelBuffer(rows, 'Inventory Report')
    };
  }

  return {
    extension: 'csv',
    contentType: 'text/csv; charset=utf-8',
    buffer: Buffer.from(toCSV(rows), 'utf-8')
  };
};

export const buildInventoryReportDownloadName = ({
  format = 'csv',
  from = null,
  to = null
}) => {
  const normalizedFormat = normalizeInventoryReportExportFormat(format);
  const stamp = new Date().toISOString().slice(0, 10);

  if (from || to) {
    const fromLabel = from
      ? new Date(from).toISOString().slice(0, 10)
      : 'start';
    const toLabel = to ? new Date(to).toISOString().slice(0, 10) : 'end';
    return `inventory-report-${fromLabel}-to-${toLabel}.${normalizedFormat}`;
  }

  return `inventory-report-${stamp}.${normalizedFormat}`;
};

export const persistInventoryReportMetadata = async ({
  organizationId,
  generatedBy,
  from = null,
  to = null,
  format = 'csv',
  recordCount = 0
}) => {
  if (!organizationId) {
    throw new Error('organizationId is required to persist inventory report');
  }
  if (!generatedBy) {
    throw new Error('generatedBy is required to persist inventory report');
  }

  const normalizedFormat = normalizeInventoryReportExportFormat(format);
  const normalizedFrom = normalizeDateOrNull(from);
  const normalizedTo = normalizeDateOrNull(to);

  const report = await InventoryReport.create({
    organization: organizationId,
    type: normalizedFrom || normalizedTo ? 'range' : 'daily',
    generatedBy,
    filters: {
      from: normalizedFrom,
      to: normalizedTo
    },
    recordCount: Number(recordCount || 0),
    format: normalizedFormat
  });

  return report;
};

export const buildInventoryReportExport = async ({
  organizationId,
  generatedBy,
  from = null,
  to = null,
  format = 'csv'
}) => {
  const normalizedFormat = normalizeInventoryReportExportFormat(format);
  const { rows, filters } = await fetchInventoryReportRows({
    organizationId,
    from,
    to
  });

  const report = await persistInventoryReportMetadata({
    organizationId,
    generatedBy,
    from: filters.from,
    to: filters.to,
    format: normalizedFormat,
    recordCount: rows.length
  });

  const exportPayload = createInventoryReportExportBuffer({
    format: normalizedFormat,
    rows
  });

  return {
    reportId: String(report._id),
    rowCount: rows.length,
    from: filters.from ? filters.from.toISOString() : null,
    to: filters.to ? filters.to.toISOString() : null,
    format: normalizedFormat,
    downloadName: buildInventoryReportDownloadName({
      format: normalizedFormat,
      from: filters.from,
      to: filters.to
    }),
    ...exportPayload
  };
};

export default {
  normalizeInventoryReportExportFormat,
  buildInventoryReportFilters,
  fetchInventoryReportRows,
  createInventoryReportExportBuffer,
  buildInventoryReportDownloadName,
  persistInventoryReportMetadata,
  buildInventoryReportExport
};
