import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSupplierRequest,
  deleteSupplierRequest,
  getSupplierRankingsRequest,
  getSuppliersRequest,
  updateSupplierRequest
} from '../../api/client.js';
import { SectionHint } from '../../components/PageGuide.js';

const DIRECTORY_PAGE_SIZE = 8;
const RANKING_PAGE_SIZE = 6;
const SUPPLIERS_QUERY_STALE_TIME_MS = 45 * 1000;
const SUPPLIER_MANAGE_ROLES = new Set(['owner', 'admin']);
const SUPPLIER_FORM_INITIAL_STATE = Object.freeze({
  name: '',
  email: '',
  phone: '',
  isActive: true,
  notes: ''
});

const resolveSupplierId = (supplier) =>
  String(supplier?._id || supplier?.id || '').trim();

const Suppliers = ({ accessToken, userRole = null }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [directoryPage, setDirectoryPage] = useState(1);
  const [rankingPage, setRankingPage] = useState(1);
  const [supplierForm, setSupplierForm] = useState(SUPPLIER_FORM_INITIAL_STATE);
  const [editingSupplierId, setEditingSupplierId] = useState('');
  const [managementNotice, setManagementNotice] = useState('');
  const normalizedRole = String(userRole || '')
    .trim()
    .toLowerCase();
  const canManageSuppliers = SUPPLIER_MANAGE_ROLES.has(normalizedRole);
  const suppliersQueryKey = useMemo(
    () => [
      'suppliers:index',
      String(accessToken || ''),
      String(canManageSuppliers)
    ],
    [accessToken, canManageSuppliers]
  );

  useEffect(() => {
    if (canManageSuppliers) return;
    setDirectoryPage(1);
    setRankingPage(1);
  }, [canManageSuppliers]);

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: suppliersQueryKey,
    enabled: Boolean(accessToken) && canManageSuppliers,
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

  const refreshSuppliers = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['suppliers:index']
    });
    await refetch();
  };

  const createSupplierMutation = useMutation({
    mutationFn: (payload) =>
      createSupplierRequest({
        accessToken,
        ...payload
      })
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ supplierId, payload }) =>
      updateSupplierRequest({
        accessToken,
        supplierId,
        payload
      })
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (supplierId) =>
      deleteSupplierRequest({
        accessToken,
        supplierId
      })
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
          `${row.name || ''} ${row.email || ''} ${row.phone || ''} ${row.notes || ''}`.toLowerCase();
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

  const resetSupplierForm = () => {
    setSupplierForm(SUPPLIER_FORM_INITIAL_STATE);
    setEditingSupplierId('');
  };

  const handleSupplierFormChange = (field) => (event) => {
    const nextValue =
      field === 'isActive' ? event.target.value === 'true' : event.target.value;
    setSupplierForm((current) => ({
      ...current,
      [field]: nextValue
    }));
  };

  const handleEditSupplier = (supplier) => {
    setManagementNotice('');
    setEditingSupplierId(resolveSupplierId(supplier));
    setSupplierForm({
      name: String(supplier?.name || ''),
      email: String(supplier?.email || ''),
      phone: String(supplier?.phone || ''),
      isActive: supplier?.isActive !== false,
      notes: String(supplier?.notes || '')
    });
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (!supplierId) return;

    setManagementNotice('');

    try {
      await deleteSupplierMutation.mutateAsync(supplierId);
      setManagementNotice('Supplier deleted successfully.');
      if (editingSupplierId === supplierId) {
        resetSupplierForm();
      }
      await refreshSuppliers();
    } catch (mutationError) {
      setManagementNotice(
        String(mutationError?.message || 'Unable to delete supplier')
      );
    }
  };

  const handleSupplierSubmit = async (event) => {
    event.preventDefault();
    const name = String(supplierForm.name || '').trim();

    setManagementNotice('');

    if (!name) {
      setManagementNotice('Supplier name is required.');
      return;
    }

    const payload = {
      name,
      email: String(supplierForm.email || '').trim(),
      phone: String(supplierForm.phone || '').trim(),
      notes: String(supplierForm.notes || '').trim(),
      isActive: supplierForm.isActive !== false
    };

    try {
      if (editingSupplierId) {
        await updateSupplierMutation.mutateAsync({
          supplierId: editingSupplierId,
          payload
        });
        setManagementNotice('Supplier updated successfully.');
      } else {
        await createSupplierMutation.mutateAsync(payload);
        setManagementNotice('Supplier created successfully.');
      }

      resetSupplierForm();
      await refreshSuppliers();
    } catch (mutationError) {
      setManagementNotice(
        String(
          mutationError?.message ||
            (editingSupplierId
              ? 'Unable to update supplier'
              : 'Unable to create supplier')
        )
      );
    }
  };

  const isSubmitting =
    createSupplierMutation.isPending || updateSupplierMutation.isPending;

  if (!canManageSuppliers) {
    return (
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Suppliers</h2>
            <p>
              Supplier management is restricted by backend permission policy.
            </p>
          </div>
        </header>
        <article className="access-card">
          <p className="metric-label">Permission required</p>
          <h3>Owner or admin role needed</h3>
          <p className="muted">
            Your current role is `{userRole || 'unknown'}`. The
            `/api/suppliers/*` endpoints currently require the
            `suppliers:manage` permission.
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
            Manage supplier records and compare reliability scores from the same
            workspace.
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
      {managementNotice ? (
        <p className="section-note">{managementNotice}</p>
      ) : null}

      <div className="data-grid">
        <article className="data-card">
          <h3>{editingSupplierId ? 'Edit supplier' : 'Add supplier'}</h3>
          <SectionHint>
            Keep supplier contact data current here so purchasing and reorder
            decisions have usable supplier records.
          </SectionHint>
          <form className="control-row" onSubmit={handleSupplierSubmit}>
            <label className="control-field">
              <span>Name</span>
              <input
                type="text"
                value={supplierForm.name}
                onChange={handleSupplierFormChange('name')}
                placeholder="Supplier name"
                disabled={isSubmitting}
              />
            </label>
            <label className="control-field">
              <span>Email</span>
              <input
                type="email"
                value={supplierForm.email}
                onChange={handleSupplierFormChange('email')}
                placeholder="supplier@example.com"
                disabled={isSubmitting}
              />
            </label>
            <label className="control-field">
              <span>Phone</span>
              <input
                type="text"
                value={supplierForm.phone}
                onChange={handleSupplierFormChange('phone')}
                placeholder="+254..."
                disabled={isSubmitting}
              />
            </label>
            <label className="control-field">
              <span>Status</span>
              <select
                value={String(supplierForm.isActive)}
                onChange={handleSupplierFormChange('isActive')}
                disabled={isSubmitting}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <label className="control-field">
              <span>Notes</span>
              <input
                type="text"
                value={supplierForm.notes}
                onChange={handleSupplierFormChange('notes')}
                placeholder="Optional notes"
                disabled={isSubmitting}
              />
            </label>
            <div className="action-row">
              <button
                type="submit"
                className="btn-ghost"
                disabled={isSubmitting}
              >
                {editingSupplierId
                  ? updateSupplierMutation.isPending
                    ? 'Saving...'
                    : 'Save supplier'
                  : createSupplierMutation.isPending
                    ? 'Creating...'
                    : 'Add supplier'}
              </button>
              {editingSupplierId ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={resetSupplierForm}
                  disabled={isSubmitting}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="data-card" data-tutorial-id="suppliers-directory">
          <h3>Supplier Directory</h3>
          <SectionHint>
            Search the directory, then edit or remove supplier records from the
            same table.
          </SectionHint>
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDirectory.map((supplier) => {
                    const supplierId = resolveSupplierId(supplier);
                    return (
                      <tr key={supplierId}>
                        <td>{supplier.name || '-'}</td>
                        <td>{supplier.email || '-'}</td>
                        <td>{supplier.phone || '-'}</td>
                        <td>
                          {supplier.isActive === false ? 'Inactive' : 'Active'}
                        </td>
                        <td>
                          <div className="action-row">
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => handleEditSupplier(supplier)}
                              disabled={deleteSupplierMutation.isPending}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => handleDeleteSupplier(supplierId)}
                              disabled={deleteSupplierMutation.isPending}
                            >
                              {deleteSupplierMutation.isPending
                                ? 'Deleting...'
                                : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
          <SectionHint>
            Higher-ranked suppliers are generally more reliable based on the
            scoring model behind the scenes.
          </SectionHint>
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
