import mongoose from 'mongoose';
import PurchaseOrder from '../../models/PurchaseOrder.js';
import { toCSV } from '../../utils/exporters/csvExporter.js';
import {
  toExcelBuffer,
  toExcelBufferFromSheets
} from '../../utils/exporters/excelExporter.js';
import { toPdfBuffer } from '../../utils/exporters/pdfExporter.js';

const CLOSED_PO_STATUSES = ['RECEIVED', 'CLOSED', 'received', 'closed'];

export const REPORT_EXPORT_TYPES = Object.freeze({
  PURCHASE_ORDER_STATUS_SUMMARY: 'PURCHASE_ORDER_STATUS_SUMMARY',
  FULL_SUMMARY: 'FULL_SUMMARY'
});

const STATUS_TEMPLATE = Object.freeze({
  draft: 0,
  sent: 0,
  received: 0,
  closed: 0,
  cancelled: 0
});

const normalizeObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(String(value || ''));

export const normalizeReportExportType = (value) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (!Object.values(REPORT_EXPORT_TYPES).includes(normalized)) {
    throw new Error('Unsupported report export type');
  }
  return normalized;
};

export const normalizeReportExportFormat = (value) => {
  const normalized = String(value || 'xlsx')
    .trim()
    .toLowerCase();
  if (!['csv', 'xlsx', 'pdf'].includes(normalized)) {
    throw new Error('Unsupported report export format');
  }
  return normalized;
};

const buildDownloadName = ({ reportType, format }) => {
  const stamp = new Date().toISOString().slice(0, 10);
  if (reportType === REPORT_EXPORT_TYPES.PURCHASE_ORDER_STATUS_SUMMARY) {
    return `po-status-summary-${stamp}.${format}`;
  }
  return `reports-full-summary-${stamp}.${format}`;
};

