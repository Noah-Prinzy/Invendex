import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  allocateWmsBinStockRequest,
  createWmsBinRequest,
  getProductsRequest,
  getWmsBinInventoryRequest,
  getWmsBinMovementsRequest,
  getWmsBinsRequest,
  transferWmsBinStockRequest,
  updateWmsBinRulesRequest
} from '../../../api/client.js';
import { SectionHint } from '../../../components/PageGuide.js';

const BIN_TYPES = ['STORAGE', 'PICK_FACE', 'STAGING', 'QUARANTINE'];

const createDefaultBinForm = () => ({
  code: '',
  zone: '',
  aisle: '',
  rack: '',
  shelf: '',
  binType: 'STORAGE',
  maxCapacityUnits: '',
  replenishmentMinUnits: '',
  replenishmentTargetUnits: ''
});

const createDefaultAllocationForm = () => ({
  binId: '',
  productId: '',
  quantity: '1',
  reason: ''
});

const createDefaultTransferForm = () => ({
  productId: '',
  fromBinId: '',
  toBinId: '',
  quantity: '1',
  reason: ''
});

const createDefaultRuleForm = () => ({
  maxCapacityUnits: '',
  replenishmentMinUnits: '',
  replenishmentTargetUnits: ''
});

const normalizeText = (value) => String(value || '').trim();

const resolveEntityId = (value) =>
  String(value?.id || value?._id || value || '').trim();

const resolveBinLabel = (bin, fallback = 'Bin') => {
  const code = normalizeText(bin?.code);
  const zone = normalizeText(bin?.zone);
  if (code && zone) return `${code} · ${zone}`;
  return code || zone || fallback;
};

const resolveProductLabel = (product, fallback = 'Product') => {
  const name = normalizeText(product?.name || product?.productName);
  const sku = normalizeText(product?.sku);
  if (name && sku) return `${name} (${sku})`;
  return name || sku || fallback;
};

