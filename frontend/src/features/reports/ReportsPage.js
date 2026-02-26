import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
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
      const [statusData, spendData, supplierSpendData] = await Promise.all([
        getReportPurchaseOrderStatusSummaryRequest(accessToken),
        getReportSpendSummaryRequest(accessToken),
        getReportSpendBySupplierRequest(accessToken)
      ]);

      return {
        statusSummary: statusData || {},
        spendSummary: spendData || { totalSpend: 0 },
        spendBySupplier: Array.isArray(supplierSpendData)
          ? supplierSpendData
          : []
      };
    }
  });

  const statusSummary = data?.statusSummary || null;
  const spendSummary = data?.spendSummary || null;
  const spendBySupplier = useMemo(
    () => (Array.isArray(data?.spendBySupplier) ? data.spendBySupplier : []),
    [data]
  );
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
        <button
          type="button"
          className="btn-ghost"
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
        >
          {isLoading || isFetching ? 'Loading...' : 'Refresh'}
        </button>
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
      </div>
    </section>
  );
};

export default Reports;
