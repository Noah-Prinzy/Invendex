import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getFinanceDeadStockRequest,
  getFinanceGrossMarginRequest,
  getFinanceInventoryValuationRequest,
  getReportPurchaseOrderStatusSummaryRequest,
  getReportSpendBySupplierRequest,
  getReportSpendSummaryRequest
} from '../../api/client.js';

const SPEND_PAGE_SIZE = 8;
const REPORTS_QUERY_STALE_TIME_MS = 45 * 1000;

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const sanitizeCsvCell = (value) => {
  let normalized = String(value ?? '');
  if (/^[=+\-@]/.test(normalized)) {
    normalized = `'${normalized}`;
  }
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const toCsv = (headers = [], rows = []) => {
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const bodyLines = rows.map((row) =>
    row.map((value) => sanitizeCsvCell(value)).join(',')
  );
  return [headerLine, ...bodyLines].join('\n');
};

const downloadFile = ({ filename, content, mimeType }) => {
  const blob = new Blob([content], {
    type: mimeType || 'text/plain;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const buildReportFilename = (prefix, extension) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `ledgerly-${prefix}-${stamp}.${extension}`;
};

const downloadWorkbook = async ({ filename, sheets }) => {
  const xlsxModule = await import('xlsx');
  const XLSX = xlsxModule?.default || xlsxModule;
  const workbook = XLSX.utils.book_new();

  Object.entries(sheets || {}).forEach(([sheetName, rows]) => {
    const normalizedName = String(sheetName || 'Sheet1').slice(0, 31);
    const worksheet = XLSX.utils.aoa_to_sheet(
      Array.isArray(rows) ? rows : [['']]
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, normalizedName);
  });

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadFile({
    filename,
    content: buffer,
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
};

const createPdfRuntime = async () => {
  const [jspdfModule, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  return {
    jsPDF: jspdfModule.jsPDF,
    autoTable: autoTableModule.default
  };
};

const Reports = ({ accessToken, userRole = null }) => {
  const [spendSearch, setSpendSearch] = useState('');
  const [spendSortKey, setSpendSortKey] = useState('totalSpend');
  const [spendSortDirection, setSpendSortDirection] = useState('desc');
  const [spendPage, setSpendPage] = useState(1);
  const [statusSortDirection, setStatusSortDirection] = useState('desc');
  const isAdmin = String(userRole || '') === 'admin';
  const reportsQueryKey = useMemo(
    () => ['reports:index', String(accessToken || ''), String(isAdmin)],
    [accessToken, isAdmin]
  );

  useEffect(() => {
    if (isAdmin) return;
    setSpendPage(1);
  }, [isAdmin]);

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: reportsQueryKey,
    enabled: Boolean(accessToken) && isAdmin,
    staleTime: REPORTS_QUERY_STALE_TIME_MS,
    queryFn: async () => {
      const [
        statusData,
        spendData,
        supplierSpendData,
        valuationData,
        deadStockData,
        grossMarginData
      ] = await Promise.all([
        getReportPurchaseOrderStatusSummaryRequest(accessToken),
        getReportSpendSummaryRequest(accessToken),
        getReportSpendBySupplierRequest(accessToken),
        getFinanceInventoryValuationRequest({
          accessToken
        }),
        getFinanceDeadStockRequest({
          accessToken
        }),
        getFinanceGrossMarginRequest({
          accessToken,
          groupBy: 'day'
        })
      ]);

      return {
        statusSummary: statusData || {},
        spendSummary: spendData || { totalSpend: 0 },
        spendBySupplier: Array.isArray(supplierSpendData)
          ? supplierSpendData
          : [],
        valuation: valuationData || null,
        deadStock: deadStockData || null,
        grossMargin: grossMarginData || null
      };
    }
  });

  const statusSummary = data?.statusSummary || null;
  const spendSummary = data?.spendSummary || null;
  const spendBySupplier = useMemo(
    () => (Array.isArray(data?.spendBySupplier) ? data.spendBySupplier : []),
    [data]
  );
  const valuation = data?.valuation || null;
  const deadStock = data?.deadStock || null;
  const grossMargin = data?.grossMargin || null;
  const errorMessage = String(error?.message || '').trim();

  const totalOpenPurchaseOrders = useMemo(() => {
    if (!statusSummary) return 0;
    return Number(statusSummary.draft || 0) + Number(statusSummary.sent || 0);
  }, [statusSummary]);

  const sortedStatusRows = useMemo(() => {
    if (!statusSummary) return [];

    const rows = Object.entries(statusSummary).map(([status, value]) => ({
      status,
      count: Number(value || 0)
    }));

    rows.sort((a, b) => {
      const direction = statusSortDirection === 'asc' ? 1 : -1;
      return (a.count - b.count) * direction;
    });

    return rows;
  }, [statusSummary, statusSortDirection]);

  const filteredSpendRows = useMemo(() => {
    const normalizedSearch = String(spendSearch || '')
      .trim()
      .toLowerCase();

    const rows = spendBySupplier.filter((row) => {
      if (!normalizedSearch) return true;
      return String(row.supplierName || '')
        .toLowerCase()
        .includes(normalizedSearch);
    });

    rows.sort((a, b) => {
      const direction = spendSortDirection === 'asc' ? 1 : -1;
      if (spendSortKey === 'supplierName') {
        return (
          String(a.supplierName || '').localeCompare(
            String(b.supplierName || ''),
            undefined,
            {
              sensitivity: 'base'
            }
          ) * direction
        );
      }
      return (
        (Number(a.totalSpend || 0) - Number(b.totalSpend || 0)) * direction
      );
    });

    return rows;
  }, [spendBySupplier, spendSearch, spendSortKey, spendSortDirection]);

  const spendTotalPages = Math.max(
    1,
    Math.ceil(filteredSpendRows.length / SPEND_PAGE_SIZE)
  );

  useEffect(() => {
    setSpendPage((current) => Math.min(current, spendTotalPages));
  }, [spendTotalPages]);

  const paginatedSpendRows = useMemo(() => {
    const start = (spendPage - 1) * SPEND_PAGE_SIZE;
    return filteredSpendRows.slice(start, start + SPEND_PAGE_SIZE);
  }, [filteredSpendRows, spendPage]);

  const deadStockRows = useMemo(
    () => (Array.isArray(deadStock?.items) ? deadStock.items : []),
    [deadStock]
  );

  const topDeadStockRows = useMemo(
    () => deadStockRows.slice(0, 8),
    [deadStockRows]
  );

  const handleDownloadSpendBySupplier = () => {
    const csv = toCsv(
      ['supplierName', 'totalSpend'],
      filteredSpendRows.map((row) => [
        row.supplierName || 'Unknown supplier',
        Number(row.totalSpend || 0).toFixed(2)
      ])
    );

    downloadFile({
      filename: buildReportFilename('spend-by-supplier', 'csv'),
      content: csv,
      mimeType: 'text/csv;charset=utf-8'
    });
  };

  const handleDownloadValuationCsv = () => {
    const byProduct = Array.isArray(valuation?.byProduct)
      ? valuation.byProduct
      : [];
    const csv = toCsv(
      [
        'method',
        'productName',
        'sku',
        'warehouseCode',
        'quantityOnHand',
        'unitCost',
        'value'
      ],
      byProduct.map((row) => [
        valuation?.method || '',
        row.productName || '',
        row.sku || '',
        row.warehouseCode || '',
        Number(row.quantityOnHand || 0),
        Number(row.unitCost || 0).toFixed(2),
        Number(row.value || 0).toFixed(2)
      ])
    );

    downloadFile({
      filename: buildReportFilename('inventory-valuation', 'csv'),
      content: csv,
      mimeType: 'text/csv;charset=utf-8'
    });
  };

  const handleDownloadDeadStockCsv = () => {
    const csv = toCsv(
      [
        'sku',
        'productName',
        'warehouseCode',
        'quantityOnHand',
        'inventoryValue',
        'ageDays',
        'lastMovementAt'
      ],
      deadStockRows.map((row) => [
        row.sku || '',
        row.productName || '',
        row.warehouseCode || '',
        Number(row.quantityOnHand || 0),
        Number(row.inventoryValue || 0).toFixed(2),
        Number(row.ageDays || 0),
        row.lastMovementAt || ''
      ])
    );

    downloadFile({
      filename: buildReportFilename('dead-stock', 'csv'),
      content: csv,
      mimeType: 'text/csv;charset=utf-8'
    });
  };

  const handleDownloadPoStatusSummaryExcel = async () => {
    await downloadWorkbook({
      filename: buildReportFilename('po-status-summary', 'xlsx'),
      sheets: {
        po_status_summary: [
          ['status', 'count'],
          ...sortedStatusRows.map((row) => [row.status, Number(row.count || 0)])
        ]
      }
    });
  };

  const handleDownloadPoStatusSummaryPdf = async () => {
    const { jsPDF, autoTable } = await createPdfRuntime();
    const document = new jsPDF();
    document.setFontSize(14);
    document.text('Ledgerly PO Status Summary', 14, 16);

    autoTable(document, {
      startY: 22,
      head: [['Status', 'Count']],
      body: sortedStatusRows.map((row) => [row.status, Number(row.count || 0)])
    });

    document.save(buildReportFilename('po-status-summary', 'pdf'));
  };

  const handleDownloadFullSummaryExcel = async () => {
    await downloadWorkbook({
      filename: buildReportFilename('reports-summary', 'xlsx'),
      sheets: {
        summary: [
          ['metric', 'value'],
          ['generatedAt', new Date().toISOString()],
          ['totalSpend', Number(spendSummary?.totalSpend || 0).toFixed(2)],
          ['supplierCount', Number(spendBySupplier.length || 0)],
          ['openPurchaseOrders', Number(totalOpenPurchaseOrders || 0)]
        ],
        po_status_summary: [
          ['status', 'count'],
          ...sortedStatusRows.map((row) => [row.status, Number(row.count || 0)])
        ],
        spend_by_supplier: [
          ['supplierName', 'totalSpend'],
          ...spendBySupplier.map((row) => [
            row.supplierName || 'Unknown supplier',
            Number(row.totalSpend || 0).toFixed(2)
          ])
        ]
      }
    });
  };

  const handleDownloadFullSummaryPdf = async () => {
    const { jsPDF, autoTable } = await createPdfRuntime();
    const document = new jsPDF();
    document.setFontSize(14);
    document.text('Ledgerly Full Summary Report', 14, 16);
    document.setFontSize(10);
    document.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    document.text(
      `Total spend: ${formatCurrency(spendSummary?.totalSpend || 0)}`,
      14,
      28
    );
    document.text(`Open POs: ${totalOpenPurchaseOrders}`, 14, 34);
    document.text(`Suppliers: ${spendBySupplier.length}`, 14, 40);

    autoTable(document, {
      startY: 46,
      head: [['PO Status', 'Count']],
      body: sortedStatusRows.map((row) => [row.status, Number(row.count || 0)])
    });

    autoTable(document, {
      startY: document.lastAutoTable?.finalY
        ? document.lastAutoTable.finalY + 8
        : 70,
      head: [['Supplier', 'Total spend']],
      body: spendBySupplier.map((row) => [
        row.supplierName || 'Unknown supplier',
        formatCurrency(row.totalSpend)
      ])
    });

    document.save(buildReportFilename('reports-summary', 'pdf'));
  };

  if (!isAdmin) {
    return (
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Reports</h2>
            <p>Reporting APIs are restricted by backend role policy.</p>
          </div>
        </header>
        <article className="access-card">
          <p className="metric-label">Permission required</p>
          <h3>Admin role needed</h3>
          <p className="muted">
            Your current role is `{userRole || 'unknown'}`. The `/api/reports/*`
            endpoints are currently protected with `requireRoles('admin')`.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="panel-head panel-head-row">
        <div>
          <h2>Reports</h2>
          <p>Purchase order and spend summaries from reporting APIs.</p>
        </div>
        <div className="obs-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadPoStatusSummaryExcel}
            disabled={!sortedStatusRows.length}
          >
            PO status Excel
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadPoStatusSummaryPdf}
            disabled={!sortedStatusRows.length}
          >
            PO status PDF
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadSpendBySupplier}
            disabled={!filteredSpendRows.length}
          >
            Download supplier spend CSV
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadValuationCsv}
            disabled={
              !Array.isArray(valuation?.byProduct) ||
              !valuation.byProduct.length
            }
          >
            Valuation CSV
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadDeadStockCsv}
            disabled={!deadStockRows.length}
          >
            Dead stock CSV
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadFullSummaryExcel}
            disabled={!statusSummary && !spendBySupplier.length}
          >
            Full summary Excel
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadFullSummaryPdf}
            disabled={!statusSummary && !spendBySupplier.length}
          >
            Full summary PDF
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
          >
            {isLoading || isFetching ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">Total spend</p>
          <p className="metric-value">
            {formatCurrency(spendSummary?.totalSpend)}
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Open purchase orders</p>
          <p className="metric-value">{totalOpenPurchaseOrders}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Suppliers in spend report</p>
          <p className="metric-value">{spendBySupplier.length}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Inventory valuation</p>
          <p className="metric-value">
            {formatCurrency(valuation?.totalInventoryValue)}
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Gross margin %</p>
          <p className="metric-value">
            {Number(grossMargin?.totals?.grossMarginPct || 0).toFixed(2)}%
          </p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Dead stock value</p>
          <p className="metric-value">
            {formatCurrency(deadStock?.totalValue)}
          </p>
        </article>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className="data-grid">
        <article className="data-card">
          <h3>PO Status Summary</h3>
          {statusSummary ? (
            <>
              <div className="control-row compact">
                <label className="control-field">
                  <span>Sort by count</span>
                  <select
                    value={statusSortDirection}
                    onChange={(event) =>
                      setStatusSortDirection(event.target.value)
                    }
                  >
                    <option value="desc">High to low</option>
                    <option value="asc">Low to high</option>
                  </select>
                </label>
              </div>
              <ul className="rank-list">
                {sortedStatusRows.map((row) => (
                  <li key={row.status} className="rank-item">
                    <p>{row.status}</p>
                    <span>{row.count}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">No status summary available.</p>
          )}
        </article>

        <article className="data-card">
          <h3>Spend by Supplier</h3>
          {spendBySupplier.length ? (
            <>
              <div className="control-row">
                <label className="control-field">
                  <span>Search</span>
                  <input
                    type="text"
                    value={spendSearch}
                    onChange={(event) => {
                      setSpendSearch(event.target.value);
                      setSpendPage(1);
                    }}
                    placeholder="Supplier name"
                  />
                </label>
                <label className="control-field">
                  <span>Sort</span>
                  <select
                    value={spendSortKey}
                    onChange={(event) => {
                      setSpendSortKey(event.target.value);
                      setSpendPage(1);
                    }}
                  >
                    <option value="totalSpend">Total spend</option>
                    <option value="supplierName">Supplier name</option>
                  </select>
                </label>
                <label className="control-field">
                  <span>Direction</span>
                  <select
                    value={spendSortDirection}
                    onChange={(event) => {
                      setSpendSortDirection(event.target.value);
                      setSpendPage(1);
                    }}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </label>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th>Total spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSpendRows.map((row) => (
                      <tr key={row._id || row.supplierName}>
                        <td>{row.supplierName || 'Unknown supplier'}</td>
                        <td>{formatCurrency(row.totalSpend)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <footer className="pagination-row">
                <p className="muted">
                  Showing {paginatedSpendRows.length} of{' '}
                  {filteredSpendRows.length} suppliers ({spendBySupplier.length}{' '}
                  total)
                </p>
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      setSpendPage((current) => Math.max(1, current - 1))
                    }
                    disabled={spendPage <= 1}
                  >
                    Prev
                  </button>
                  <span className="pagination-text">
                    Page {spendPage} / {spendTotalPages}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      setSpendPage((current) =>
                        Math.min(spendTotalPages, current + 1)
                      )
                    }
                    disabled={spendPage >= spendTotalPages}
                  >
                    Next
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <p className="muted">No supplier spend data available.</p>
          )}
        </article>

        <article className="data-card">
          <h3>Finance Snapshot</h3>
          {valuation || grossMargin ? (
            <ul className="rank-list">
              <li className="rank-item">
                <p>Valuation method</p>
                <span>{valuation?.method || 'n/a'}</span>
              </li>
              <li className="rank-item">
                <p>Valued inventory items</p>
                <span>{Number(valuation?.itemCount || 0)}</span>
              </li>
              <li className="rank-item">
                <p>Total inventory value</p>
                <span>{formatCurrency(valuation?.totalInventoryValue)}</span>
              </li>
              <li className="rank-item">
                <p>Gross margin</p>
                <span>{formatCurrency(grossMargin?.totals?.grossMargin)}</span>
              </li>
              <li className="rank-item">
                <p>Gross margin %</p>
                <span>
                  {Number(grossMargin?.totals?.grossMarginPct || 0).toFixed(2)}%
                </span>
              </li>
            </ul>
          ) : (
            <p className="muted">Finance summary is not available.</p>
          )}
        </article>

        <article className="data-card">
          <h3>Dead Stock</h3>
          {deadStockRows.length ? (
            <>
              <p className="section-note">
                Threshold {Number(deadStock?.thresholdDays || 90)} days | Items{' '}
                {Number(deadStock?.count || deadStockRows.length)}
              </p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Warehouse</th>
                      <th>Qty</th>
                      <th>Age (days)</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDeadStockRows.map((row) => (
                      <tr
                        key={`${row.productId || row.sku}-${row.warehouseId || row.warehouseCode}`}
                      >
                        <td>{row.sku || '-'}</td>
                        <td>{row.productName || '-'}</td>
                        <td>{row.warehouseCode || '-'}</td>
                        <td>{Number(row.quantityOnHand || 0)}</td>
                        <td>{Number(row.ageDays || 0)}</td>
                        <td>{formatCurrency(row.inventoryValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="muted">
              No dead stock detected for the current threshold.
            </p>
          )}
        </article>
      </div>
    </section>
  );
};

export default Reports;
