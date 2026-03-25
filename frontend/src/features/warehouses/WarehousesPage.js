import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveWarehouseRequest,
  createWarehouseRequest,
  getProductsRequest,
  getUsersRequest,
  getWarehousesRequest,
  getWmsWarehouseTransfersRequest,
  restoreWarehouseRequest,
  transferWmsWarehouseStockRequest,
  updateWarehouseRequest
} from '../../api/client.js';
import { createIdempotencyKey } from '../../api/idempotency.js';
import { SectionHint } from '../../components/PageGuide.js';
import BinOperationsPanel from './components/BinOperationsPanel.js';
import WarehouseMovementPanel from './components/WarehouseMovementPanel.js';
import WarehouseStocktakePanel from './components/WarehouseStocktakePanel.js';
import WarehouseTaskPanel from './components/WarehouseTaskPanel.js';

const SETUP_WAREHOUSE_ROLES = new Set(['owner', 'admin']);
const TRANSFER_WAREHOUSE_ROLES = new Set(['owner', 'admin', 'manager']);
const WAREHOUSES_QUERY_STALE_TIME_MS = 30 * 1000;
const USERS_QUERY_STALE_TIME_MS = 30 * 1000;
const PRODUCTS_QUERY_STALE_TIME_MS = 45 * 1000;
const TRANSFERS_QUERY_STALE_TIME_MS = 20 * 1000;

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

const createDefaultTransferForm = () => ({
  productId: '',
  fromWarehouseId: '',
  toWarehouseId: '',
  quantity: '1',
  reason: '',
  notes: ''
});

const normalizeText = (value) => String(value || '').trim();

const resolveEntityId = (value) =>
  String(value?.id || value?._id || value || '').trim();

const emailToUsernameFallback = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  return normalized.includes('@') ? normalized.split('@')[0] : normalized;
};

const resolveUserDisplayName = (user, fallback = 'User') =>
  normalizeText(user?.username) ||
  normalizeText(user?.name) ||
  emailToUsernameFallback(user?.email) ||
  fallback;

const resolveWarehouseLabel = (warehouse, fallback = 'Warehouse') =>
  normalizeText(warehouse?.code) || normalizeText(warehouse?.name) || fallback;

const resolveProductLabel = (product, fallback = 'Product') => {
  const name = normalizeText(product?.name);
  const sku = normalizeText(product?.sku);

  if (name && sku) {
    return `${name} (${sku})`;
  }

  return name || sku || fallback;
};

const toUserDateTime = (value) => {
  if (!value) return '-';
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return '-';
  return asDate.toLocaleString();
};

