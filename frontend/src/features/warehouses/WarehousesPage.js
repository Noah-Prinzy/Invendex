import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveWarehouseRequest,
  createWarehouseRequest,
  getUsersRequest,
  getWarehousesRequest,
  restoreWarehouseRequest,
  updateWarehouseRequest
} from '../../api/client.js';

const MANAGE_WAREHOUSE_ROLES = new Set(['owner', 'admin']);
const WAREHOUSES_QUERY_STALE_TIME_MS = 30 * 1000;
const USERS_QUERY_STALE_TIME_MS = 30 * 1000;

const createDefaultWarehouseForm = () => ({
  name: '',
  code: '',
  region: '',
  managerUserId: '',
  street: '',
  city: '',
  state: '',
  country: '',
  postalCode: ''
});

const normalizeText = (value) => String(value || '').trim();

const toUserDateTime = (value) => {
  if (!value) return '-';
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return '-';
  return asDate.toLocaleString();
};

const buildAddressPayload = (form) => {
  const address = {
    street: normalizeText(form?.street),
    city: normalizeText(form?.city),
    state: normalizeText(form?.state),
    country: normalizeText(form?.country),
    postalCode: normalizeText(form?.postalCode)
  };

  return Object.values(address).some(Boolean) ? address : null;
};

const mapWarehouseToEditForm = (warehouse) => ({
  name: normalizeText(warehouse?.name),
  code: normalizeText(warehouse?.code),
  region: normalizeText(warehouse?.region),
  managerUserId: normalizeText(warehouse?.manager?._id),
  street: normalizeText(warehouse?.address?.street),
  city: normalizeText(warehouse?.address?.city),
  state: normalizeText(warehouse?.address?.state),
  country: normalizeText(warehouse?.address?.country),
  postalCode: normalizeText(warehouse?.address?.postalCode)
});

const renderWarehouseLocation = (warehouse) => {
  const city = normalizeText(warehouse?.address?.city);
  const state = normalizeText(warehouse?.address?.state);
  const country = normalizeText(warehouse?.address?.country);
  const location = [city, state, country].filter(Boolean).join(', ');
  return location || '-';
};

