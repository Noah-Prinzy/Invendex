import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  createProductsBulkImportJobRequest,
  createProductsBulkImportRequest,
  getProductsBulkImportJobStatusRequest
} from '../../../api/client.js';

const BULK_PREVIEW_ROW_LIMIT = 5;
const BULK_FIELD_KEYS = [
  'name',
  'sku',
  'skuPrefix',
  'price',
  'category',
  'description',
  'lowStockThreshold',
  'barcode',
  'barcodeType'
];
const BULK_FIELD_LABELS = {
  name: 'Name',
  sku: 'SKU',
  skuPrefix: 'SKU prefix',
  price: 'Price',
  category: 'Category',
  description: 'Description',
  lowStockThreshold: 'Low-stock threshold',
  barcode: 'Barcode',
  barcodeType: 'Barcode type'
};
const BULK_TEMPLATE_HEADERS = [
  'name',
  'sku',
  'skuPrefix',
  'price',
  'category',
  'description',
  'lowStockThreshold',
  'barcode',
  'barcodeType'
];
const BULK_IMPORT_DUPLICATE_POLICIES = [
  { value: 'skip', label: 'Skip duplicates' },
  { value: 'update', label: 'Update existing' },
  { value: 'fail', label: 'Fail duplicate rows' }
];
const BULK_IMPORT_JOB_TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED']);
const BULK_IMPORT_JOB_POLL_INTERVAL_MS = 2000;

const parseCsvMatrix = (inputText) => {
  const text = String(inputText || '');
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
};

const parseCsvToObjects = (csvText) => {
  const matrix = parseCsvMatrix(csvText).filter((row) =>
    row.some((cell) => String(cell || '').trim() !== '')
  );

  if (!matrix.length) {
    throw new Error('CSV is empty.');
  }

  const rawHeaders = matrix[0].map((cell, index) => {
    const normalized = String(cell || '').trim();
    return normalized || `column_${index + 1}`;
  });
  const seenHeaders = new Map();
  const headers = rawHeaders.map((header) => {
    const count = Number(seenHeaders.get(header) || 0) + 1;
    seenHeaders.set(header, count);
    if (count === 1) return header;
    return `${header}_${count}`;
  });

  const rows = matrix.slice(1).map((line) => {
    const rowObject = {};
    headers.forEach((header, index) => {
      rowObject[header] = String(line[index] ?? '').trim();
    });
    return rowObject;
  });

  return { headers, rows };
};

const buildDefaultBulkFieldMap = (headers = []) =>
  BULK_FIELD_KEYS.reduce((acc, key) => {
    acc[key] = headers.includes(key) ? key : '';
    return acc;
  }, {});

const sanitizeCsvExportCell = (value) => {
  const normalized = String(value ?? '');
  if (/^[=+\-@]/.test(normalized)) {
    return `'${normalized}`;
  }
  return normalized;
};