const formatQuantity = (value) => Number(value || 0).toLocaleString();

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const BinOperationsPanel = ({
  accessToken = null,
  warehouseId = null,
  activeWarehouseLabel = 'Selected warehouse',
  prefillTransferDraft = null
}) => {
  const queryClient = useQueryClient();
  const appliedTransferDraftKeyRef = useRef('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [binForm, setBinForm] = useState(() => createDefaultBinForm());
  const [allocationForm, setAllocationForm] = useState(() =>
    createDefaultAllocationForm()
  );
  const [transferForm, setTransferForm] = useState(() =>
    createDefaultTransferForm()
  );
  const [ruleForm, setRuleForm] = useState(() => createDefaultRuleForm());
  const [selectedBinId, setSelectedBinId] = useState('');

  const scopedWarehouseId = normalizeText(warehouseId);

  const binsQuery = useQuery({
    queryKey: ['wms:bins', String(accessToken || ''), scopedWarehouseId],
    enabled: Boolean(accessToken) && Boolean(scopedWarehouseId),
    queryFn: () =>
      getWmsBinsRequest({
        accessToken,
        warehouseId: scopedWarehouseId,
        includeInactive: false
      })
  });

  const productsQuery = useQuery({
    queryKey: [
      'wms:bin-products',
      String(accessToken || ''),
      scopedWarehouseId
    ],
    enabled: Boolean(accessToken) && Boolean(scopedWarehouseId),
    queryFn: () =>
      getProductsRequest(accessToken, {
        warehouseId: scopedWarehouseId
      })
  });

  const bins = useMemo(
    () =>
      Array.isArray(binsQuery.data)
        ? [...binsQuery.data].sort((left, right) =>
            resolveBinLabel(left).localeCompare(resolveBinLabel(right))
          )
        : [],
    [binsQuery.data]
  );

  const products = useMemo(
    () =>
      Array.isArray(productsQuery.data)
        ? [...productsQuery.data].sort((left, right) =>
            resolveProductLabel(left).localeCompare(resolveProductLabel(right))
          )
        : [],
    [productsQuery.data]
  );

  useEffect(() => {
    if (!bins.length) {
      setSelectedBinId('');
      return;
    }

    const hasSelected = bins.some(
      (bin) => resolveEntityId(bin) === normalizeText(selectedBinId)
    );
    if (!hasSelected) {
      setSelectedBinId(resolveEntityId(bins[0]));
    }
  }, [bins, selectedBinId]);

  useEffect(() => {
    if (!selectedBinId) return;

    setAllocationForm((current) =>
      normalizeText(current.binId)
        ? current
        : { ...current, binId: selectedBinId }
    );

    setTransferForm((current) => {
      const next = { ...current };
      let changed = false;

      if (!normalizeText(current.fromBinId)) {
        next.fromBinId = selectedBinId;
        changed = true;
      }

      if (normalizeText(next.fromBinId) === normalizeText(next.toBinId)) {
        next.toBinId = '';
        changed = true;
      }

      return changed ? next : current;
    });
  }, [selectedBinId]);

  const selectedBin = useMemo(
    () =>
      bins.find(
        (bin) => resolveEntityId(bin) === normalizeText(selectedBinId)
      ) || null,
    [bins, selectedBinId]
  );

  useEffect(() => {
    setRuleForm({
      maxCapacityUnits:
        selectedBin?.maxCapacityUnits == null
          ? ''
          : String(selectedBin.maxCapacityUnits),
      replenishmentMinUnits:
        selectedBin?.replenishmentMinUnits == null
          ? ''
          : String(selectedBin.replenishmentMinUnits),
      replenishmentTargetUnits:
        selectedBin?.replenishmentTargetUnits == null
          ? ''
          : String(selectedBin.replenishmentTargetUnits)
    });
  }, [
    selectedBin?._id,
    selectedBin?.maxCapacityUnits,
    selectedBin?.replenishmentMinUnits,
    selectedBin?.replenishmentTargetUnits
  ]);

  useEffect(() => {
    const draftKey = normalizeText(prefillTransferDraft?.draftKey);
    if (!draftKey || appliedTransferDraftKeyRef.current === draftKey) {
      return;
    }

    const productId = normalizeText(prefillTransferDraft?.productId);
    const fromBinId = normalizeText(prefillTransferDraft?.fromBinId);
    const toBinId = normalizeText(prefillTransferDraft?.toBinId);
    const quantity = Number(prefillTransferDraft?.quantity || 0);

    if (!productId || !fromBinId || !toBinId || quantity <= 0) {
      appliedTransferDraftKeyRef.current = draftKey;
      return;
    }

    setTransferForm({
      productId,
      fromBinId,
      toBinId,
      quantity: String(quantity),
      reason: normalizeText(prefillTransferDraft?.reason)
    });
    setSelectedBinId(toBinId);
    setNotice(
      `Prepared a replenishment transfer from ${
        prefillTransferDraft?.fromBinCode || 'source bin'
      } to ${prefillTransferDraft?.toBinCode || 'target bin'}.`
    );
    setError('');
    appliedTransferDraftKeyRef.current = draftKey;
  }, [prefillTransferDraft]);

  const inventoryQuery = useQuery({
    queryKey: [
      'wms:bin-inventory',
      String(accessToken || ''),
      scopedWarehouseId,
      normalizeText(selectedBinId)
    ],
    enabled:
      Boolean(accessToken) &&
      Boolean(scopedWarehouseId) &&
      Boolean(normalizeText(selectedBinId)),
    queryFn: () =>
      getWmsBinInventoryRequest({
        accessToken,
        warehouseId: scopedWarehouseId,
        binId: normalizeText(selectedBinId),
        limit: 100
      })
  });

  const movementsQuery = useQuery({
    queryKey: [
      'wms:bin-movements',
      String(accessToken || ''),
      scopedWarehouseId,
      normalizeText(selectedBinId)
    ],
    enabled:
      Boolean(accessToken) &&
      Boolean(scopedWarehouseId) &&
      Boolean(normalizeText(selectedBinId)),
    queryFn: () =>
      getWmsBinMovementsRequest({
        accessToken,
        warehouseId: scopedWarehouseId,
        binId: normalizeText(selectedBinId),
        limit: 25
      })
  });

  const inventoryData = inventoryQuery.data || {
    totals: {
      lines: 0,
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityAvailable: 0
    },
    items: []
  };

  const movementData = movementsQuery.data || {
    totals: {
      count: 0,
      inboundQuantity: 0,
      outboundQuantity: 0
    },
    movements: []
  };

  const refreshWmsQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['wms:bins']
      }),
      queryClient.invalidateQueries({
        queryKey: ['wms:bin-inventory']
      }),
      queryClient.invalidateQueries({
        queryKey: ['wms:bin-movements']
      }),
      queryClient.invalidateQueries({
        queryKey: ['dashboard:intelligence']
      })
    ]);
  };

  const createBinMutation = useMutation({
    mutationFn: (payload) =>
      createWmsBinRequest({
        accessToken,
        warehouseId: scopedWarehouseId,
        ...payload
      }),
    onSuccess: async (bin) => {
      setNotice(`Bin created: ${resolveBinLabel(bin, 'New bin')}.`);
      setError('');
      setBinForm(createDefaultBinForm());
      setSelectedBinId(resolveEntityId(bin));
      await refreshWmsQueries();
    },
    onError: (mutationError) => {
      setNotice('');
      setError(String(mutationError?.message || 'Failed to create bin'));
    }
  });

  const allocateBinStockMutation = useMutation({
    mutationFn: (payload) =>
      allocateWmsBinStockRequest({
        accessToken,
        warehouseId: scopedWarehouseId,
        ...payload
      }),
    onSuccess: async (_payload, variables) => {
      setNotice(
        `Allocated ${formatQuantity(variables?.quantity)} unit(s) into ${resolveBinLabel(bins.find((bin) => resolveEntityId(bin) === String(variables?.binId || '')))}.`
      );
      setError('');
      setSelectedBinId(String(variables?.binId || ''));
      setAllocationForm((current) => ({
        ...createDefaultAllocationForm(),
        binId: String(variables?.binId || current.binId || '')
      }));
      await refreshWmsQueries();
    },
    onError: (mutationError) => {
      setNotice('');
      setError(
        String(mutationError?.message || 'Failed to allocate stock to bin')
      );
    }
  });

  const transferBinStockMutation = useMutation({
    mutationFn: (payload) =>
      transferWmsBinStockRequest({
        accessToken,
        warehouseId: scopedWarehouseId,
        ...payload
      }),
    onSuccess: async (_payload, variables) => {
      const fromBin = bins.find(
        (bin) => resolveEntityId(bin) === String(variables?.fromBinId || '')
      );
      const toBin = bins.find(
        (bin) => resolveEntityId(bin) === String(variables?.toBinId || '')
      );

      setNotice(
        `Moved ${formatQuantity(variables?.quantity)} unit(s) from ${resolveBinLabel(fromBin)} to ${resolveBinLabel(toBin)}.`
      );
      setError('');
      setSelectedBinId(String(variables?.toBinId || ''));
      setTransferForm((current) => ({
        ...createDefaultTransferForm(),
        fromBinId: String(variables?.toBinId || current.fromBinId || '')
      }));
      await refreshWmsQueries();
    },
    onError: (mutationError) => {
      setNotice('');
      setError(
        String(
          mutationError?.message || 'Failed to transfer stock between bins'
        )
      );
    }
  });

  const updateBinRulesMutation = useMutation({
    mutationFn: ({ binId, ...payload }) =>
      updateWmsBinRulesRequest({
        accessToken,
        warehouseId: scopedWarehouseId,
        binId,
        ...payload
      }),
    onSuccess: async (bin) => {
      setNotice(`Bin rules updated: ${resolveBinLabel(bin, 'Selected bin')}.`);
      setError('');
      setSelectedBinId(resolveEntityId(bin) || normalizeText(selectedBinId));
      await refreshWmsQueries();
    },
    onError: (mutationError) => {
      setNotice('');
      setError(String(mutationError?.message || 'Failed to update bin rules'));
    }
  });

  const handleBinFieldChange = (field) => (event) => {
    const nextValue = event?.target?.value || '';
    setBinForm((current) => ({
      ...current,
      [field]: nextValue
    }));
    setNotice('');
    setError('');
  };

  const handleAllocationFieldChange = (field) => (event) => {
    const nextValue = event?.target?.value || '';
    setAllocationForm((current) => ({
      ...current,
      [field]: nextValue
    }));
    setNotice('');
    setError('');
  };

  const handleTransferFieldChange = (field) => (event) => {
    const nextValue = event?.target?.value || '';
    setTransferForm((current) => {
      const next = {
        ...current,
        [field]: nextValue
      };
      if (
        field === 'fromBinId' &&
        normalizeText(current.toBinId) === normalizeText(nextValue)
      ) {
        next.toBinId = '';
      }
      return next;
    });
    setNotice('');
    setError('');
  };

  const handleRuleFieldChange = (field) => (event) => {
    const nextValue = event?.target?.value || '';
    setRuleForm((current) => ({
      ...current,
      [field]: nextValue
    }));
    setNotice('');
    setError('');
  };

  const handleCreateBin = (event) => {
    event.preventDefault();

    const code = normalizeText(binForm.code).toUpperCase();
    if (!code) {
      setNotice('');
      setError('Bin code is required.');
      return;
    }

    createBinMutation.mutate({
      ...binForm,
      code
    });
  };

  const handleAllocateStock = (event) => {
    event.preventDefault();

    const binId = normalizeText(allocationForm.binId);
    const productId = normalizeText(allocationForm.productId);
    const quantity = Number(allocationForm.quantity);

    if (!binId || !productId) {
      setNotice('');
      setError('Choose both a bin and a product before allocating stock.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setNotice('');
      setError('Allocation quantity must be a positive whole number.');
      return;
    }

    allocateBinStockMutation.mutate({
      binId,
      productId,
      quantity,
      reason: normalizeText(allocationForm.reason)
    });
  };

  const handleTransferBetweenBins = (event) => {
    event.preventDefault();

    const productId = normalizeText(transferForm.productId);
    const fromBinId = normalizeText(transferForm.fromBinId);
    const toBinId = normalizeText(transferForm.toBinId);
    const quantity = Number(transferForm.quantity);

    if (!productId || !fromBinId || !toBinId) {
      setNotice('');
      setError('Choose the product, source bin, and destination bin.');
      return;
    }

    if (fromBinId === toBinId) {
      setNotice('');
      setError('Source and destination bins must be different.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setNotice('');
      setError('Transfer quantity must be a positive whole number.');
      return;
    }

    transferBinStockMutation.mutate({
      productId,
      fromBinId,
      toBinId,
      quantity,
      reason: normalizeText(transferForm.reason)
    });
  };

  const handleSaveBinRules = (event) => {
    event.preventDefault();

    const binId = normalizeText(selectedBinId);
    const maxCapacityUnits = normalizeText(ruleForm.maxCapacityUnits);
    const replenishmentMinUnits = normalizeText(ruleForm.replenishmentMinUnits);
    const replenishmentTargetUnits = normalizeText(
      ruleForm.replenishmentTargetUnits
    );

    if (!binId) {
      setNotice('');
      setError('Choose a bin before updating its rules.');
      return;
    }

    if (
      replenishmentMinUnits &&
      replenishmentTargetUnits &&
      Number(replenishmentTargetUnits) < Number(replenishmentMinUnits)
    ) {
      setNotice('');
      setError(
        'Replenishment target must be greater than or equal to replenishment min.'
      );
      return;
    }

    if (
      !maxCapacityUnits &&
      !replenishmentMinUnits &&
      !replenishmentTargetUnits
    ) {
      setNotice('');
      setError('Enter at least one rule value before saving.');
      return;
    }

    updateBinRulesMutation.mutate({
      binId,
      ...(maxCapacityUnits
        ? { maxCapacityUnits: Number(maxCapacityUnits) }
        : {}),
      ...(replenishmentMinUnits
        ? { replenishmentMinUnits: Number(replenishmentMinUnits) }
        : {}),
      ...(replenishmentTargetUnits
        ? { replenishmentTargetUnits: Number(replenishmentTargetUnits) }
        : {})
    });
  };

  if (!scopedWarehouseId) {
    return (
      <article className="data-card">
        <h3>Bin operations</h3>
        <SectionHint>
          Select a specific warehouse in the header before creating bins or
          moving stock inside storage locations.
        </SectionHint>
      </article>
    );
  }

  return (
    <>
      <article className="data-card">
        <h3>Bin operations</h3>
        <SectionHint>
          Manage storage locations inside{' '}
          <strong>{activeWarehouseLabel || 'the selected warehouse'}</strong>.
          Create bins, allocate stock into a bin, and move stock between bins
          without leaving the warehouse workspace.
        </SectionHint>
        {notice ? <p className="section-note">{notice}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {!bins.length ? (
          <p className="muted">
            No bins exist for this warehouse yet. Create the first bin to start
            organizing stock locations.
          </p>
        ) : null}

        <form className="control-row" onSubmit={handleCreateBin}>
          <label className="control-field">
            <span>Bin code</span>
            <input
              type="text"
              value={binForm.code}
              onChange={handleBinFieldChange('code')}
              placeholder="A-01"
              disabled={createBinMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Zone</span>
            <input
              type="text"
              value={binForm.zone}
              onChange={handleBinFieldChange('zone')}
              placeholder="Fast movers"
              disabled={createBinMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Aisle</span>
            <input
              type="text"
              value={binForm.aisle}
              onChange={handleBinFieldChange('aisle')}
              placeholder="A"
              disabled={createBinMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Bin type</span>
            <select
              value={binForm.binType}
              onChange={handleBinFieldChange('binType')}
              disabled={createBinMutation.isPending}
            >
              {BIN_TYPES.map((binType) => (
                <option key={binType} value={binType}>
                  {binType}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="btn-ghost"
            disabled={createBinMutation.isPending}
          >
            {createBinMutation.isPending ? 'Creating...' : 'Create bin'}
          </button>
        </form>

        <div className="control-row compact">
          <label className="control-field">
            <span>Rack</span>
            <input
              type="text"
              value={binForm.rack}
              onChange={handleBinFieldChange('rack')}
              placeholder="R1"
              disabled={createBinMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Shelf</span>
            <input
              type="text"
              value={binForm.shelf}
              onChange={handleBinFieldChange('shelf')}
              placeholder="S2"
              disabled={createBinMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Max capacity</span>
            <input
              type="number"
              min="0"
              step="1"
              value={binForm.maxCapacityUnits}
              onChange={handleBinFieldChange('maxCapacityUnits')}
              placeholder="200"
              disabled={createBinMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Replenishment min</span>
            <input
              type="number"
              min="0"
              step="1"
              value={binForm.replenishmentMinUnits}
              onChange={handleBinFieldChange('replenishmentMinUnits')}
              placeholder="20"
              disabled={createBinMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Replenishment target</span>
            <input
              type="number"
              min="0"
              step="1"
              value={binForm.replenishmentTargetUnits}
              onChange={handleBinFieldChange('replenishmentTargetUnits')}
              placeholder="50"
              disabled={createBinMutation.isPending}
            />
          </label>
        </div>
      </article>

      <article className="data-card">
        <h3>Bin stock actions</h3>
        <SectionHint>
          Allocate warehouse stock into a bin, then move stock between bins as
          location needs change.
        </SectionHint>
        <form className="control-row" onSubmit={handleAllocateStock}>
          <label className="control-field">
            <span>Bin</span>
            <select
              aria-label="Allocation bin"
              value={allocationForm.binId}
              onChange={handleAllocationFieldChange('binId')}
              disabled={!bins.length || allocateBinStockMutation.isPending}
            >
              <option value="">Select bin</option>
              {bins.map((bin) => {
                const binId = resolveEntityId(bin);
                return (
                  <option key={binId} value={binId}>
                    {resolveBinLabel(bin, binId)}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="control-field">
            <span>Product</span>
            <select
              aria-label="Allocation product"
              value={allocationForm.productId}
              onChange={handleAllocationFieldChange('productId')}
              disabled={!products.length || allocateBinStockMutation.isPending}
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
            <span>Quantity</span>
            <input
              aria-label="Allocation quantity"
              type="number"
              min="1"
              step="1"
              value={allocationForm.quantity}
              onChange={handleAllocationFieldChange('quantity')}
              placeholder="1"
              disabled={allocateBinStockMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Reason</span>
            <input
              type="text"
              value={allocationForm.reason}
              onChange={handleAllocationFieldChange('reason')}
              placeholder="Initial slotting"
              disabled={allocateBinStockMutation.isPending}
            />
          </label>
          <button
            type="submit"
            className="btn-ghost"
            disabled={
              allocateBinStockMutation.isPending ||
              !bins.length ||
              !products.length
            }
          >
            {allocateBinStockMutation.isPending
              ? 'Allocating...'
              : 'Allocate to bin'}
          </button>
        </form>

        <form className="control-row" onSubmit={handleTransferBetweenBins}>
          <label className="control-field">
            <span>Product</span>
            <select
              aria-label="Transfer product"
              value={transferForm.productId}
              onChange={handleTransferFieldChange('productId')}
              disabled={!products.length || transferBinStockMutation.isPending}
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
            <span>From bin</span>
            <select
              aria-label="From bin"
              value={transferForm.fromBinId}
              onChange={handleTransferFieldChange('fromBinId')}
              disabled={bins.length < 2 || transferBinStockMutation.isPending}
            >
              <option value="">Select source</option>
              {bins.map((bin) => {
                const binId = resolveEntityId(bin);
                return (
                  <option key={binId} value={binId}>
                    {resolveBinLabel(bin, binId)}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="control-field">
            <span>To bin</span>
            <select
              aria-label="To bin"
              value={transferForm.toBinId}
              onChange={handleTransferFieldChange('toBinId')}
              disabled={bins.length < 2 || transferBinStockMutation.isPending}
            >
              <option value="">Select destination</option>
              {bins
                .filter(
                  (bin) =>
                    resolveEntityId(bin) !==
                    normalizeText(transferForm.fromBinId)
                )
                .map((bin) => {
                  const binId = resolveEntityId(bin);
                  return (
                    <option key={binId} value={binId}>
                      {resolveBinLabel(bin, binId)}
                    </option>
                  );
                })}
            </select>
          </label>
          <label className="control-field">
            <span>Quantity</span>
            <input
              aria-label="Transfer quantity"
              type="number"
              min="1"
              step="1"
              value={transferForm.quantity}
              onChange={handleTransferFieldChange('quantity')}
              placeholder="1"
              disabled={transferBinStockMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Reason</span>
            <input
              type="text"
              value={transferForm.reason}
              onChange={handleTransferFieldChange('reason')}
              placeholder="Move closer to pick face"
              disabled={transferBinStockMutation.isPending}
            />
          </label>
          <button
            type="submit"
            className="btn-ghost"
            disabled={transferBinStockMutation.isPending || bins.length < 2}
          >
            {transferBinStockMutation.isPending
              ? 'Moving...'
              : 'Transfer between bins'}
          </button>
        </form>
      </article>

      <article className="data-card">
        <h3>Selected bin detail</h3>
        <SectionHint>
          Choose a bin to inspect its live inventory lines and its latest WMS
          movements.
        </SectionHint>
        <div className="control-row">
          <label className="control-field">
            <span>Selected bin</span>
            <select
              aria-label="Selected bin"
              value={selectedBinId}
              onChange={(event) => setSelectedBinId(event?.target?.value || '')}
              disabled={!bins.length}
            >
              <option value="">Select bin</option>
              {bins.map((bin) => {
                const binId = resolveEntityId(bin);
                return (
                  <option key={binId} value={binId}>
                    {resolveBinLabel(bin, binId)}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      </article>

      <article className="data-card">
        <h3>Selected bin rules</h3>
        <SectionHint>
          Tune capacity and replenishment thresholds for{' '}
          <strong>
            {selectedBin ? resolveBinLabel(selectedBin) : 'the selected bin'}
          </strong>
          . These thresholds drive replenishment recommendations in this
          warehouse.
        </SectionHint>
        {selectedBin ? (
          <form className="control-row" onSubmit={handleSaveBinRules}>
            <label className="control-field">
              <span>Max capacity</span>
              <input
                aria-label="Selected bin max capacity"
                type="number"
                min="0"
                step="1"
                value={ruleForm.maxCapacityUnits}
                onChange={handleRuleFieldChange('maxCapacityUnits')}
                placeholder="200"
                disabled={updateBinRulesMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Replenishment min</span>
              <input
                aria-label="Selected bin replenishment min"
                type="number"
                min="0"
                step="1"
                value={ruleForm.replenishmentMinUnits}
                onChange={handleRuleFieldChange('replenishmentMinUnits')}
                placeholder="20"
                disabled={updateBinRulesMutation.isPending}
              />
            </label>
            <label className="control-field">
              <span>Replenishment target</span>
              <input
                aria-label="Selected bin replenishment target"
                type="number"
                min="0"
                step="1"
                value={ruleForm.replenishmentTargetUnits}
                onChange={handleRuleFieldChange('replenishmentTargetUnits')}
                placeholder="50"
                disabled={updateBinRulesMutation.isPending}
              />
            </label>
            <button
              type="submit"
              className="btn-ghost"
              disabled={updateBinRulesMutation.isPending}
            >
              {updateBinRulesMutation.isPending
                ? 'Saving rules...'
                : 'Save bin rules'}
            </button>
          </form>
        ) : (
          <p className="muted">
            Select a bin to review and update its replenishment rules.
          </p>
        )}

        {selectedBin ? (
          <div className="metric-grid">
            <article className="metric-card">
              <p className="metric-label">Inventory lines</p>
              <p className="metric-value">
                {formatQuantity(inventoryData?.totals?.lines)}
              </p>
            </article>
            <article className="metric-card">
              <p className="metric-label">On hand</p>
              <p className="metric-value">
                {formatQuantity(inventoryData?.totals?.quantityOnHand)}
              </p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Available</p>
              <p className="metric-value">
                {formatQuantity(inventoryData?.totals?.quantityAvailable)}
              </p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Recent movements</p>
              <p className="metric-value">
                {formatQuantity(movementData?.totals?.count)}
              </p>
            </article>
          </div>
        ) : null}

        {Array.isArray(inventoryData?.items) && inventoryData.items.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>On hand</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData.items.map((row) => {
                  const rowId =
                    normalizeText(row?.inventoryId) ||
                    `${normalizeText(row?.productId)}-${normalizeText(
                      row?.updatedAt
                    )}`;
                  return (
                    <tr key={rowId}>
                      <td>{resolveProductLabel(row, '-')}</td>
                      <td>{formatQuantity(row?.quantityOnHand)}</td>
                      <td>{formatQuantity(row?.quantityReserved)}</td>
                      <td>{formatQuantity(row?.quantityAvailable)}</td>
                      <td>{formatDateTime(row?.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            No inventory lines are assigned to the selected bin yet.
          </p>
        )}

        {Array.isArray(movementData?.movements) &&
        movementData.movements.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Moved</th>
                  <th>Type</th>
                  <th>Direction</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {movementData.movements.map((row) => (
                  <tr key={normalizeText(row?.movementId)}>
                    <td>{formatDateTime(row?.movedAt)}</td>
                    <td>{row?.movementType || '-'}</td>
                    <td>{row?.direction || '-'}</td>
                    <td>{resolveProductLabel(row, '-')}</td>
                    <td>{formatQuantity(row?.quantity)}</td>
                    <td>{row?.binFromCode || '-'}</td>
                    <td>{row?.binToCode || '-'}</td>
                    <td>{row?.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            No movements have been recorded for the selected bin yet.
          </p>
        )}
      </article>
    </>
  );
};

export default BinOperationsPanel;