const Warehouses = ({
  accessToken = null,
  userRole = null,
  onWarehousesChanged = () => {}
}) => {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState(() =>
    createDefaultWarehouseForm()
  );
  const [editWarehouseId, setEditWarehouseId] = useState('');
  const [editForm, setEditForm] = useState(() => createDefaultWarehouseForm());

  const normalizedRole = String(userRole || '')
    .trim()
    .toLowerCase();
  const canManageWarehouses = MANAGE_WAREHOUSE_ROLES.has(normalizedRole);

  const warehousesQueryKey = useMemo(
    () => ['warehouses:management', String(accessToken || ''), normalizedRole],
    [accessToken, normalizedRole]
  );

  const warehousesQuery = useQuery({
    queryKey: warehousesQueryKey,
    enabled: Boolean(accessToken),
    staleTime: WAREHOUSES_QUERY_STALE_TIME_MS,
    queryFn: async () =>
      getWarehousesRequest(accessToken, {
        includeInactive: canManageWarehouses,
        includeArchived: canManageWarehouses
      })
  });

  const usersQuery = useQuery({
    queryKey: ['users:warehouse-managers', String(accessToken || '')],
    enabled: Boolean(accessToken) && canManageWarehouses,
    staleTime: USERS_QUERY_STALE_TIME_MS,
    queryFn: async () => getUsersRequest(accessToken)
  });

  const warehouses = useMemo(
    () => (Array.isArray(warehousesQuery.data) ? warehousesQuery.data : []),
    [warehousesQuery.data]
  );

  const managerOptions = useMemo(() => {
    const users = Array.isArray(usersQuery.data) ? usersQuery.data : [];
    const activeUsers = users
      .filter((user) => user?.isActive !== false)
      .sort((a, b) =>
        String(a?.email || '').localeCompare(
          String(b?.email || ''),
          undefined,
          {
            sensitivity: 'base'
          }
        )
      );

    return [
      { value: '', label: 'Unassigned' },
      ...activeUsers.map((user) => ({
        value: String(user?._id || ''),
        label: `${String(user?.email || 'User')} (${String(user?.role || 'staff')})`
      }))
    ];
  }, [usersQuery.data]);

  const warehouseSummary = useMemo(() => {
    const active = warehouses.filter(
      (warehouse) =>
        warehouse.isActive !== false && warehouse.isArchived !== true
    ).length;
    const archived = warehouses.filter(
      (warehouse) => warehouse.isArchived === true
    ).length;
    return {
      total: warehouses.length,
      active,
      archived
    };
  }, [warehouses]);

  const editingWarehouse = useMemo(
    () =>
      warehouses.find(
        (warehouse) => String(warehouse?._id || '') === String(editWarehouseId)
      ) || null,
    [warehouses, editWarehouseId]
  );

  const invalidateWarehouseQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['warehouses:list']
      }),
      queryClient.invalidateQueries({
        queryKey: ['warehouses:management']
      })
    ]);
    onWarehousesChanged();
  };

  const createWarehouseMutation = useMutation({
    mutationFn: (payload) =>
      createWarehouseRequest({
        accessToken,
        ...payload
      }),
    onSuccess: async (warehouse) => {
      setNotice(
        `Warehouse created: ${String(warehouse?.name || 'Warehouse')} (${String(warehouse?.code || '-')}).`
      );
      setError('');
      setCreateForm(createDefaultWarehouseForm());
      await invalidateWarehouseQueries();
      await warehousesQuery.refetch();
    },
    onError: (mutationError) => {
      setNotice('');
      setError(String(mutationError?.message || 'Failed to create warehouse'));
    }
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: ({ warehouseId, payload }) =>
      updateWarehouseRequest({
        accessToken,
        warehouseId,
        payload
      }),
    onSuccess: async (warehouse) => {
      setNotice(
        `Warehouse updated: ${String(warehouse?.name || 'Warehouse')} (${String(warehouse?.code || '-')}).`
      );
      setError('');
      await invalidateWarehouseQueries();
      await warehousesQuery.refetch();
    },
    onError: (mutationError) => {
      setNotice('');
      setError(String(mutationError?.message || 'Failed to update warehouse'));
    }
  });

  const archiveWarehouseMutation = useMutation({
    mutationFn: (warehouseId) =>
      archiveWarehouseRequest({
        accessToken,
        warehouseId
      }),
    onSuccess: async (warehouse) => {
      if (String(warehouse?._id || '') === String(editWarehouseId || '')) {
        setEditWarehouseId('');
        setEditForm(createDefaultWarehouseForm());
      }

      setNotice(
        `Warehouse archived: ${String(warehouse?.name || 'Warehouse')}.`
      );
      setError('');
      await invalidateWarehouseQueries();
      await warehousesQuery.refetch();
    },
    onError: (mutationError) => {
      setNotice('');
      setError(String(mutationError?.message || 'Failed to archive warehouse'));
    }
  });

  const restoreWarehouseMutation = useMutation({
    mutationFn: (warehouseId) =>
      restoreWarehouseRequest({
        accessToken,
        warehouseId,
        activateOnRestore: true
      }),
    onSuccess: async (warehouse) => {
      setNotice(
        `Warehouse restored: ${String(warehouse?.name || 'Warehouse')}.`
      );
      setError('');
      await invalidateWarehouseQueries();
      await warehousesQuery.refetch();
    },
    onError: (mutationError) => {
      setNotice('');
      setError(String(mutationError?.message || 'Failed to restore warehouse'));
    }
  });

  const isLoading = warehousesQuery.isLoading || warehousesQuery.isFetching;
  const isMutating =
    createWarehouseMutation.isPending ||
    updateWarehouseMutation.isPending ||
    archiveWarehouseMutation.isPending ||
    restoreWarehouseMutation.isPending;
  const queryErrorMessage = String(warehousesQuery.error?.message || '').trim();
  const displayError = String(error || queryErrorMessage || '').trim();

  const handleCreateFieldChange = (field) => (event) => {
    const nextValue = event?.target?.value || '';
    setCreateForm((current) => ({
      ...current,
      [field]: nextValue
    }));
    setNotice('');
    setError('');
  };

  const handleEditFieldChange = (field) => (event) => {
    const nextValue = event?.target?.value || '';
    setEditForm((current) => ({
      ...current,
      [field]: nextValue
    }));
    setNotice('');
    setError('');
  };

  const handleCreateWarehouse = async (event) => {
    event.preventDefault();
    if (!canManageWarehouses) return;

    const name = normalizeText(createForm.name);
    if (!name) {
      setNotice('');
      setError('Warehouse name is required');
      return;
    }

    createWarehouseMutation.mutate({
      name,
      code: normalizeText(createForm.code),
      region: normalizeText(createForm.region),
      managerUserId: normalizeText(createForm.managerUserId) || null,
      address: buildAddressPayload(createForm)
    });
  };

  const handleStartEditWarehouse = (warehouse) => {
    const warehouseId = String(warehouse?._id || '').trim();
    if (!warehouseId) return;
    setEditWarehouseId(warehouseId);
    setEditForm(mapWarehouseToEditForm(warehouse));
    setNotice('');
    setError('');
  };

  const handleCancelEditWarehouse = () => {
    setEditWarehouseId('');
    setEditForm(createDefaultWarehouseForm());
    setNotice('');
    setError('');
  };

  const handleSaveWarehouseEdit = (event) => {
    event.preventDefault();
    if (!canManageWarehouses || !editWarehouseId) return;

    const name = normalizeText(editForm.name);
    if (!name) {
      setNotice('');
      setError('Warehouse name is required');
      return;
    }

    updateWarehouseMutation.mutate({
      warehouseId: editWarehouseId,
      payload: {
        name,
        code: normalizeText(editForm.code),
        region: normalizeText(editForm.region),
        managerUserId: normalizeText(editForm.managerUserId) || null,
        address: buildAddressPayload(editForm)
      }
    });
  };

  const handleToggleWarehouseActive = async (warehouse) => {
    if (!warehouse?._id || !canManageWarehouses) return;
    updateWarehouseMutation.mutate({
      warehouseId: warehouse._id,
      payload: {
        isActive: !(warehouse.isActive !== false)
      }
    });
  };

  const handleArchiveWarehouse = async (warehouse) => {
    if (!warehouse?._id || !canManageWarehouses) return;
    archiveWarehouseMutation.mutate(warehouse._id);
  };

  const handleRestoreWarehouse = async (warehouse) => {
    if (!warehouse?._id || !canManageWarehouses) return;
    restoreWarehouseMutation.mutate(warehouse._id);
  };

  if (!canManageWarehouses) {
    return (
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Warehouse Management</h2>
            <p>Warehouse setup is restricted to owner/admin accounts.</p>
          </div>
        </header>
        <article className="access-card">
          <p className="metric-label">Permission required</p>
          <h3>Owner or admin role needed</h3>
          <p className="muted">
            Your current role is `{userRole || 'unknown'}`.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="panel-head panel-head-row">
        <div>
          <h2>Warehouse Management</h2>
          <p>
            Create and control organization warehouses used across products,
            stocktakes, and reporting.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost aligned-action-btn"
          onClick={() => warehousesQuery.refetch()}
          disabled={isLoading || isMutating}
          title="Refresh warehouse list and summary."
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      <div className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">Total warehouses</p>
          <p className="metric-value">{warehouseSummary.total}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Active warehouses</p>
          <p className="metric-value">{warehouseSummary.active}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Archived warehouses</p>
          <p className="metric-value">{warehouseSummary.archived}</p>
        </article>
      </div>

      {notice ? <p className="section-note">{notice}</p> : null}
      {displayError ? <p className="form-error">{displayError}</p> : null}

      <article className="data-card">
        <h3>Create warehouse</h3>
        <form className="control-row" onSubmit={handleCreateWarehouse}>
          <label className="control-field">
            <span>Name</span>
            <input
              type="text"
              value={createForm.name}
              onChange={handleCreateFieldChange('name')}
              placeholder="Main Warehouse"
              disabled={createWarehouseMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Code (optional)</span>
            <input
              type="text"
              value={createForm.code}
              onChange={handleCreateFieldChange('code')}
              placeholder="MAIN"
              disabled={createWarehouseMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Region (optional)</span>
            <input
              type="text"
              value={createForm.region}
              onChange={handleCreateFieldChange('region')}
              placeholder="Kampala"
              disabled={createWarehouseMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Manager</span>
            <select
              value={createForm.managerUserId}
              onChange={handleCreateFieldChange('managerUserId')}
              disabled={
                createWarehouseMutation.isPending || usersQuery.isFetching
              }
            >
              {managerOptions.map((option) => (
                <option
                  key={`create-manager-${option.value || 'none'}`}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="btn-ghost"
            disabled={createWarehouseMutation.isPending}
          >
            {createWarehouseMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </form>

        <div className="control-row compact">
          <label className="control-field">
            <span>Street</span>
            <input
              type="text"
              value={createForm.street}
              onChange={handleCreateFieldChange('street')}
              placeholder="Plot 12 Industrial Area"
              disabled={createWarehouseMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>City</span>
            <input
              type="text"
              value={createForm.city}
              onChange={handleCreateFieldChange('city')}
              placeholder="Kampala"
              disabled={createWarehouseMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>State/Region</span>
            <input
              type="text"
              value={createForm.state}
              onChange={handleCreateFieldChange('state')}
              placeholder="Central Region"
              disabled={createWarehouseMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Country</span>
            <input
              type="text"
              value={createForm.country}
              onChange={handleCreateFieldChange('country')}
              placeholder="Uganda"
              disabled={createWarehouseMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Postal Code</span>
            <input
              type="text"
              value={createForm.postalCode}
              onChange={handleCreateFieldChange('postalCode')}
              placeholder="256"
              disabled={createWarehouseMutation.isPending}
            />
          </label>
        </div>
      </article>

      <article className="data-card">
        <h3>Warehouse directory</h3>
        {warehouses.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Region</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Manager</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => {
                  const warehouseId = String(warehouse?._id || '');
                  const isEditing =
                    warehouseId === String(editWarehouseId || '');
                  return (
                    <tr key={warehouseId}>
                      <td>{warehouse.name || '-'}</td>
                      <td>{warehouse.code || '-'}</td>
                      <td>{warehouse.region || '-'}</td>
                      <td>{renderWarehouseLocation(warehouse)}</td>
                      <td>
                        {warehouse.isArchived
                          ? 'Archived'
                          : warehouse.isActive === false
                            ? 'Inactive'
                            : 'Active'}
                      </td>
                      <td>{warehouse.manager?.email || '-'}</td>
                      <td>{toUserDateTime(warehouse.updatedAt)}</td>
                      <td>
                        <div className="action-row">
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={isMutating}
                            onClick={() =>
                              isEditing
                                ? handleCancelEditWarehouse()
                                : handleStartEditWarehouse(warehouse)
                            }
                          >
                            {isEditing ? 'Close edit' : 'Edit details'}
                          </button>
                          {warehouse.isArchived ? (
                            <button
                              type="button"
                              className="btn-ghost"
                              disabled={restoreWarehouseMutation.isPending}
                              onClick={() => handleRestoreWarehouse(warehouse)}
                            >
                              Restore
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn-ghost"
                                disabled={updateWarehouseMutation.isPending}
                                onClick={() =>
                                  handleToggleWarehouseActive(warehouse)
                                }
                              >
                                {warehouse.isActive === false
                                  ? 'Activate'
                                  : 'Deactivate'}
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                disabled={archiveWarehouseMutation.isPending}
                                onClick={() =>
                                  handleArchiveWarehouse(warehouse)
                                }
                              >
                                Archive
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No warehouses found yet.</p>
        )}
      </article>

      {editingWarehouse ? (
        <article className="data-card">
          <h3>Edit warehouse: {editingWarehouse.name}</h3>
          <form className="control-row" onSubmit={handleSaveWarehouseEdit}>
            <label className="control-field">
              <span>Name</span>
              <input
                type="text"
                value={editForm.name}
                onChange={handleEditFieldChange('name')}
                placeholder="Warehouse name"
                disabled={updateWarehouseMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Code</span>
              <input
                type="text"
                value={editForm.code}
                onChange={handleEditFieldChange('code')}
                placeholder="Warehouse code"
                disabled={updateWarehouseMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Region</span>
              <input
                type="text"
                value={editForm.region}
                onChange={handleEditFieldChange('region')}
                placeholder="Region"
                disabled={updateWarehouseMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Manager</span>
              <select
                value={editForm.managerUserId}
                onChange={handleEditFieldChange('managerUserId')}
                disabled={
                  updateWarehouseMutation.isPending || usersQuery.isFetching
                }
              >
                {managerOptions.map((option) => (
                  <option
                    key={`edit-manager-${option.value || 'none'}`}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="btn-ghost"
              disabled={updateWarehouseMutation.isPending}
            >
              {updateWarehouseMutation.isPending ? 'Saving...' : 'Save changes'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleCancelEditWarehouse}
              disabled={updateWarehouseMutation.isPending}
            >
              Cancel
            </button>
          </form>

          <div className="control-row compact">
            <label className="control-field">
              <span>Street</span>
              <input
                type="text"
                value={editForm.street}
                onChange={handleEditFieldChange('street')}
                placeholder="Street"
                disabled={updateWarehouseMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>City</span>
              <input
                type="text"
                value={editForm.city}
                onChange={handleEditFieldChange('city')}
                placeholder="City"
                disabled={updateWarehouseMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>State/Region</span>
              <input
                type="text"
                value={editForm.state}
                onChange={handleEditFieldChange('state')}
                placeholder="State"
                disabled={updateWarehouseMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Country</span>
              <input
                type="text"
                value={editForm.country}
                onChange={handleEditFieldChange('country')}
                placeholder="Country"
                disabled={updateWarehouseMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Postal code</span>
              <input
                type="text"
                value={editForm.postalCode}
                onChange={handleEditFieldChange('postalCode')}
                placeholder="Postal code"
                disabled={updateWarehouseMutation.isPending}
              />
            </label>
          </div>
        </article>
      ) : null}
    </section>
  );
};

export default Warehouses;
