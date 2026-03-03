import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  downloadInventoryReportExportJobRequest,
  downloadReportExportJobRequest,
  getAuditLogsRequest,
  getFinanceExchangeRatesRequest,
  getFinanceDeadStockRequest,
  getFinanceGrossMarginRequest,
  getFinanceInventoryValuationRequest,
  getInventoryReportExportJobStatusRequest,
  getReportExportJobStatusRequest,
  getSettingsRequest,
  getWmsMovementLedgerRequest,
  queueInventoryReportExportJobRequest,
  queueReportExportJobRequest,
  getReportPurchaseOrderStatusSummaryRequest,
  getReportSpendBySupplierRequest,
  getReportSpendSummaryRequest
} from '../../api/client.js';

const SPEND_PAGE_SIZE = 8;
const REPORTS_QUERY_STALE_TIME_MS = 45 * 1000;
const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const formatCurrency = (value, currencyCode = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(currencyCode || 'USD').toUpperCase(),
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  } catch {
    return `${String(currencyCode || 'USD').toUpperCase()} ${Number(
      value || 0
    ).toFixed(2)}`;
  }
};

const formatDateTime = (value) => {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleString();
};

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

const Reports = ({ accessToken, userRole = null }) => {
  const [spendSearch, setSpendSearch] = useState('');
  const [spendSortKey, setSpendSortKey] = useState('totalSpend');
  const [spendSortDirection, setSpendSortDirection] = useState('desc');
  const [spendPage, setSpendPage] = useState(1);
  const [statusSortDirection, setStatusSortDirection] = useState('desc');
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditSuccessFilter, setAuditSuccessFilter] = useState('all');
  const [inventoryExportJob, setInventoryExportJob] = useState(null);
  const [inventoryExportError, setInventoryExportError] = useState('');
  const [inventoryExportBusy, setInventoryExportBusy] = useState(false);
  const [reportExportError, setReportExportError] = useState('');
  const [reportExportBusy, setReportExportBusy] = useState(false);
  const [reportExportJob, setReportExportJob] = useState(null);
  const isAdmin = String(userRole || '') === 'admin';
  const reportsQueryKey = useMemo(
    () => [
      'reports:index',
      String(accessToken || ''),
      String(isAdmin),
      String(selectedCurrencyCode || ''),
      String(movementTypeFilter || ''),
      String(auditActionFilter || ''),
      String(auditSuccessFilter || 'all')
    ],
    [
      accessToken,
      isAdmin,
      selectedCurrencyCode,
      movementTypeFilter,
      auditActionFilter,
      auditSuccessFilter
    ]
  );

  useEffect(() => {
    if (isAdmin) return;
    setSpendPage(1);
  }, [isAdmin]);

  useEffect(() => {
    if (!accessToken) return undefined;

    const jobId = String(inventoryExportJob?.id || '').trim();
    const status = String(inventoryExportJob?.status || '').toUpperCase();
    if (!jobId || status === 'COMPLETED' || status === 'FAILED') {
      return undefined;
    }

    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const latest = await getInventoryReportExportJobStatusRequest({
          accessToken,
          jobId
        });
        if (!stopped && latest) {
          setInventoryExportJob(latest);
        }
      } catch (error) {
        if (!stopped) {
          setInventoryExportError(
            String(error?.message || 'Failed to refresh export status')
          );
        }
      }
    }, 2000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [accessToken, inventoryExportJob]);

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: reportsQueryKey,
    enabled: Boolean(accessToken) && isAdmin,
    staleTime: REPORTS_QUERY_STALE_TIME_MS,
    queryFn: async () => {
      const settingsData = await getSettingsRequest(accessToken);
      const baseCurrencyCode = String(
        settingsData?.companyProfile?.currencyCode || 'UGX'
      )
        .trim()
        .toUpperCase();
      const targetCurrencyCode = String(
        selectedCurrencyCode || baseCurrencyCode
      )
        .trim()
        .toUpperCase();

      const [
        exchangeRatesData,
        statusData,
        spendData,
        supplierSpendData,
        valuationData,
        deadStockData,
        grossMarginData,
        movementData,
        auditLogsData
      ] = await Promise.all([
        getFinanceExchangeRatesRequest({
          accessToken,
          baseCurrencyCode
        }),
        getReportPurchaseOrderStatusSummaryRequest(accessToken),
        getReportSpendSummaryRequest(accessToken),
        getReportSpendBySupplierRequest(accessToken),
        getFinanceInventoryValuationRequest({
          accessToken,
          currencyCode: targetCurrencyCode
        }),
        getFinanceDeadStockRequest({
          accessToken,
          currencyCode: targetCurrencyCode
        }),
        getFinanceGrossMarginRequest({
          accessToken,
          groupBy: 'day',
          currencyCode: targetCurrencyCode
        }),
        getWmsMovementLedgerRequest({
          accessToken,
          type: movementTypeFilter || null,
          limit: 50
        }),
        getAuditLogsRequest({
          accessToken,
          page: 1,
          limit: 50,
          action: String(auditActionFilter || '').trim() || null,
          success:
            auditSuccessFilter === 'all'
              ? null
              : String(auditSuccessFilter) === 'true'
        })
      ]);

      const conversionRate = Number(valuationData?.exchangeRate || 1);
      const shouldConvertSpend =
        targetCurrencyCode !== baseCurrencyCode &&
        Number.isFinite(conversionRate) &&
        conversionRate > 0;
      const normalizedSpendSummary = {
        ...(spendData || { totalSpend: 0 })
      };
      if (shouldConvertSpend) {
        normalizedSpendSummary.totalSpend = roundMoney(
          Number(normalizedSpendSummary.totalSpend || 0) * conversionRate
        );
      }
      const normalizedSupplierSpendData = Array.isArray(supplierSpendData)
        ? supplierSpendData.map((row) => ({
            ...row,
            totalSpend: shouldConvertSpend
              ? roundMoney(Number(row.totalSpend || 0) * conversionRate)
              : Number(row.totalSpend || 0)
          }))
        : [];

      return {
        baseCurrencyCode,
        currencyCode: targetCurrencyCode,
        exchangeRate: shouldConvertSpend ? conversionRate : 1,
        exchangeRates: Array.isArray(exchangeRatesData?.rates)
          ? exchangeRatesData.rates
          : [],
        statusSummary: statusData || {},
        spendSummary: normalizedSpendSummary,
        spendBySupplier: normalizedSupplierSpendData,
        valuation: valuationData || null,
        deadStock: deadStockData || null,
        grossMargin: grossMarginData || null,
        movements: Array.isArray(movementData) ? movementData : [],
        auditLogs: Array.isArray(auditLogsData?.data) ? auditLogsData.data : [],
        auditPagination: auditLogsData?.pagination || null
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
  const movementRows = useMemo(
    () => (Array.isArray(data?.movements) ? data.movements : []),
    [data]
  );
  const auditRows = useMemo(
    () => (Array.isArray(data?.auditLogs) ? data.auditLogs : []),
    [data]
  );
  const auditPagination = data?.auditPagination || null;
  const baseCurrencyCode = String(data?.baseCurrencyCode || 'UGX')
    .trim()
    .toUpperCase();
  const activeCurrencyCode = String(
    data?.currencyCode || baseCurrencyCode || 'UGX'
  )
    .trim()
    .toUpperCase();
  const availableCurrencyCodes = useMemo(() => {
    const codes = new Set([baseCurrencyCode]);
    const rows = Array.isArray(data?.exchangeRates) ? data.exchangeRates : [];
    for (const row of rows) {
      const code = String(row?.quoteCurrencyCode || '')
        .trim()
        .toUpperCase();
      if (code.length === 3) {
        codes.add(code);
      }
    }
    return Array.from(codes).sort((a, b) => a.localeCompare(b));
  }, [baseCurrencyCode, data?.exchangeRates]);
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

  const handleDownloadMovementCsv = () => {
    const csv = toCsv(
      [
        'movedAt',
        'movementType',
        'sku',
        'productName',
        'quantity',
        'warehouseFrom',
        'warehouseTo',
        'reason',
        'referenceType'
      ],
      movementRows.map((row) => [
        row.movedAt || row.createdAt || '',
        row.movementType || '',
        row.product?.sku || '',
        row.product?.name || '',
        Number(row.quantity || 0),
        row.warehouseFrom?.code || '',
        row.warehouseTo?.code || '',
        row.reason || '',
        row.referenceType || ''
      ])
    );

    downloadFile({
      filename: buildReportFilename('stock-movements', 'csv'),
      content: csv,
      mimeType: 'text/csv;charset=utf-8'
    });
  };

  const handleDownloadAuditCsv = () => {
    const csv = toCsv(
      ['createdAt', 'action', 'entity', 'success', 'userEmail', 'path', 'ip'],
      auditRows.map((row) => [
        row.createdAt || '',
        row.action || '',
        row.entity || '',
        String(Boolean(row.success)),
        row.user?.email || '',
        row.path || '',
        row.ip || ''
      ])
    );

    downloadFile({
      filename: buildReportFilename('audit-log', 'csv'),
      content: csv,
      mimeType: 'text/csv;charset=utf-8'
    });
  };

  const sleepAsync = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const runQueuedReportExportDownload = async ({
    reportType,
    format = 'xlsx'
  }) => {
    if (!accessToken) return;

    setReportExportBusy(true);
    setReportExportError('');
    try {
      const queuedJob = await queueReportExportJobRequest({
        accessToken,
        reportType,
        format
      });
      setReportExportJob(queuedJob || null);

      const jobId = String(queuedJob?.id || '').trim();
      if (!jobId) {
        throw new Error('Report export job did not return a valid job ID');
      }

      let finalJob = queuedJob;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const status = String(finalJob?.status || '').toUpperCase();
        if (status === 'COMPLETED') break;
        if (status === 'FAILED') {
          throw new Error(
            String(finalJob?.error?.message || 'Report export failed')
          );
        }

        await sleepAsync(1000);
        finalJob = await getReportExportJobStatusRequest({
          accessToken,
          jobId
        });
        setReportExportJob(finalJob || null);
      }

      if (String(finalJob?.status || '').toUpperCase() !== 'COMPLETED') {
        throw new Error('Report export timed out');
      }

      const file = await downloadReportExportJobRequest({
        accessToken,
        jobId
      });

      const objectUrl = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setReportExportError(String(error?.message || 'Failed to export report'));
    } finally {
      setReportExportBusy(false);
    }
  };

  const handleDownloadPoStatusSummaryExcel = async () => {
    await runQueuedReportExportDownload({
      reportType: 'PURCHASE_ORDER_STATUS_SUMMARY',
      format: 'xlsx'
    });
  };

  const handleDownloadPoStatusSummaryPdf = async () => {
    await runQueuedReportExportDownload({
      reportType: 'PURCHASE_ORDER_STATUS_SUMMARY',
      format: 'pdf'
    });
  };

  const handleDownloadFullSummaryExcel = async () => {
    await runQueuedReportExportDownload({
      reportType: 'FULL_SUMMARY',
      format: 'xlsx'
    });
  };

  const handleDownloadFullSummaryPdf = async () => {
    await runQueuedReportExportDownload({
      reportType: 'FULL_SUMMARY',
      format: 'pdf'
    });
  };

  const handleQueueInventoryExport = async (format = 'csv') => {
    if (!accessToken) return;

    setInventoryExportBusy(true);
    setInventoryExportError('');
    try {
      const queuedJob = await queueInventoryReportExportJobRequest({
        accessToken,
        format
      });
      setInventoryExportJob(queuedJob || null);
    } catch (error) {
      setInventoryExportError(
        String(error?.message || 'Failed to queue inventory export')
      );
    } finally {
      setInventoryExportBusy(false);
    }
  };

  const handleDownloadQueuedInventoryExport = async () => {
    const jobId = String(inventoryExportJob?.id || '').trim();
    if (!accessToken || !jobId) return;

    setInventoryExportBusy(true);
    setInventoryExportError('');
    try {
      const file = await downloadInventoryReportExportJobRequest({
        accessToken,
        jobId
      });
      const objectUrl = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setInventoryExportError(
        String(error?.message || 'Failed to download inventory export')
      );
    } finally {
      setInventoryExportBusy(false);
    }
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
          <label className="control-field compact-select">
            <span>Currency</span>
            <select
              value={selectedCurrencyCode || baseCurrencyCode}
              onChange={(event) => setSelectedCurrencyCode(event.target.value)}
            >
              {availableCurrencyCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadPoStatusSummaryExcel}
            disabled={!sortedStatusRows.length || reportExportBusy}
          >
            PO status Excel
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadPoStatusSummaryPdf}
            disabled={!sortedStatusRows.length || reportExportBusy}
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
            onClick={handleDownloadMovementCsv}
            disabled={!movementRows.length}
          >
            Movements CSV
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadAuditCsv}
            disabled={!auditRows.length}
          >
            Audit CSV
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadFullSummaryExcel}
            disabled={
              (!statusSummary && !spendBySupplier.length) || reportExportBusy
            }
          >
            Full summary Excel
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadFullSummaryPdf}
            disabled={
              (!statusSummary && !spendBySupplier.length) || reportExportBusy
            }
          >
            Full summary PDF
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => handleQueueInventoryExport('csv')}
            disabled={inventoryExportBusy}
          >
            Queue inventory CSV
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => handleQueueInventoryExport('xlsx')}
            disabled={inventoryExportBusy}
          >
            Queue inventory Excel
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadQueuedInventoryExport}
            disabled={
              inventoryExportBusy ||
              String(inventoryExportJob?.status || '').toUpperCase() !==
                'COMPLETED'
            }
          >
            Download queued inventory export
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
            {formatCurrency(spendSummary?.totalSpend, activeCurrencyCode)}
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
            {formatCurrency(valuation?.totalInventoryValue, activeCurrencyCode)}
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
            {formatCurrency(deadStock?.totalValue, activeCurrencyCode)}
          </p>
        </article>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {inventoryExportError ? (
        <p className="form-error">{inventoryExportError}</p>
      ) : null}
      {reportExportError ? (
        <p className="form-error">{reportExportError}</p>
      ) : null}
      {inventoryExportJob?.id ? (
        <p className="section-note">
          Inventory export job {inventoryExportJob.id}:{' '}
          {inventoryExportJob.status}
          {inventoryExportJob?.progress?.percent != null
            ? ` (${Number(inventoryExportJob.progress.percent)}%)`
            : ''}
        </p>
      ) : null}
      {reportExportJob?.id ? (
        <p className="section-note">
          Report export job {reportExportJob.id}: {reportExportJob.status}
          {reportExportJob?.progress?.percent != null
            ? ` (${Number(reportExportJob.progress.percent)}%)`
            : ''}
        </p>
      ) : null}

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
                        <td>
                          {formatCurrency(row.totalSpend, activeCurrencyCode)}
                        </td>
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
                <span>
                  {formatCurrency(
                    valuation?.totalInventoryValue,
                    activeCurrencyCode
                  )}
                </span>
              </li>
              <li className="rank-item">
                <p>Gross margin</p>
                <span>
                  {formatCurrency(
                    grossMargin?.totals?.grossMargin,
                    activeCurrencyCode
                  )}
                </span>
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
                        <td>
                          {formatCurrency(
                            row.inventoryValue,
                            activeCurrencyCode
                          )}
                        </td>
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

        <article className="data-card">
          <h3>Stock Movements</h3>
          <div className="control-row compact">
            <label className="control-field">
              <span>Movement type</span>
              <select
                value={movementTypeFilter}
                onChange={(event) => setMovementTypeFilter(event.target.value)}
              >
                <option value="">All types</option>
                <option value="INBOUND">INBOUND</option>
                <option value="OUTBOUND">OUTBOUND</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="ALLOCATION">ALLOCATION</option>
                <option value="PICK">PICK</option>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
              </select>
            </label>
          </div>
          {movementRows.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>From</th>
                    <th>To</th>
                  </tr>
                </thead>
                <tbody>
                  {movementRows.slice(0, 10).map((row) => (
                    <tr key={String(row._id || row.id || row.createdAt)}>
                      <td>{formatDateTime(row.movedAt || row.createdAt)}</td>
                      <td>{row.movementType || '-'}</td>
                      <td>{row.product?.sku || '-'}</td>
                      <td>{Number(row.quantity || 0)}</td>
                      <td>{row.warehouseFrom?.code || '-'}</td>
                      <td>{row.warehouseTo?.code || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No stock movements found for this filter.</p>
          )}
        </article>

        <article className="data-card">
          <h3>Audit Log</h3>
          <div className="control-row">
            <label className="control-field">
              <span>Action filter</span>
              <input
                type="text"
                value={auditActionFilter}
                onChange={(event) => setAuditActionFilter(event.target.value)}
                placeholder="e.g. UPDATE_SETTINGS"
              />
            </label>
            <label className="control-field">
              <span>Success</span>
              <select
                value={auditSuccessFilter}
                onChange={(event) => setAuditSuccessFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value="true">Successful</option>
                <option value="false">Failed</option>
              </select>
            </label>
          </div>
          {auditRows.length ? (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>User</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.slice(0, 10).map((row) => (
                      <tr key={String(row._id || row.id || row.createdAt)}>
                        <td>{formatDateTime(row.createdAt)}</td>
                        <td>{row.action || '-'}</td>
                        <td>{row.entity || '-'}</td>
                        <td>{row.user?.email || row.user?.name || 'system'}</td>
                        <td>{row.success ? 'Success' : 'Failed'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="section-note">
                Showing {Math.min(auditRows.length, 10)} of{' '}
                {Number(auditPagination?.total || auditRows.length)} audit rows.
              </p>
            </>
          ) : (
            <p className="muted">No audit logs found for this filter.</p>
          )}
        </article>
      </div>
    </section>
  );
};

export default Reports;