const downloadTextFile = ({ filename, content, mimeType }) => {
  const blob = new Blob([String(content || '')], {
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

const ProductsBulkImportPanel = ({
  accessToken = null,
  onProductsChanged = async () => {}
}) => {
  const [notice, setNotice] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [rowErrors, setRowErrors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [job, setJob] = useState(null);
  const [options, setOptions] = useState({
    duplicatePolicy: 'skip',
    atomic: false
  });
  const [fieldMap, setFieldMap] = useState(buildDefaultBulkFieldMap([]));

  const refreshProducts = async () => {
    try {
      await onProductsChanged();
    } catch {
      // Keep the bulk import feedback visible even if the follow-up refresh fails.
    }
  };

  const bulkImportMutation = useMutation({
    mutationFn: async ({ nextRows, nextFieldMap, nextOptions }) =>
      createProductsBulkImportRequest({
        accessToken,
        products: nextRows,
        fieldMap: nextFieldMap,
        options: nextOptions
      }),
    onSuccess: async (result) => {
      const safeResult = result || {};
      const createdCount = Number(result?.createdCount || 0);
      const updatedCount = Number(result?.updatedCount || 0);
      const skippedCount = Number(result?.skippedCount || 0);
      const failedCount = Number(result?.failedCount || 0);
      const dryRun = safeResult?.dryRun === true;

      setSummary(safeResult);
      setRowErrors(
        Array.isArray(safeResult?.rowErrors) ? safeResult.rowErrors : []
      );
      setNotice(
        dryRun
          ? `Validation completed. Valid: ${Number(safeResult?.validRows || 0)}, Invalid: ${Number(safeResult?.invalidRows || 0)}.`
          : `Bulk import completed. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}.`
      );

      if (!dryRun) {
        await refreshProducts();
      }
    },
    onError: (mutationError) => {
      setSummary(null);
      setRowErrors([]);
      setNotice(String(mutationError?.message || 'Unable to import CSV'));
    }
  });

  const bulkImportJobMutation = useMutation({
    mutationFn: async ({ nextRows, nextFieldMap, nextOptions }) =>
      createProductsBulkImportJobRequest({
        accessToken,
        products: nextRows,
        fieldMap: nextFieldMap,
        options: nextOptions
      }),
    onSuccess: (nextJob) => {
      setJob(nextJob || null);
      setSummary(null);
      setRowErrors([]);
      setNotice(
        `Bulk import queued. Job ${String(nextJob?.id || '').slice(-8)} is running in the background.`
      );
    },
    onError: (mutationError) => {
      setJob(null);
      setSummary(null);
      setRowErrors([]);
      setNotice(
        String(mutationError?.message || 'Unable to queue bulk import job')
      );
    }
  });

  useEffect(() => {
    const jobId = String(job?.id || '').trim();
    const status = String(job?.status || '')
      .trim()
      .toUpperCase();

    if (
      !accessToken ||
      !jobId ||
      BULK_IMPORT_JOB_TERMINAL_STATUSES.has(status)
    ) {
      return undefined;
    }

    let isCancelled = false;

    const pollJobStatus = async () => {
      try {
        const nextJob = await getProductsBulkImportJobStatusRequest({
          accessToken,
          jobId
        });
        if (isCancelled) return;

        setJob(nextJob || null);

        const nextStatus = String(nextJob?.status || '')
          .trim()
          .toUpperCase();
        if (nextStatus === 'RUNNING' || nextStatus === 'QUEUED') {
          const progress = Number(nextJob?.progress?.percent || 0);
          setNotice(
            `Bulk import job running... ${Math.max(0, Math.min(100, Math.round(progress)))}%`
          );
          return;
        }

        if (nextStatus === 'COMPLETED') {
          const result = nextJob?.result || null;
          setSummary(result);
          setRowErrors(
            Array.isArray(result?.rowErrors) ? result.rowErrors : []
          );
          if (result?.dryRun) {
            setNotice(
              `Background validation completed. Valid: ${Number(result?.validRows || 0)}, Invalid: ${Number(result?.invalidRows || 0)}.`
            );
          } else {
            setNotice(
              `Background import completed. Created: ${Number(result?.createdCount || 0)}, Updated: ${Number(result?.updatedCount || 0)}, Skipped: ${Number(result?.skippedCount || 0)}, Failed: ${Number(result?.failedCount || 0)}.`
            );
            await refreshProducts();
          }
          return;
        }

        if (nextStatus === 'FAILED') {
          setSummary(null);
          setRowErrors([]);
          setNotice(
            String(nextJob?.error?.message || 'Background import failed')
          );
        }
      } catch (pollError) {
        if (isCancelled) return;
        setNotice(
          String(pollError?.message || 'Unable to fetch background job status')
        );
      }
    };

    void pollJobStatus();
    const interval = setInterval(() => {
      void pollJobStatus();
    }, BULK_IMPORT_JOB_POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [accessToken, job?.id, job?.status, onProductsChanged]);

  const buildBulkImportRequestPayload = () => {
    if (!rows.length) {
      throw new Error('Upload a CSV file first.');
    }

    const normalizedFieldMap = BULK_FIELD_KEYS.reduce((acc, key) => {
      const mappedHeader = String(fieldMap?.[key] || '').trim();
      if (mappedHeader) {
        acc[key] = mappedHeader;
      }
      return acc;
    }, {});

    if (!normalizedFieldMap.name || !normalizedFieldMap.price) {
      throw new Error('Map at least Name and Price columns before importing.');
    }

    return {
      rows,
      fieldMap: normalizedFieldMap,
      options: {
        duplicatePolicy: String(options.duplicatePolicy || 'skip'),
        atomic: Boolean(options.atomic)
      }
    };
  };

  const handleBulkImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setNotice('');
    setRowErrors([]);
    setSummary(null);
    setJob(null);

    try {
      const csvText = await file.text();
      const parsed = parseCsvToObjects(csvText);
      if (!parsed.rows.length) {
        throw new Error('CSV has headers but no data rows.');
      }

      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setFieldMap((current) =>
        BULK_FIELD_KEYS.reduce((acc, key) => {
          const preferred = String(current?.[key] || '').trim();
          if (preferred && parsed.headers.includes(preferred)) {
            acc[key] = preferred;
            return acc;
          }
          acc[key] = parsed.headers.includes(key) ? key : '';
          return acc;
        }, {})
      );
      setNotice(
        `Loaded ${parsed.rows.length} rows from ${file.name}. Review mapping, then import.`
      );
    } catch (fileError) {
      setHeaders([]);
      setRows([]);
      setFieldMap(buildDefaultBulkFieldMap([]));
      setNotice(String(fileError?.message || 'Unable to parse CSV file'));
      setRowErrors([]);
      setSummary(null);
    } finally {
      event.target.value = '';
    }
  };

  const handleBulkImportFieldMapChange = (field) => (event) => {
    const value = String(event.target.value || '').trim();
    setFieldMap((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleBulkImportOptionChange = (field) => (event) => {
    const value =
      field === 'atomic' ? Boolean(event.target.checked) : event.target.value;
    setOptions((current) => ({
      ...current,
      [field]: value
    }));
  };

  const submitBulkImport = async ({ validateOnly }) => {
    setNotice('');
    setRowErrors([]);
    setSummary(null);
    setJob(null);

    const payload = buildBulkImportRequestPayload();
    await bulkImportMutation.mutateAsync({
      nextRows: payload.rows,
      nextFieldMap: payload.fieldMap,
      nextOptions: {
        validateOnly: Boolean(validateOnly),
        duplicatePolicy: payload.options.duplicatePolicy,
        atomic: payload.options.atomic
      }
    });
  };

  const handleBulkImportSubmit = async (event) => {
    event.preventDefault();
    await submitBulkImport({ validateOnly: false });
  };

  const handleBulkValidate = async () => {
    await submitBulkImport({ validateOnly: true });
  };

  const handleBulkImportInBackground = async () => {
    setNotice('');
    setRowErrors([]);
    setSummary(null);

    try {
      const payload = buildBulkImportRequestPayload();
      await bulkImportJobMutation.mutateAsync({
        nextRows: payload.rows,
        nextFieldMap: payload.fieldMap,
        nextOptions: {
          validateOnly: false,
          duplicatePolicy: payload.options.duplicatePolicy,
          atomic: payload.options.atomic
        }
      });
    } catch (error) {
      setNotice(String(error?.message || 'Unable to queue import'));
    }
  };

  const handleDownloadBulkImportErrors = () => {
    if (!rowErrors.length) return;
    const exportHeaders = [
      'rowNumber',
      'field',
      'error',
      'originalValue',
      'suggestedFix'
    ];
    const lines = [exportHeaders.join(',')];

    rowErrors.forEach((rowError) => {
      const values = [
        rowError?.row,
        rowError?.field,
        rowError?.error,
        rowError?.originalValue,
        rowError?.suggestedFix
      ].map((value) => {
        const safe = sanitizeCsvExportCell(value);
        const asString = String(safe ?? '');
        if (/[",\n]/.test(asString)) {
          return `"${asString.replace(/"/g, '""')}"`;
        }
        return asString;
      });
      lines.push(values.join(','));
    });

    downloadTextFile({
      filename: 'invendex-bulk-import-errors.csv',
      content: `${lines.join('\n')}\n`,
      mimeType: 'text/csv;charset=utf-8'
    });
  };

  const handleDownloadBulkTemplate = () => {
    const headerRow = BULK_TEMPLATE_HEADERS.join(',');
    const exampleRow = [
      'Example Product',
      '',
      'ELC',
      '29.99',
      'Electronics',
      'Optional description',
      '5',
      '1234567890123',
      'EAN13'
    ].join(',');

    downloadTextFile({
      filename: 'invendex-products-template.csv',
      content: `${headerRow}\n${exampleRow}\n`,
      mimeType: 'text/csv;charset=utf-8'
    });
  };

  const bulkImportJobStatus = String(job?.status || '')
    .trim()
    .toUpperCase();
  const isBulkImportJobActive =
    Boolean(job?.id) &&
    !BULK_IMPORT_JOB_TERMINAL_STATUSES.has(bulkImportJobStatus);
  const isBulkImportBusy =
    bulkImportMutation.isPending ||
    bulkImportJobMutation.isPending ||
    isBulkImportJobActive;

  return (
    <article className="data-card">
      <h3>Bulk import (CSV)</h3>
      <p className="muted">
        Upload a CSV file, map the columns, then import products in one run.
      </p>
      <div className="pagination-row compact bulk-template-row">
        <p className="muted">
          Use the template to get the expected column headers.
        </p>
        <button
          type="button"
          className="btn-ghost"
          onClick={handleDownloadBulkTemplate}
        >
          Download CSV template
        </button>
      </div>
      <form className="control-row" onSubmit={handleBulkImportSubmit}>
        <label className="control-field">
          <span>CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleBulkImportFileChange}
            disabled={isBulkImportBusy}
          />
        </label>
        <label className="control-field">
          <span>Duplicate handling</span>
          <select
            value={options.duplicatePolicy}
            onChange={handleBulkImportOptionChange('duplicatePolicy')}
            disabled={isBulkImportBusy}
          >
            {BULK_IMPORT_DUPLICATE_POLICIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="control-toggle">
          <div className="control-toggle-head">
            <input
              type="checkbox"
              checked={options.atomic}
              onChange={handleBulkImportOptionChange('atomic')}
              disabled={isBulkImportBusy}
            />
            <div className="control-toggle-copy">
              <span className="control-toggle-label">Atomic mode</span>
              <p className="control-toggle-hint">
                Fail the whole import if any row in the CSV is invalid.
              </p>
            </div>
          </div>
        </label>
        <button
          type="button"
          className="btn-ghost"
          onClick={handleBulkValidate}
          disabled={isBulkImportBusy || !rows.length}
        >
          {bulkImportMutation.isPending ? 'Validating...' : 'Validate CSV'}
        </button>
        <button
          type="submit"
          className="btn-ghost"
          disabled={isBulkImportBusy || !rows.length}
        >
          {bulkImportMutation.isPending ? 'Importing...' : 'Import CSV'}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={handleBulkImportInBackground}
          disabled={isBulkImportBusy || !rows.length}
        >
          {bulkImportJobMutation.isPending
            ? 'Queuing...'
            : isBulkImportJobActive
              ? 'Background job running...'
              : 'Run in background'}
        </button>
      </form>

      {notice ? <p className="section-note">{notice}</p> : null}
      {job?.id ? (
        <p className="muted">
          Job ID: {job.id} | Status: {job.status} | Progress:{' '}
          {Math.round(Number(job?.progress?.percent || 0))}%
        </p>
      ) : null}
      {summary ? (
        <div className="metric-grid">
          <article className="metric-card">
            <p className="metric-label">Rows</p>
            <p className="metric-value">{Number(summary.totalRows || 0)}</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Valid</p>
            <p className="metric-value">{Number(summary.validRows || 0)}</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Invalid</p>
            <p className="metric-value">{Number(summary.invalidRows || 0)}</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Created/Updated</p>
            <p className="metric-value">
              {Number(summary.createdCount || 0)} /{' '}
              {Number(summary.updatedCount || 0)}
            </p>
          </article>
        </div>
      ) : null}

      {rowErrors.length ? (
        <div className="pagination-row compact">
          <p className="form-error">
            {rowErrors.length} row error(s) detected.
          </p>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadBulkImportErrors}
          >
            Download errors.csv
          </button>
        </div>
      ) : null}

      {headers.length ? (
        <>
          <div className="control-row">
            {BULK_FIELD_KEYS.map((field) => (
              <label className="control-field" key={field}>
                <span>{BULK_FIELD_LABELS[field]}</span>
                <select
                  value={fieldMap[field] || ''}
                  onChange={handleBulkImportFieldMapChange(field)}
                  disabled={isBulkImportBusy}
                >
                  <option value="">Skip</option>
                  {headers.map((header) => (
                    <option key={`${field}-${header}`} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th key={`preview-head-${header}`}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, BULK_PREVIEW_ROW_LIMIT).map((row, index) => (
                  <tr key={`preview-row-${index + 1}`}>
                    {headers.map((header) => (
                      <td key={`preview-cell-${index + 1}-${header}`}>
                        {row[header] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Previewing {Math.min(rows.length, BULK_PREVIEW_ROW_LIMIT)} of{' '}
            {rows.length} rows.
          </p>
        </>
      ) : null}
    </article>
  );
};

export default ProductsBulkImportPanel;