const getPurchaseOrderStatusSummary = async ({
  organizationId,
  warehouseId = null
}) => {
  const orgId = normalizeObjectId(organizationId);
  const match = {
    organization: orgId
  };

  if (warehouseId) {
    match.warehouse = normalizeObjectId(warehouseId);
  }

  const grouped = await PurchaseOrder.aggregate([
    {
      $match: match
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const summary = { ...STATUS_TEMPLATE };
  for (const row of grouped) {
    if (!row?._id) continue;
    const key = String(row._id).trim().toLowerCase();
    summary[key] = Number(row.count || 0);
  }

  const rows = Object.entries(summary).map(([status, count]) => ({
    status,
    count
  }));

  return {
    summary,
    rows
  };
};

const getSpendBySupplierSummary = async ({
  organizationId,
  warehouseId = null
}) => {
  const orgId = normalizeObjectId(organizationId);
  const match = {
    organization: orgId,
    status: { $in: CLOSED_PO_STATUSES }
  };

  if (warehouseId) {
    match.warehouse = normalizeObjectId(warehouseId);
  }

  return PurchaseOrder.aggregate([
    {
      $match: match
    },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'suppliers',
        localField: 'supplier',
        foreignField: '_id',
        as: 'supplier'
      }
    },
    { $unwind: '$supplier' },
    {
      $group: {
        _id: '$supplier._id',
        supplierName: { $first: '$supplier.name' },
        totalSpend: {
          $sum: {
            $multiply: ['$items.quantity', '$items.unitCost']
          }
        }
      }
    },
    { $sort: { totalSpend: -1 } }
  ]);
};

const buildPoStatusSummaryExport = async ({
  organizationId,
  warehouseId = null,
  format
}) => {
  const normalizedFormat = normalizeReportExportFormat(format);
  const { rows } = await getPurchaseOrderStatusSummary({
    organizationId,
    warehouseId
  });

  if (normalizedFormat === 'csv') {
    return {
      reportType: REPORT_EXPORT_TYPES.PURCHASE_ORDER_STATUS_SUMMARY,
      format: normalizedFormat,
      extension: 'csv',
      contentType: 'text/csv; charset=utf-8',
      buffer: Buffer.from(toCSV(rows), 'utf-8'),
      downloadName: buildDownloadName({
        reportType: REPORT_EXPORT_TYPES.PURCHASE_ORDER_STATUS_SUMMARY,
        format: normalizedFormat
      }),
      totalRows: rows.length
    };
  }

  if (normalizedFormat === 'pdf') {
    const buffer = await toPdfBuffer({
      title: 'Inventra PO Status Summary',
      subtitle: `Generated on ${new Date().toLocaleString()}`,
      sections: [
        {
          heading: 'Purchase Order Status',
          columns: [
            { key: 'status', label: 'Status', width: 280 },
            { key: 'count', label: 'Count', width: 180, align: 'right' }
          ],
          rows
        }
      ]
    });

    return {
      reportType: REPORT_EXPORT_TYPES.PURCHASE_ORDER_STATUS_SUMMARY,
      format: normalizedFormat,
      extension: 'pdf',
      contentType: 'application/pdf',
      buffer,
      downloadName: buildDownloadName({
        reportType: REPORT_EXPORT_TYPES.PURCHASE_ORDER_STATUS_SUMMARY,
        format: normalizedFormat
      }),
      totalRows: rows.length
    };
  }

  return {
    reportType: REPORT_EXPORT_TYPES.PURCHASE_ORDER_STATUS_SUMMARY,
    format: normalizedFormat,
    extension: 'xlsx',
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: toExcelBuffer(rows, 'PO Status'),
    downloadName: buildDownloadName({
      reportType: REPORT_EXPORT_TYPES.PURCHASE_ORDER_STATUS_SUMMARY,
      format: normalizedFormat
    }),
    totalRows: rows.length
  };
};

const buildFullSummaryExport = async ({
  organizationId,
  warehouseId = null,
  format
}) => {
  const normalizedFormat = normalizeReportExportFormat(format);
  const [{ rows: statusRows }, spendBySupplier] = await Promise.all([
    getPurchaseOrderStatusSummary({ organizationId, warehouseId }),
    getSpendBySupplierSummary({ organizationId, warehouseId })
  ]);

  const totalSpend = spendBySupplier.reduce(
    (sum, row) => sum + Number(row?.totalSpend || 0),
    0
  );
  const openPurchaseOrders =
    Number(statusRows.find((row) => row.status === 'draft')?.count || 0) +
    Number(statusRows.find((row) => row.status === 'sent')?.count || 0);

  const summaryRows = [
    { metric: 'generatedAt', value: new Date().toISOString() },
    { metric: 'totalSpend', value: Number(totalSpend.toFixed(2)) },
    { metric: 'supplierCount', value: spendBySupplier.length },
    { metric: 'openPurchaseOrders', value: openPurchaseOrders }
  ];

  if (normalizedFormat === 'csv') {
    const combinedRows = [
      ...summaryRows.map((row) => ({
        section: 'summary',
        label: row.metric,
        value: row.value
      })),
      ...statusRows.map((row) => ({
        section: 'po_status',
        label: row.status,
        value: row.count
      })),
      ...spendBySupplier.map((row) => ({
        section: 'spend_by_supplier',
        label: row.supplierName || 'Unknown supplier',
        value: Number(row.totalSpend || 0).toFixed(2)
      }))
    ];

    return {
      reportType: REPORT_EXPORT_TYPES.FULL_SUMMARY,
      format: normalizedFormat,
      extension: 'csv',
      contentType: 'text/csv; charset=utf-8',
      buffer: Buffer.from(toCSV(combinedRows), 'utf-8'),
      downloadName: buildDownloadName({
        reportType: REPORT_EXPORT_TYPES.FULL_SUMMARY,
        format: normalizedFormat
      }),
      totalRows: combinedRows.length
    };
  }

  if (normalizedFormat === 'pdf') {
    const pdfSummaryRows = summaryRows.map((row) => ({
      metric: row.metric,
      value: row.value
    }));
    const pdfStatusRows = statusRows.map((row) => ({
      status: row.status,
      count: row.count
    }));
    const pdfSpendRows = spendBySupplier.map((row) => ({
      supplierName: row.supplierName || 'Unknown supplier',
      totalSpend: Number(Number(row.totalSpend || 0).toFixed(2))
    }));

    const buffer = await toPdfBuffer({
      title: 'Inventra Full Summary Report',
      subtitle: `Generated on ${new Date().toLocaleString()}`,
      sections: [
        {
          heading: 'Summary',
          columns: [
            { key: 'metric', label: 'Metric', width: 260 },
            { key: 'value', label: 'Value', width: 200, align: 'right' }
          ],
          rows: pdfSummaryRows
        },
        {
          heading: 'PO Status Summary',
          columns: [
            { key: 'status', label: 'Status', width: 260 },
            { key: 'count', label: 'Count', width: 200, align: 'right' }
          ],
          rows: pdfStatusRows
        },
        {
          heading: 'Spend By Supplier',
          columns: [
            { key: 'supplierName', label: 'Supplier', width: 300 },
            {
              key: 'totalSpend',
              label: 'Total Spend',
              width: 160,
              align: 'right'
            }
          ],
          rows: pdfSpendRows
        }
      ]
    });

    return {
      reportType: REPORT_EXPORT_TYPES.FULL_SUMMARY,
      format: normalizedFormat,
      extension: 'pdf',
      contentType: 'application/pdf',
      buffer,
      downloadName: buildDownloadName({
        reportType: REPORT_EXPORT_TYPES.FULL_SUMMARY,
        format: normalizedFormat
      }),
      totalRows: summaryRows.length + statusRows.length + spendBySupplier.length
    };
  }

  return {
    reportType: REPORT_EXPORT_TYPES.FULL_SUMMARY,
    format: normalizedFormat,
    extension: 'xlsx',
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: toExcelBufferFromSheets({
      summary: summaryRows,
      po_status: statusRows,
      spend_by_supplier: spendBySupplier.map((row) => ({
        supplierName: row.supplierName || 'Unknown supplier',
        totalSpend: Number(Number(row.totalSpend || 0).toFixed(2))
      }))
    }),
    downloadName: buildDownloadName({
      reportType: REPORT_EXPORT_TYPES.FULL_SUMMARY,
      format: normalizedFormat
    }),
    totalRows: summaryRows.length + statusRows.length + spendBySupplier.length
  };
};

export const buildReportExportPayload = async ({
  organizationId,
  reportType,
  warehouseId = null,
  format = 'xlsx'
}) => {
  const normalizedType = normalizeReportExportType(reportType);
  const normalizedFormat = normalizeReportExportFormat(format);

  if (normalizedType === REPORT_EXPORT_TYPES.PURCHASE_ORDER_STATUS_SUMMARY) {
    return buildPoStatusSummaryExport({
      organizationId,
      warehouseId,
      format: normalizedFormat
    });
  }

  return buildFullSummaryExport({
    organizationId,
    warehouseId,
    format: normalizedFormat
  });
};

export default {
  REPORT_EXPORT_TYPES,
  normalizeReportExportType,
  normalizeReportExportFormat,
  buildReportExportPayload
};
