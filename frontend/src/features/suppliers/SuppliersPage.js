import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getSupplierRankingsRequest,
  getSuppliersRequest
} from '../../api/client.js';

const DIRECTORY_PAGE_SIZE = 8;
const RANKING_PAGE_SIZE = 6;
const SUPPLIERS_QUERY_STALE_TIME_MS = 45 * 1000;

const Suppliers = ({ accessToken, userRole = null }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [directoryPage, setDirectoryPage] = useState(1);
  const [rankingPage, setRankingPage] = useState(1);
  const isAdmin = String(userRole || '') === 'admin';
  const suppliersQueryKey = useMemo(
    () => ['suppliers:index', String(accessToken || ''), String(isAdmin)],
    [accessToken, isAdmin]
  );

  useEffect(() => {
    if (isAdmin) return;
    setDirectoryPage(1);
    setRankingPage(1);
  }, [isAdmin]);

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: suppliersQueryKey,
    enabled: Boolean(accessToken) && isAdmin,
    staleTime: SUPPLIERS_QUERY_STALE_TIME_MS,
    queryFn: async () => {
      const [suppliersData, rankingsData] = await Promise.all([
        getSuppliersRequest(accessToken),
        getSupplierRankingsRequest(accessToken)
      ]);

      return {
        suppliers: Array.isArray(suppliersData) ? suppliersData : [],
        rankings: Array.isArray(rankingsData) ? rankingsData : []
      };
    }
  });

  const suppliers = useMemo(
    () => (Array.isArray(data?.suppliers) ? data.suppliers : []),
    [data]
  );
  const rankings = useMemo(
    () => (Array.isArray(data?.rankings) ? data.rankings : []),
    [data]
  );
  const errorMessage = String(error?.message || '').trim();

  const stats = useMemo(() => {
    const activeCount = suppliers.filter(
      (supplier) => supplier.isActive !== false
    ).length;
    const topSupplier = rankings[0]?.name || suppliers[0]?.name || 'n/a';
    return {
      total: suppliers.length,
      active: activeCount,
      topSupplier
    };
  }, [suppliers, rankings]);

  const filteredDirectory = useMemo(() => {
    const normalizedSearch = String(searchTerm || '')
      .trim()
      .toLowerCase();
    const rows = suppliers.filter((row) => {
      if (normalizedSearch) {
        const haystack =
          `${row.name || ''} ${row.email || ''} ${row.phone || ''}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }

      if (statusFilter === 'active' && row.isActive === false) return false;
      if (statusFilter === 'inactive' && row.isActive !== false) return false;

      return true;
    });

    rows.sort((a, b) => {
      const direction = sortDirection === 'desc' ? -1 : 1;

      if (sortKey === 'status') {
        const aStatus = a.isActive === false ? 'inactive' : 'active';
        const bStatus = b.isActive === false ? 'inactive' : 'active';
        return aStatus.localeCompare(bStatus) * direction;
      }

      return (
        String(a[sortKey] || '').localeCompare(
          String(b[sortKey] || ''),
          undefined,
          { sensitivity: 'base' }
        ) * direction
      );
    });

    return rows;
  }, [suppliers, searchTerm, statusFilter, sortKey, sortDirection]);

  const directoryTotalPages = Math.max(
    1,
    Math.ceil(filteredDirectory.length / DIRECTORY_PAGE_SIZE)
  );

  useEffect(() => {
    setDirectoryPage((current) => Math.min(current, directoryTotalPages));
  }, [directoryTotalPages]);

  const paginatedDirectory = useMemo(() => {
    const start = (directoryPage - 1) * DIRECTORY_PAGE_SIZE;
    return filteredDirectory.slice(start, start + DIRECTORY_PAGE_SIZE);
  }, [filteredDirectory, directoryPage]);

  const filteredRankings = useMemo(() => {
    const normalizedSearch = String(searchTerm || '')
      .trim()
      .toLowerCase();
    const rows = rankings.filter((row) => {
      if (!normalizedSearch) return true;
      return String(row.name || '')
        .toLowerCase()
        .includes(normalizedSearch);
    });

    rows.sort((a, b) => Number(b.finalScore || 0) - Number(a.finalScore || 0));
    return rows;
  }, [rankings, searchTerm]);

  const rankingTotalPages = Math.max(
    1,
    Math.ceil(filteredRankings.length / RANKING_PAGE_SIZE)
  );

  useEffect(() => {
    setRankingPage((current) => Math.min(current, rankingTotalPages));
  }, [rankingTotalPages]);

  const paginatedRankings = useMemo(() => {
    const start = (rankingPage - 1) * RANKING_PAGE_SIZE;
    return filteredRankings.slice(start, start + RANKING_PAGE_SIZE);
  }, [filteredRankings, rankingPage]);

  if (!isAdmin) {
    return (
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Suppliers</h2>
            <p>Supplier analytics are restricted by backend role policy.</p>
          </div>
        </header>
        <article className="access-card">
          <p className="metric-label">Permission required</p>
          <h3>Admin role needed</h3>
          <p className="muted">
            Your current role is `{userRole || 'unknown'}`. The
            `/api/suppliers/*` endpoints are currently protected with
            `requireRoles('admin')`.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="panel-head panel-head-row">
        <div>
          <h2>Suppliers</h2>
          <p>
            Supplier directory and reliability ranking from backend analytics.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost aligned-action-btn"
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
        >
          {isLoading || isFetching ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      <div className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">Total suppliers</p>
          <p className="metric-value">{stats.total}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Active suppliers</p>
          <p className="metric-value">{stats.active}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Top ranked</p>
          <p className="metric-value">{stats.topSupplier}</p>
        </article>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className="data-grid">
        <article className="data-card">
          <h3>Supplier Directory</h3>
          <div className="control-row">
            <label className="control-field">
              <span>Search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setDirectoryPage(1);
                  setRankingPage(1);
                }}
                placeholder="Name, email, phone"
              />
            </label>
            <label className="control-field">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setDirectoryPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="control-field">
              <span>Sort</span>
              <select
                value={sortKey}
                onChange={(event) => {
                  setSortKey(event.target.value);
                  setDirectoryPage(1);
                }}
              >
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="status">Status</option>
              </select>
            </label>
            <label className="control-field">
              <span>Direction</span>
              <select
                value={sortDirection}
                onChange={(event) => {
                  setSortDirection(event.target.value);
                  setDirectoryPage(1);
                }}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
          </div>

          {filteredDirectory.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDirectory.map((supplier) => (
                    <tr key={supplier._id || supplier.id}>
                      <td>{supplier.name || '-'}</td>
                      <td>{supplier.email || '-'}</td>
                      <td>{supplier.phone || '-'}</td>
                      <td>
                        {supplier.isActive === false ? 'Inactive' : 'Active'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No suppliers match your filter.</p>
          )}

          <footer className="pagination-row">
            <p className="muted">
              Showing {paginatedDirectory.length} of {filteredDirectory.length}{' '}
              filtered suppliers ({suppliers.length} total)
            </p>
            <div className="pagination-controls">
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  setDirectoryPage((current) => Math.max(1, current - 1))
                }
                disabled={directoryPage <= 1}
              >
                Prev
              </button>
              <span className="pagination-text">
                Page {directoryPage} / {directoryTotalPages}
              </span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  setDirectoryPage((current) =>
                    Math.min(directoryTotalPages, current + 1)
                  )
                }
                disabled={directoryPage >= directoryTotalPages}
              >
                Next
              </button>
            </div>
          </footer>
        </article>

        <article className="data-card">
          <h3>Supplier Ranking</h3>
          {filteredRankings.length ? (
            <ul className="rank-list">
              {paginatedRankings.map((row) => (
                <li key={row.supplierId || row.name} className="rank-item">
                  <p>
                    #{row.rank || '-'} {row.name || 'Unknown'}
                  </p>
                  <span>{Number(row.finalScore || 0)} pts</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No ranking data available.</p>
          )}

          <footer className="pagination-row compact">
            <div className="pagination-controls">
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  setRankingPage((current) => Math.max(1, current - 1))
                }
                disabled={rankingPage <= 1}
              >
                Prev
              </button>
              <span className="pagination-text">
                Page {rankingPage} / {rankingTotalPages}
              </span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  setRankingPage((current) =>
                    Math.min(rankingTotalPages, current + 1)
                  )
                }
                disabled={rankingPage >= rankingTotalPages}
              >
                Next
              </button>
            </div>
          </footer>
        </article>
      </div>
    </section>
  );
};

export default Suppliers;