const formatQuantity = (value) => Number(value || 0).toLocaleString();

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
  warehouseId = null,
  activeWarehouseLabel = 'All warehouses',
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
  const [transferForm, setTransferForm] = useState(() =>
    createDefaultTransferForm()
  );
  const [prefilledBinTransferDraft, setPrefilledBinTransferDraft] =
    useState(null);

  const normalizedRole = normalizeText(userRole).toLowerCase();
  const canManageWarehouseSetup = SETUP_WAREHOUSE_ROLES.has(normalizedRole);
  const canManageTransfers = TRANSFER_WAREHOUSE_ROLES.has(normalizedRole);
  const canAccessWarehouseWorkspace =
    canManageWarehouseSetup || canManageTransfers;
  const scopedWarehouseId = normalizeText(warehouseId);

  const warehousesQueryKey = useMemo(
    () => ['warehouses:management', String(accessToken || ''), normalizedRole],
    [accessToken, normalizedRole]
  );

  const warehousesQuery = useQuery({
    queryKey: warehousesQueryKey,
    enabled: Boolean(accessToken) && canAccessWarehouseWorkspace,
    staleTime: WAREHOUSES_QUERY_STALE_TIME_MS,
    queryFn: async () =>
      getWarehousesRequest(accessToken, {
        includeInactive: canManageWarehouseSetup,
        includeArchived: canManageWarehouseSetup
      })
  });

  const usersQuery = useQuery({
    queryKey: ['users:warehouse-managers', String(accessToken || '')],
    enabled: Boolean(accessToken) && canManageWarehouseSetup,
    staleTime: USERS_QUERY_STALE_TIME_MS,
    queryFn: async () => getUsersRequest(accessToken)
  });

  const productsQuery = useQuery({
    queryKey: ['warehouses:transfer-products', String(accessToken || '')],
    enabled: Boolean(accessToken) && canManageTransfers,
    staleTime: PRODUCTS_QUERY_STALE_TIME_MS,
    queryFn: async () => getProductsRequest(accessToken, {})
  });

  const transfersQuery = useQuery({
    queryKey: [
      'wms:warehouse-transfers',
      String(accessToken || ''),
      scopedWarehouseId
    ],
    enabled: Boolean(accessToken) && canManageTransfers,
    staleTime: TRANSFERS_QUERY_STALE_TIME_MS,
    queryFn: async () =>
      getWmsWarehouseTransfersRequest({
        accessToken,
        warehouseId: scopedWarehouseId || null,
        limit: 25
      })
  });

  const warehouses = useMemo(
    () => (Array.isArray(warehousesQuery.data) ? warehousesQuery.data : []),
    [warehousesQuery.data]
  );

  const activeWarehouses = useMemo(
    () =>
      warehouses.filter(
        (warehouse) =>
          warehouse?.isActive !== false && warehouse?.isArchived !== true
      ),
    [warehouses]
  );

  const transferWarehouseOptions = useMemo(
    () =>
      [...activeWarehouses].sort((left, right) =>
        resolveWarehouseLabel(left).localeCompare(
          resolveWarehouseLabel(right),
          undefined,
          { sensitivity: 'base' }
        )
      ),
    [activeWarehouses]
  );

  const products = useMemo(() => {
    const rows = Array.isArray(productsQuery.data) ? productsQuery.data : [];
    return [...rows].sort((left, right) =>
      resolveProductLabel(left).localeCompare(
        resolveProductLabel(right),
        undefined,
        { sensitivity: 'base' }
      )
    );
  }, [productsQuery.data]);

  const transferRows = useMemo(
    () => (Array.isArray(transfersQuery.data) ? transfersQuery.data : []),
    [transfersQuery.data]
  );

  const managerOptions = useMemo(() => {
    const users = Array.isArray(usersQuery.data) ? usersQuery.data : [];
    const activeUsers = users
      .filter((user) => user?.isActive !== false)
      .sort((a, b) =>
        resolveUserDisplayName(a).localeCompare(
          resolveUserDisplayName(b),
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
        label: `${resolveUserDisplayName(user)} (${String(user?.role || 'staff')})`
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

  const transferSummary = useMemo(
    () =>
      transferRows.reduce(
        (summary, row) => {
          summary.count += 1;
          summary.quantity += Number(row?.quantity || 0);
          return summary;
        },
        {
          count: 0,
          quantity: 0
        }
      ),
    [transferRows]
  );

  const editingWarehouse = useMemo(
    () =>
      warehouses.find(
        (warehouse) => String(warehouse?._id || '') === String(editWarehouseId)
      ) || null,
    [warehouses, editWarehouseId]
  );

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) =>
          resolveEntityId(product) === normalizeText(transferForm.productId)
      ) || null,
    [products, transferForm.productId]
  );

  const selectedFromWarehouse = useMemo(
    () =>
      transferWarehouseOptions.find(
        (warehouse) =>
          resolveEntityId(warehouse) ===
          normalizeText(transferForm.fromWarehouseId)
      ) || null,
    [transferWarehouseOptions, transferForm.fromWarehouseId]
  );

  const selectedToWarehouse = useMemo(
    () =>
      transferWarehouseOptions.find(
        (warehouse) =>
          resolveEntityId(warehouse) ===
          normalizeText(transferForm.toWarehouseId)
      ) || null,
    [transferWarehouseOptions, transferForm.toWarehouseId]
  );

  const defaultTransferSourceWarehouseId = useMemo(() => {
    if (
      scopedWarehouseId &&
      transferWarehouseOptions.some(
        (warehouse) => resolveEntityId(warehouse) === scopedWarehouseId
      )
    ) {
      return scopedWarehouseId;
    }

    return resolveEntityId(transferWarehouseOptions[0]);
  }, [scopedWarehouseId, transferWarehouseOptions]);

  useEffect(() => {
    if (!defaultTransferSourceWarehouseId) return;

    setTransferForm((current) => {
      const activeWarehouseIds = new Set(
        transferWarehouseOptions.map((warehouse) => resolveEntityId(warehouse))
      );
      const currentFromWarehouseId = normalizeText(current.fromWarehouseId);
      const currentToWarehouseId = normalizeText(current.toWarehouseId);

      let changed = false;
      let next = current;

      if (
        !currentFromWarehouseId ||
        !activeWarehouseIds.has(currentFromWarehouseId)
      ) {
        next = {
          ...next,
          fromWarehouseId: defaultTransferSourceWarehouseId
        };
        changed = true;
      }

      const nextFromWarehouseId = normalizeText(next.fromWarehouseId);
      if (
        currentToWarehouseId &&
        (!activeWarehouseIds.has(currentToWarehouseId) ||
          currentToWarehouseId === nextFromWarehouseId)
      ) {
        next = {
          ...next,
          toWarehouseId: ''
        };
        changed = true;
      }

      return changed ? next : current;
    });
  }, [defaultTransferSourceWarehouseId, transferWarehouseOptions]);

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

  const refreshWorkspace = async () => {
    const jobs = [warehousesQuery.refetch()];

    if (canManageWarehouseSetup) {
      jobs.push(usersQuery.refetch());
    }

    if (canManageTransfers) {
      jobs.push(productsQuery.refetch(), transfersQuery.refetch());
    }

    await Promise.all(jobs);
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
    mutationFn: ({ warehouseId: nextWarehouseId, payload }) =>
      updateWarehouseRequest({
        accessToken,
        warehouseId: nextWarehouseId,
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
    mutationFn: (nextWarehouseId) =>
      archiveWarehouseRequest({
        accessToken,
        warehouseId: nextWarehouseId
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
    mutationFn: (nextWarehouseId) =>
      restoreWarehouseRequest({
        accessToken,
        warehouseId: nextWarehouseId,
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

  const transferWarehouseStockMutation = useMutation({
    mutationFn: (payload) =>
      transferWmsWarehouseStockRequest({
        accessToken,
        ...payload
      }),
    onSuccess: async (_result, variables) => {
      const product = products.find(
        (row) => resolveEntityId(row) === String(variables?.productId || '')
      );
      const fromWarehouse = transferWarehouseOptions.find(
        (row) =>
          resolveEntityId(row) === String(variables?.fromWarehouseId || '')
      );
      const toWarehouse = transferWarehouseOptions.find(
        (row) => resolveEntityId(row) === String(variables?.toWarehouseId || '')
      );

      setNotice(
        `Transferred ${formatQuantity(variables?.quantity)} unit(s) of ${resolveProductLabel(product)} from ${resolveWarehouseLabel(fromWarehouse)} to ${resolveWarehouseLabel(toWarehouse)}.`
      );
      setError('');
      setTransferForm({
        ...createDefaultTransferForm(),
        fromWarehouseId: defaultTransferSourceWarehouseId || ''
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['products:index']
        }),
        queryClient.invalidateQueries({
          queryKey: ['wms:warehouse-transfers']
        })
      ]);
      await Promise.all([warehousesQuery.refetch(), transfersQuery.refetch()]);
    },
    onError: (mutationError) => {
      setNotice('');
      setError(
        String(mutationError?.message || 'Failed to transfer warehouse stock')
      );
    }
  });

  const isLoading =
    warehousesQuery.isLoading ||
    warehousesQuery.isFetching ||
    (canManageWarehouseSetup &&
      (usersQuery.isLoading || usersQuery.isFetching)) ||
    (canManageTransfers &&
      (productsQuery.isLoading ||
        productsQuery.isFetching ||
        transfersQuery.isLoading ||
        transfersQuery.isFetching));

  const isMutating =
    createWarehouseMutation.isPending ||
    updateWarehouseMutation.isPending ||
    archiveWarehouseMutation.isPending ||
    restoreWarehouseMutation.isPending ||
    transferWarehouseStockMutation.isPending;

  const queryErrorMessage = [
    warehousesQuery.error?.message,
    usersQuery.error?.message,
    productsQuery.error?.message,
    transfersQuery.error?.message
  ]
    .map((value) => normalizeText(value))
    .find(Boolean);

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

  const handleTransferFieldChange = (field) => (event) => {
    const nextValue = event?.target?.value || '';

    setTransferForm((current) => {
      const nextState = {
        ...current,
        [field]: nextValue
      };

      if (
        field === 'fromWarehouseId' &&
        normalizeText(current.toWarehouseId) === normalizeText(nextValue)
      ) {
        nextState.toWarehouseId = '';
      }

      return nextState;
    });
    setNotice('');
    setError('');
  };

  const handleCreateWarehouse = async (event) => {
    event.preventDefault();
    if (!canManageWarehouseSetup) return;

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
    const nextWarehouseId = String(warehouse?._id || '').trim();
    if (!nextWarehouseId) return;
    setEditWarehouseId(nextWarehouseId);
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
    if (!canManageWarehouseSetup || !editWarehouseId) return;

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
    if (!warehouse?._id || !canManageWarehouseSetup) return;
    updateWarehouseMutation.mutate({
      warehouseId: warehouse._id,
      payload: {
        isActive: !(warehouse.isActive !== false)
      }
    });
  };

  const handleArchiveWarehouse = async (warehouse) => {
    if (!warehouse?._id || !canManageWarehouseSetup) return;
    archiveWarehouseMutation.mutate(warehouse._id);
  };

  const handleRestoreWarehouse = async (warehouse) => {
    if (!warehouse?._id || !canManageWarehouseSetup) return;
    restoreWarehouseMutation.mutate(warehouse._id);
  };

  const handleTransferWarehouseStock = (event) => {
    event.preventDefault();
    if (!canManageTransfers) return;

    const productId = normalizeText(transferForm.productId);
    const fromWarehouseId = normalizeText(transferForm.fromWarehouseId);
    const toWarehouseId = normalizeText(transferForm.toWarehouseId);
    const quantity = Number(transferForm.quantity);

    if (transferWarehouseOptions.length < 2) {
      setNotice('');
      setError('At least two active warehouses are required for a transfer.');
      return;
    }

    if (!productId) {
      setNotice('');
      setError('Select a product before transferring stock.');
      return;
    }

    if (!fromWarehouseId) {
      setNotice('');
      setError('Select a source warehouse.');
      return;
    }

    if (!toWarehouseId) {
      setNotice('');
      setError('Select a destination warehouse.');
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      setNotice('');
      setError('Source and destination warehouses must be different.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setNotice('');
      setError('Quantity must be a positive whole number.');
      return;
    }

    transferWarehouseStockMutation.mutate({
      productId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      reason: normalizeText(transferForm.reason),
      notes: normalizeText(transferForm.notes),
      idempotencyKey: createIdempotencyKey('warehouse-transfer')
    });
  };

  const handlePrepareReplenishmentTransfer = (draft) => {
    setPrefilledBinTransferDraft(draft);
  };

  if (!canAccessWarehouseWorkspace) {
    return (
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Warehouse Operations</h2>
            <p>
              Warehouse setup and transfers are restricted to manager, admin,
              and owner accounts.
            </p>
          </div>
        </header>
        <article className="access-card">
          <p className="metric-label">Permission required</p>
          <h3>Manager, admin, or owner role needed</h3>
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
          <h2>Warehouse Operations</h2>
          <p>
            Review warehouse coverage, move stock between active locations, and
            keep the warehouse setup aligned with the rest of the workspace.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost aligned-action-btn"
          onClick={refreshWorkspace}
          disabled={isLoading || isMutating}
          title="Refresh warehouse setup, products, and transfer history."
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
        {canManageTransfers ? (
          <article className="metric-card">
            <p className="metric-label">Transfers in view</p>
            <p className="metric-value">{transferSummary.count}</p>
          </article>
        ) : null}
      </div>

      {notice ? <p className="section-note">{notice}</p> : null}
      {displayError ? <p className="form-error">{displayError}</p> : null}

      {canManageTransfers ? (
        <article className="data-card">
          <h3>Warehouse transfer</h3>
          <SectionHint>
            Move stock between active warehouses with a single operation. The
            recent transfer ledger below is scoped to{' '}
            <strong>{activeWarehouseLabel || 'All warehouses'}</strong>.
          </SectionHint>
          <form className="control-row" onSubmit={handleTransferWarehouseStock}>
            <label className="control-field">
              <span>Product</span>
              <select
                aria-label="Product"
                value={transferForm.productId}
                onChange={handleTransferFieldChange('productId')}
                disabled={
                  transferWarehouseStockMutation.isPending || !products.length
                }
              >
                <option value="">Select product</option>
                {products.map((product) => {
                  const productId = resolveEntityId(product);
                  return (
                    <option key={productId} value={productId}>
                      {resolveProductLabel(product, productId)}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="control-field">
              <span>From warehouse</span>
              <select
                aria-label="From warehouse"
                value={transferForm.fromWarehouseId}
                onChange={handleTransferFieldChange('fromWarehouseId')}
                disabled={
                  transferWarehouseStockMutation.isPending ||
                  !transferWarehouseOptions.length
                }
              >
                <option value="">Select source</option>
                {transferWarehouseOptions.map((warehouse) => {
                  const optionWarehouseId = resolveEntityId(warehouse);
                  return (
                    <option key={optionWarehouseId} value={optionWarehouseId}>
                      {resolveWarehouseLabel(warehouse, optionWarehouseId)}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="control-field">
              <span>To warehouse</span>
              <select
                aria-label="To warehouse"
                value={transferForm.toWarehouseId}
                onChange={handleTransferFieldChange('toWarehouseId')}
                disabled={
                  transferWarehouseStockMutation.isPending ||
                  transferWarehouseOptions.length < 2
                }
              >
                <option value="">Select destination</option>
                {transferWarehouseOptions
                  .filter(
                    (warehouse) =>
                      resolveEntityId(warehouse) !==
                      normalizeText(transferForm.fromWarehouseId)
                  )
                  .map((warehouse) => {
                    const optionWarehouseId = resolveEntityId(warehouse);
                    return (
                      <option key={optionWarehouseId} value={optionWarehouseId}>
                        {resolveWarehouseLabel(warehouse, optionWarehouseId)}
                      </option>
                    );
                  })}
              </select>
            </label>
            <label className="control-field">
              <span>Quantity</span>
              <input
                aria-label="Quantity"
                type="number"
                min="1"
                step="1"
                value={transferForm.quantity}
                onChange={handleTransferFieldChange('quantity')}
                placeholder="1"
                disabled={transferWarehouseStockMutation.isPending}
              />
            </label>
            <button
              type="submit"
              className="btn-ghost"
              disabled={
                transferWarehouseStockMutation.isPending ||
                !products.length ||
                transferWarehouseOptions.length < 2
              }
            >
              {transferWarehouseStockMutation.isPending
                ? 'Transferring...'
                : 'Transfer stock'}
            </button>
          </form>

          <div className="control-row compact">
            <label className="control-field">
              <span>Reason (optional)</span>
              <input
                type="text"
                value={transferForm.reason}
                onChange={handleTransferFieldChange('reason')}
                placeholder="Balance overflow stock"
                disabled={transferWarehouseStockMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Notes (optional)</span>
              <input
                type="text"
                value={transferForm.notes}
                onChange={handleTransferFieldChange('notes')}
                placeholder="Moved ahead of weekend demand"
                disabled={transferWarehouseStockMutation.isPending}
              />
            </label>
          </div>

          <p className="muted">
            Scope: <strong>{activeWarehouseLabel || 'All warehouses'}</strong>.{' '}
            Transfers use active warehouses only and require the `wms:manage`
            permission.
          </p>
          {transferWarehouseOptions.length < 2 ? (
            <p className="muted">
              Create or restore at least two active warehouses before moving
              stock between locations.
            </p>
          ) : null}
          {!products.length ? (
            <p className="muted">
              No products are available for transfer yet. Create products first
              so warehouse movement can be recorded properly.
            </p>
          ) : null}
          {selectedProduct && selectedFromWarehouse && selectedToWarehouse ? (
            <p className="muted">
              Pending transfer: {resolveProductLabel(selectedProduct)} from{' '}
              {resolveWarehouseLabel(selectedFromWarehouse)} to{' '}
              {resolveWarehouseLabel(selectedToWarehouse)}.
            </p>
          ) : null}
        </article>
      ) : null}

      {canManageTransfers ? (
        <BinOperationsPanel
          accessToken={accessToken}
          warehouseId={scopedWarehouseId || null}
          activeWarehouseLabel={activeWarehouseLabel}
          prefillTransferDraft={prefilledBinTransferDraft}
        />
      ) : null}

      {canManageTransfers ? (
        <WarehouseTaskPanel
          accessToken={accessToken}
          warehouseId={scopedWarehouseId || null}
          activeWarehouseLabel={activeWarehouseLabel}
          onPrepareBinTransfer={handlePrepareReplenishmentTransfer}
        />
      ) : null}

      {canManageTransfers ? (
        <WarehouseMovementPanel
          accessToken={accessToken}
          warehouseId={scopedWarehouseId || null}
          activeWarehouseLabel={activeWarehouseLabel}
          products={products}
        />
      ) : null}

      {canManageTransfers ? (
        <WarehouseStocktakePanel
          accessToken={accessToken}
          warehouseId={scopedWarehouseId || null}
          activeWarehouseLabel={activeWarehouseLabel}
        />
      ) : null}

      {canManageTransfers && !canManageWarehouseSetup ? (
        <article className="data-card">
          <h3>Operational access</h3>
          <SectionHint>
            Managers can review warehouses and move stock here. Warehouse
            creation, archiving, and manager assignment stay restricted to
            owner/admin accounts so location setup remains controlled.
          </SectionHint>
        </article>
      ) : null}

      {canManageWarehouseSetup ? (
        <article className="data-card" data-tutorial-id="warehouses-create">
          <h3>Create warehouse</h3>
          <SectionHint>
            Create a location once, then the rest of the app can filter stock
            and reports by that warehouse automatically.
          </SectionHint>
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
      ) : null}

      <article className="data-card" data-tutorial-id="warehouses-directory">
        <h3>Warehouse directory</h3>
        <SectionHint>
          {canManageWarehouseSetup
            ? 'Use the directory to review live status, assigned manager, and whether a warehouse should stay active, be edited, or be archived.'
            : 'Use the directory to confirm which warehouses are active and who owns each location before moving stock.'}
        </SectionHint>
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
                  {canManageWarehouseSetup ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => {
                  const currentWarehouseId = String(warehouse?._id || '');
                  const isEditing =
                    currentWarehouseId === String(editWarehouseId || '');
                  return (
                    <tr key={currentWarehouseId}>
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
                      <td>{resolveUserDisplayName(warehouse.manager, '-')}</td>
                      <td>{toUserDateTime(warehouse.updatedAt)}</td>
                      {canManageWarehouseSetup ? (
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
                                onClick={() =>
                                  handleRestoreWarehouse(warehouse)
                                }
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
                      ) : null}
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

      {canManageTransfers ? (
        <article className="data-card">
          <h3>Recent warehouse transfers</h3>
          <SectionHint>
            Review the latest cross-warehouse stock movement for{' '}
            <strong>{activeWarehouseLabel || 'All warehouses'}</strong> so it is
            easy to confirm what moved, when it moved, and who completed it.
          </SectionHint>
          <p className="muted">
            Loaded {transferSummary.count} transfer(s), totaling{' '}
            {formatQuantity(transferSummary.quantity)} unit(s).
          </p>
          {transferRows.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Completed by</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {transferRows.map((row) => {
                    const transferId = resolveEntityId(row);
                    return (
                      <tr key={transferId}>
                        <td>{resolveProductLabel(row?.product, '-')}</td>
                        <td>
                          {resolveWarehouseLabel(row?.fromWarehouse, '-')}
                        </td>
                        <td>{resolveWarehouseLabel(row?.toWarehouse, '-')}</td>
                        <td>{formatQuantity(row?.quantity)}</td>
                        <td>{row?.status || '-'}</td>
                        <td>{row?.reason || row?.notes || '-'}</td>
                        <td>
                          {resolveUserDisplayName(
                            row?.completedBy || row?.requestedBy,
                            '-'
                          )}
                        </td>
                        <td>
                          {toUserDateTime(row?.completedAt || row?.updatedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              No warehouse transfers have been recorded for this scope yet.
            </p>
          )}
        </article>
      ) : null}
      {canManageWarehouseSetup && editingWarehouse ? (
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
