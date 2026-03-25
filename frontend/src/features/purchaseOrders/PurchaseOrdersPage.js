import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  closePurchaseOrderRequest,
  createPurchaseOrderRequest,
  generatePurchaseOrdersFromAlertsRequest,
  getInventoryActiveReorderAlertsRequest,
  getProductsRequest,
  getPurchaseOrdersRequest,
  getSuppliersRequest,
  getWarehousesRequest,
  receivePurchaseOrderRequest,
  runInventoryReorderEngineRequest,
  sendPurchaseOrderRequest
} from '../../api/client.js';
import { createIdempotencyKey } from '../../api/idempotency.js';
import { SectionHint } from '../../components/PageGuide.js';

const LOOKUPS_QUERY_STALE_TIME_MS = 45 * 1000;
const SEND_ELIGIBLE_STATUSES = new Set(['DRAFT']);
const RECEIVE_ELIGIBLE_STATUSES = new Set(['SENT']);
const CLOSE_ELIGIBLE_STATUSES = new Set(['RECEIVED']);
const RECEIVED_STATUS = 'RECEIVED';
const TRACKING_TYPES = ['NONE', 'BATCH', 'SERIAL'];

const CREATE_FORM_INITIAL_STATE = Object.freeze({
  supplier: '',
  warehouse: '',
  expectedDeliveryDate: '',
  notes: ''
});

const LINE_FORM_INITIAL_STATE = Object.freeze({
  productId: '',
  quantity: '1',
  unitCost: '',
  purchaseUom: '',
  purchaseToBaseFactor: '1',
  trackingType: 'NONE',
  lotNumber: '',
  expiryDate: '',
  serialNumbersText: ''
});

const formatWhen = (iso) => {
  if (!iso) return 'n/a';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

const resolveEntityId = (value) =>
  String(value?.id || value?._id || '')
    .trim()
    .toString();

const parseSerialNumbersText = (value) =>
  String(value || '')
    .split(/[\n,]+/g)
    .map((entry) =>
      String(entry || '')
        .trim()
        .toUpperCase()
    )
    .filter(Boolean);

const getLineTrackingSummary = (lineItem) => {
  const trackingType = normalizeStatus(lineItem?.trackingType || 'NONE');
  if (trackingType === 'BATCH') {
    return `Batch ${lineItem?.lotNumber || 'pending lot'}`;
  }
  if (trackingType === 'SERIAL') {
    return `${Array.isArray(lineItem?.serialNumbers) ? lineItem.serialNumbers.length : 0} serial(s)`;
  }
  return 'None';
};

const PurchaseOrders = ({
  accessToken,
  warehouseId = null,
  activeWarehouseLabel = 'All warehouses',
  poEvents = []
}) => {
  const queryClient = useQueryClient();
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [createForm, setCreateForm] = useState(CREATE_FORM_INITIAL_STATE);
  const [lineForm, setLineForm] = useState(LINE_FORM_INITIAL_STATE);
  const [draftItems, setDraftItems] = useState([]);
  const [pendingCreateMode, setPendingCreateMode] = useState('');
  const [pendingAutomationMode, setPendingAutomationMode] = useState('');
  const [pendingRowAction, setPendingRowAction] = useState({
    purchaseOrderId: '',
    type: ''
  });

  const ordersQueryKey = useMemo(
    () => [
      'purchase-orders',
      String(accessToken || ''),
      String(warehouseId || '')
    ],
    [accessToken, warehouseId]
  );

  const {
    data: ordersData,
    error: ordersError,
    isLoading: ordersLoading,
    isFetching: ordersFetching,
    refetch: refetchOrders
  } = useQuery({
    queryKey: ordersQueryKey,
    enabled: Boolean(accessToken),
    queryFn: () =>
      getPurchaseOrdersRequest({
        accessToken,
        warehouseId: warehouseId || null
      })
  });

  const {
    data: lookupsData,
    error: lookupsError,
    isLoading: lookupsLoading,
    isFetching: lookupsFetching
  } = useQuery({
    queryKey: ['purchase-orders:lookups', String(accessToken || '')],
    enabled: Boolean(accessToken),
    staleTime: LOOKUPS_QUERY_STALE_TIME_MS,
    queryFn: async () => {
      const [suppliers, warehouses, products] = await Promise.all([
        getSuppliersRequest(accessToken),
        getWarehousesRequest(accessToken, {
          includeInactive: false,
          includeArchived: false
        }),
        getProductsRequest(accessToken, {})
      ]);

      return {
        suppliers: Array.isArray(suppliers) ? suppliers : [],
        warehouses: Array.isArray(warehouses) ? warehouses : [],
        products: Array.isArray(products) ? products : []
      };
    }
  });

  const {
    data: reorderAlertsData,
    error: reorderAlertsError,
    isLoading: reorderAlertsLoading,
    isFetching: reorderAlertsFetching,
    refetch: refetchReorderAlerts
  } = useQuery({
    queryKey: [
      'purchase-orders:alerts',
      String(accessToken || ''),
      String(warehouseId || '')
    ],
    enabled: Boolean(accessToken),
    staleTime: LOOKUPS_QUERY_STALE_TIME_MS,
    queryFn: () =>
      getInventoryActiveReorderAlertsRequest({
        accessToken,
        warehouseId: warehouseId || null
      })
  });

  const createMutation = useMutation({
    mutationFn: (payload) =>
      createPurchaseOrderRequest({
        accessToken,
        ...payload
      })
  });

  const sendMutation = useMutation({
    mutationFn: ({ purchaseOrderId }) =>
      sendPurchaseOrderRequest({
        accessToken,
        purchaseOrderId
      })
  });

  const receiveMutation = useMutation({
    mutationFn: ({ purchaseOrderId, idempotencyKey }) =>
      receivePurchaseOrderRequest({
        accessToken,
        purchaseOrderId,
        idempotencyKey
      })
  });

  const closeMutation = useMutation({
    mutationFn: ({ purchaseOrderId }) =>
      closePurchaseOrderRequest({
        accessToken,
        purchaseOrderId
      })
  });

  const runReorderEngineMutation = useMutation({
    mutationFn: () =>
      runInventoryReorderEngineRequest({
        accessToken
      })
  });

  const generateFromAlertsMutation = useMutation({
    mutationFn: ({ warehouse, autoSend }) =>
      generatePurchaseOrdersFromAlertsRequest({
        accessToken,
        warehouse,
        autoSend
      })
  });

  const purchaseOrders = useMemo(
    () => (Array.isArray(ordersData) ? ordersData : []),
    [ordersData]
  );
  const suppliers = useMemo(
    () => (Array.isArray(lookupsData?.suppliers) ? lookupsData.suppliers : []),
    [lookupsData]
  );
  const warehouses = useMemo(
    () =>
      Array.isArray(lookupsData?.warehouses) ? lookupsData.warehouses : [],
    [lookupsData]
  );
  const products = useMemo(
    () => (Array.isArray(lookupsData?.products) ? lookupsData.products : []),
    [lookupsData]
  );
  const reorderAlerts = useMemo(
    () => (Array.isArray(reorderAlertsData) ? reorderAlertsData : []),
    [reorderAlertsData]
  );

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) =>
          resolveEntityId(product) === String(lineForm.productId || '')
      ) || null,
    [lineForm.productId, products]
  );

  useEffect(() => {
    const normalizedWarehouseId = String(warehouseId || '').trim();
    if (!normalizedWarehouseId) return;
    if (String(createForm.warehouse || '').trim()) return;
    if (
      !warehouses.some(
        (warehouse) => resolveEntityId(warehouse) === normalizedWarehouseId
      )
    ) {
      return;
    }

    setCreateForm((current) => ({
      ...current,
      warehouse: normalizedWarehouseId
    }));
  }, [createForm.warehouse, warehouseId, warehouses]);

  const refreshOrders = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['purchase-orders']
    });
    await refetchOrders();
  };

  const refreshReorderAlerts = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['purchase-orders:alerts']
    });
    await refetchReorderAlerts();
  };

  const resetCreateWorkflow = () => {
    setCreateForm({
      ...CREATE_FORM_INITIAL_STATE,
      warehouse: String(warehouseId || '').trim()
    });
    setLineForm(LINE_FORM_INITIAL_STATE);
    setDraftItems([]);
  };

  const handleCreateFormChange = (field) => (event) => {
    const nextValue = event.target.value;
    setCreateForm((current) => ({
      ...current,
      [field]: nextValue
    }));
  };

  const handleLineFieldChange = (field) => (event) => {
    const nextValue = event.target.value;

    if (field === 'productId') {
      const nextProduct =
        products.find(
          (product) => resolveEntityId(product) === String(nextValue || '')
        ) || null;

      setLineForm((current) => ({
        ...current,
        productId: nextValue,
        purchaseUom: String(
          nextProduct?.uom?.purchase || current.purchaseUom || 'pcs'
        ),
        purchaseToBaseFactor: String(
          nextProduct?.uom?.purchaseToBaseFactor ||
            current.purchaseToBaseFactor ||
            '1'
        )
      }));
      return;
    }

    if (field === 'trackingType') {
      const normalizedTrackingType = normalizeStatus(nextValue || 'NONE');
      setLineForm((current) => ({
        ...current,
        trackingType: normalizedTrackingType,
        lotNumber:
          normalizedTrackingType === 'NONE'
            ? ''
            : String(current.lotNumber || ''),
        expiryDate:
          normalizedTrackingType === 'NONE'
            ? ''
            : String(current.expiryDate || ''),
        serialNumbersText:
          normalizedTrackingType === 'SERIAL'
            ? String(current.serialNumbersText || '')
            : ''
      }));
      return;
    }

    setLineForm((current) => ({
      ...current,
      [field]: nextValue
    }));
  };

  const handleAddLineItem = () => {
    setActionNotice('');
    setActionError('');

    const productId = String(lineForm.productId || '').trim();
    const quantity = Number(lineForm.quantity || 0);
    const unitCost = Number(lineForm.unitCost || 0);
    const trackingType = normalizeStatus(lineForm.trackingType || 'NONE');
    const purchaseToBaseFactor = Number(lineForm.purchaseToBaseFactor || 1);
    const serialNumbers = parseSerialNumbersText(lineForm.serialNumbersText);

    if (!productId) {
      setActionError('Select a product before adding a line item.');
      return;
    }

    const product =
      products.find((item) => resolveEntityId(item) === productId) || null;
    if (!product) {
      setActionError('Selected product could not be found.');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setActionError('Quantity must be greater than zero.');
      return;
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setActionError('Unit cost must be zero or higher.');
      return;
    }

    if (
      !Number.isFinite(purchaseToBaseFactor) ||
      purchaseToBaseFactor < 1 ||
      !Number.isInteger(purchaseToBaseFactor)
    ) {
      setActionError(
        'Purchase to base factor must be a whole number of at least 1.'
      );
      return;
    }

    if (trackingType === 'BATCH' && !String(lineForm.lotNumber || '').trim()) {
      setActionError('Lot number is required for batch-tracked items.');
      return;
    }

    if (trackingType === 'SERIAL') {
      if (!serialNumbers.length) {
        setActionError('Serial numbers are required for serial-tracked items.');
        return;
      }
      if (serialNumbers.length !== quantity) {
        setActionError('Serial numbers count must match the line quantity.');
        return;
      }
    }

    setDraftItems((current) => [
      ...current,
      {
        id: `${productId}:${Date.now()}:${current.length}`,
        productId,
        productName: product.name || product.sku || productId,
        sku: product.sku || '',
        quantity,
        unitCost,
        purchaseUom: String(
          lineForm.purchaseUom || product?.uom?.purchase || 'pcs'
        )
          .trim()
          .toLowerCase(),
        purchaseToBaseFactor,
        trackingType,
        lotNumber:
          trackingType === 'NONE'
            ? ''
            : String(lineForm.lotNumber || '')
                .trim()
                .toUpperCase(),
        expiryDate: String(lineForm.expiryDate || '').trim(),
        serialNumbers,
        lineTotal: Number((quantity * unitCost).toFixed(2))
      }
    ]);

    setLineForm({
      ...LINE_FORM_INITIAL_STATE,
      purchaseUom: String(product?.uom?.purchase || 'pcs'),
      purchaseToBaseFactor: String(product?.uom?.purchaseToBaseFactor || '1')
    });
    setActionNotice('Line item added to purchase order draft.');
  };

  const handleRemoveDraftItem = (lineId) => {
    setDraftItems((current) =>
      current.filter((lineItem) => String(lineItem.id) !== String(lineId))
    );
  };

  const runOrderAction = async ({
    purchaseOrderId,
    type,
    mutation,
    payload,
    successMessage,
    errorMessage
  }) => {
    if (!purchaseOrderId) return;

    setActionNotice('');
    setActionError('');
    setPendingRowAction({
      purchaseOrderId: String(purchaseOrderId),
      type
    });

    try {
      await mutation.mutateAsync(payload);
      setActionNotice(successMessage);
      await Promise.all([refreshOrders(), refreshReorderAlerts()]);
    } catch (mutationError) {
      setActionError(String(mutationError?.message || errorMessage));
    } finally {
      setPendingRowAction({
        purchaseOrderId: '',
        type: ''
      });
    }
  };

  const handleReceive = async (purchaseOrderId) =>
    runOrderAction({
      purchaseOrderId,
      type: 'receive',
      mutation: receiveMutation,
      payload: {
        purchaseOrderId,
        idempotencyKey: createIdempotencyKey('receive-purchase-order')
      },
      successMessage: 'Purchase order received successfully.',
      errorMessage: 'Unable to receive purchase order'
    });

  const handleSend = async (purchaseOrderId) =>
    runOrderAction({
      purchaseOrderId,
      type: 'send',
      mutation: sendMutation,
      payload: {
        purchaseOrderId
      },
      successMessage: 'Purchase order sent to supplier.',
      errorMessage: 'Unable to send purchase order'
    });

  const handleClose = async (purchaseOrderId) =>
    runOrderAction({
      purchaseOrderId,
      type: 'close',
      mutation: closeMutation,
      payload: {
        purchaseOrderId
      },
      successMessage: 'Purchase order closed successfully.',
      errorMessage: 'Unable to close purchase order'
    });

  const handleRunReorderEngine = async () => {
    setActionNotice('');
    setActionError('');
    setPendingAutomationMode('run-engine');

    try {
      const result = await runReorderEngineMutation.mutateAsync();
      const generatedCount = Number(result?.generated || 0);
      setActionNotice(
        generatedCount > 0
          ? `Reorder engine created ${generatedCount} active alert(s).`
          : 'Reorder engine completed. No new alerts were needed.'
      );
      await refreshReorderAlerts();
    } catch (mutationError) {
      setActionError(
        String(mutationError?.message || 'Unable to run reorder engine')
      );
    } finally {
      setPendingAutomationMode('');
    }
  };

  const handleGenerateFromAlerts = async (autoSend = false) => {
    const generationWarehouseId = String(
      warehouseId || createForm.warehouse || ''
    ).trim();

    setActionNotice('');
    setActionError('');

    if (!generationWarehouseId) {
      setActionError(
        'Select a warehouse scope before generating purchase orders from alerts.'
      );
      return;
    }

    setPendingAutomationMode(autoSend ? 'generate-send' : 'generate-draft');

    try {
      const result = await generateFromAlertsMutation.mutateAsync({
        warehouse: generationWarehouseId,
        autoSend
      });
      const createdCount = Number(result?.created || 0);
      setActionNotice(
        createdCount > 0
          ? autoSend
            ? `Generated and sent ${createdCount} purchase order(s) from active alerts.`
            : `Generated ${createdCount} draft purchase order(s) from active alerts.`
          : 'No purchase orders were generated from the current alerts.'
      );
      await Promise.all([refreshOrders(), refreshReorderAlerts()]);
    } catch (mutationError) {
      setActionError(
        String(
          mutationError?.message ||
            'Unable to generate purchase orders from alerts'
        )
      );
    } finally {
      setPendingAutomationMode('');
    }
  };

  const handleCreatePurchaseOrder = async (mode = 'draft') => {
    const supplier = String(createForm.supplier || '').trim();
    const warehouse = String(createForm.warehouse || '').trim();

    setActionNotice('');
    setActionError('');

    if (!supplier) {
      setActionError('Select a supplier before saving the purchase order.');
      return;
    }

    if (!warehouse) {
      setActionError('Select a warehouse before saving the purchase order.');
      return;
    }

    if (!draftItems.length) {
      setActionError(
        'Add at least one line item before saving the purchase order.'
      );
      return;
    }

    const payload = {
      supplier,
      warehouse,
      items: draftItems.map((lineItem) => ({
        product: lineItem.productId,
        sku: lineItem.sku,
        quantity: Number(lineItem.quantity || 0),
        unitCost: Number(lineItem.unitCost || 0),
        ...(String(lineItem.purchaseUom || '').trim()
          ? { purchaseUom: String(lineItem.purchaseUom).trim() }
          : {}),
        ...(Number.isFinite(Number(lineItem.purchaseToBaseFactor))
          ? {
              purchaseToBaseFactor: Number(lineItem.purchaseToBaseFactor)
            }
          : {}),
        ...(normalizeStatus(lineItem.trackingType) !== 'NONE'
          ? { trackingType: normalizeStatus(lineItem.trackingType) }
          : {}),
        ...(String(lineItem.lotNumber || '').trim()
          ? { lotNumber: String(lineItem.lotNumber).trim().toUpperCase() }
          : {}),
        ...(String(lineItem.expiryDate || '').trim()
          ? { expiryDate: String(lineItem.expiryDate).trim() }
          : {}),
        ...(Array.isArray(lineItem.serialNumbers) &&
        lineItem.serialNumbers.length
          ? { serialNumbers: lineItem.serialNumbers }
          : {})
      })),
      ...(String(createForm.expectedDeliveryDate || '').trim()
        ? {
            expectedDeliveryDate: String(createForm.expectedDeliveryDate).trim()
          }
        : {}),
      ...(String(createForm.notes || '').trim()
        ? { notes: String(createForm.notes).trim() }
        : {})
    };

    setPendingCreateMode(mode);

    try {
      const createdOrder = await createMutation.mutateAsync(payload);

      if (mode === 'send') {
        const createdOrderId = resolveEntityId(createdOrder);
        if (!createdOrderId) {
          throw new Error(
            'Purchase order was created, but the order id was missing from the response.'
          );
        }
        await sendMutation.mutateAsync({
          purchaseOrderId: createdOrderId
        });
        setActionNotice('Purchase order created and sent to supplier.');
      } else {
        setActionNotice('Purchase order saved as draft.');
      }

      resetCreateWorkflow();
      await refreshOrders();
    } catch (mutationError) {
      setActionError(
        String(mutationError?.message || 'Unable to create purchase order')
      );
    } finally {
      setPendingCreateMode('');
    }
  };

  const createdCount = poEvents.filter(
    (event) => event.kind === 'created'
  ).length;
  const receivedCount = poEvents.filter(
    (event) => event.kind === 'received'
  ).length;
  const updatedCount = poEvents.filter(
    (event) => event.kind === 'updated'
  ).length;
  const latestPoEvent = poEvents[0] || null;
  const queryErrorMessage = String(ordersError?.message || '').trim();
  const lookupErrorMessage = String(lookupsError?.message || '').trim();
  const reorderAlertsErrorMessage = String(
    reorderAlertsError?.message || ''
  ).trim();
  const draftTotalQuantity = draftItems.reduce(
    (sum, lineItem) => sum + Number(lineItem.quantity || 0),
    0
  );
  const draftTotalAmount = draftItems.reduce(
    (sum, lineItem) => sum + Number(lineItem.lineTotal || 0),
    0
  );
  const selectedWarehouse = warehouses.find(
    (warehouse) =>
      resolveEntityId(warehouse) === String(createForm.warehouse || '')
  );
  const activeFormWarehouseLabel =
    selectedWarehouse?.name || selectedWarehouse?.code || activeWarehouseLabel;
  const generationWarehouseId = String(
    warehouseId || createForm.warehouse || ''
  ).trim();
  const canGenerateFromAlerts = Boolean(generationWarehouseId);
  const generationWarehouseLabel =
    warehouses.find(
      (warehouse) => resolveEntityId(warehouse) === generationWarehouseId
    )?.name ||
    warehouses.find(
      (warehouse) => resolveEntityId(warehouse) === generationWarehouseId
    )?.code ||
    activeWarehouseLabel;
  const alertSuppliersCount = new Set(
    reorderAlerts
      .map((alert) =>
        String(
          alert?.supplier?._id || alert?.supplier?.id || alert?.supplier || ''
        ).trim()
      )
      .filter(Boolean)
  ).size;
  const alertSuggestedQuantity = reorderAlerts.reduce(
    (sum, alert) => sum + Number(alert?.reorderQuantity || 0),
    0
  );
  const alertEstimatedSpend = reorderAlerts.reduce(
    (sum, alert) =>
      sum +
      Number(alert?.reorderQuantity || 0) *
        Number(alert?.supplierUnitCost || 0),
    0
  );
  const selectedProductHint = selectedProduct
    ? `SKU ${selectedProduct.sku || '-'} | Purchase UOM ${String(
        selectedProduct?.uom?.purchase || 'pcs'
      )}:${Number(selectedProduct?.uom?.purchaseToBaseFactor || 1)}`
    : 'Select a product to build a PO line item.';

  return (
    <section className="panel">
      <header className="panel-head panel-head-row">
        <div>
          <h2>Purchase Order Feed</h2>
          <p>
            Create, send, receive, and close supplier orders from one place.
            Scope: {activeWarehouseLabel || 'All warehouses'}
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost aligned-action-btn"
          onClick={() => refetchOrders()}
          disabled={!accessToken || ordersLoading || ordersFetching}
        >
          {ordersLoading || ordersFetching ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      <div className="metric-grid" data-tutorial-id="purchase-orders-metrics">
        <article className="metric-card">
          <p className="metric-label">Created</p>
          <p className="metric-value">{createdCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Updated</p>
          <p className="metric-value">{updatedCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Received</p>
          <p className="metric-value">{receivedCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Open orders</p>
          <p className="metric-value">
            {
              purchaseOrders.filter(
                (order) => normalizeStatus(order?.status) !== RECEIVED_STATUS
              ).length
            }
          </p>
        </article>
      </div>

      {queryErrorMessage ? (
        <p className="form-error">{queryErrorMessage}</p>
      ) : null}
      {lookupErrorMessage ? (
        <p className="form-error">{lookupErrorMessage}</p>
      ) : null}
      {actionError ? <p className="form-error">{actionError}</p> : null}
      {actionNotice ? <p className="section-note">{actionNotice}</p> : null}

      <div className="data-grid">
        <article className="data-card">
          <h3>Reorder automation</h3>
          <SectionHint>
            Use the reorder engine to refresh active alerts, then turn those
            alerts into draft or sent purchase orders for the selected
            warehouse.
          </SectionHint>

          <div className="metric-grid">
            <article className="metric-card">
              <p className="metric-label">Active alerts</p>
              <p className="metric-value">{reorderAlerts.length}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Suppliers in scope</p>
              <p className="metric-value">{alertSuppliersCount}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Suggested quantity</p>
              <p className="metric-value">{alertSuggestedQuantity}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Estimated spend</p>
              <p className="metric-value">{formatMoney(alertEstimatedSpend)}</p>
            </article>
          </div>

          {reorderAlertsErrorMessage ? (
            <p className="form-error">{reorderAlertsErrorMessage}</p>
          ) : null}

          <div className="action-row">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => handleRunReorderEngine()}
              disabled={pendingAutomationMode !== ''}
            >
              {pendingAutomationMode === 'run-engine'
                ? 'Running...'
                : 'Run reorder engine'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => handleGenerateFromAlerts(false)}
              disabled={
                pendingAutomationMode !== '' ||
                !reorderAlerts.length ||
                !canGenerateFromAlerts
              }
            >
              {pendingAutomationMode === 'generate-draft'
                ? 'Generating...'
                : 'Generate drafts'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => handleGenerateFromAlerts(true)}
              disabled={
                pendingAutomationMode !== '' ||
                !reorderAlerts.length ||
                !canGenerateFromAlerts
              }
            >
              {pendingAutomationMode === 'generate-send'
                ? 'Sending...'
                : 'Generate and send'}
            </button>
          </div>

          <p className="section-note">
            {canGenerateFromAlerts
              ? `Generation target warehouse: ${
                  generationWarehouseLabel || 'Selected warehouse'
                }`
              : 'Choose a warehouse scope first. Generating purchase orders from alerts requires a specific warehouse.'}
          </p>

          {reorderAlertsLoading || reorderAlertsFetching ? (
            <p className="section-note">Loading active reorder alerts...</p>
          ) : reorderAlerts.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Supplier</th>
                    <th>Stock</th>
                    <th>Reorder qty</th>
                    <th>Unit cost</th>
                    <th>Triggered</th>
                  </tr>
                </thead>
                <tbody>
                  {reorderAlerts.slice(0, 12).map((alert, index) => {
                    const alertId =
                      resolveEntityId(alert) || `reorder-alert-${index}`;
                    return (
                      <tr key={alertId}>
                        <td>{alert?.product?.sku || alert?.sku || '-'}</td>
                        <td>{alert?.product?.name || '-'}</td>
                        <td>
                          {alert?.warehouse?.code ||
                            alert?.warehouse?.name ||
                            '-'}
                        </td>
                        <td>{alert?.supplier?.name || '-'}</td>
                        <td>{Number(alert?.stock || 0)}</td>
                        <td>{Number(alert?.reorderQuantity || 0)}</td>
                        <td>{formatMoney(alert?.supplierUnitCost || 0)}</td>
                        <td>{formatWhen(alert?.triggeredAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              No active reorder alerts in the current scope. Run the reorder
              engine if you want to refresh recommendations.
            </p>
          )}
        </article>

        <article className="data-card">
          <h3>Create purchase order</h3>
          <SectionHint>
            Build the order as a draft first, then send it when supplier details
            and costing are confirmed. Receive only after the goods arrive.
          </SectionHint>

          <div className="control-row">
            <label className="control-field">
              <span>Supplier</span>
              <select
                value={createForm.supplier}
                onChange={handleCreateFormChange('supplier')}
                disabled={
                  lookupsLoading || lookupsFetching || !suppliers.length
                }
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => {
                  const supplierId = resolveEntityId(supplier);
                  return (
                    <option key={supplierId} value={supplierId}>
                      {supplier.name || supplierId}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="control-field">
              <span>Warehouse</span>
              <select
                value={createForm.warehouse}
                onChange={handleCreateFormChange('warehouse')}
                disabled={
                  lookupsLoading || lookupsFetching || !warehouses.length
                }
              >
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => {
                  const warehouseEntityId = resolveEntityId(warehouse);
                  return (
                    <option key={warehouseEntityId} value={warehouseEntityId}>
                      {warehouse.code || warehouse.name || warehouseEntityId}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="control-field">
              <span>Expected delivery</span>
              <input
                type="date"
                value={createForm.expectedDeliveryDate}
                onChange={handleCreateFormChange('expectedDeliveryDate')}
              />
            </label>

            <label className="control-field">
              <span>Notes</span>
              <input
                type="text"
                value={createForm.notes}
                onChange={handleCreateFormChange('notes')}
                placeholder="Optional supplier or delivery notes"
              />
            </label>
          </div>

          <div className="control-row">
            <label className="control-field">
              <span>Product</span>
              <select
                value={lineForm.productId}
                onChange={handleLineFieldChange('productId')}
                disabled={lookupsLoading || lookupsFetching || !products.length}
              >
                <option value="">Select product</option>
                {products.map((product) => {
                  const productId = resolveEntityId(product);
                  return (
                    <option key={productId} value={productId}>
                      {product.name || product.sku || productId}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="control-field">
              <span>Quantity</span>
              <input
                type="number"
                min="1"
                step="1"
                value={lineForm.quantity}
                onChange={handleLineFieldChange('quantity')}
              />
            </label>

            <label className="control-field">
              <span>Unit cost</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={lineForm.unitCost}
                onChange={handleLineFieldChange('unitCost')}
                placeholder="0.00"
              />
            </label>

            <label className="control-field">
              <span>Purchase UOM</span>
              <input
                type="text"
                value={lineForm.purchaseUom}
                onChange={handleLineFieldChange('purchaseUom')}
                placeholder="pcs, box, case"
              />
            </label>

            <label className="control-field">
              <span>Purchase to base factor</span>
              <input
                type="number"
                min="1"
                step="1"
                value={lineForm.purchaseToBaseFactor}
                onChange={handleLineFieldChange('purchaseToBaseFactor')}
              />
            </label>

            <label className="control-field">
              <span>Tracking</span>
              <select
                value={lineForm.trackingType}
                onChange={handleLineFieldChange('trackingType')}
              >
                {TRACKING_TYPES.map((trackingType) => (
                  <option key={trackingType} value={trackingType}>
                    {trackingType}
                  </option>
                ))}
              </select>
            </label>

            <label className="control-field">
              <span>Lot number</span>
              <input
                type="text"
                value={lineForm.lotNumber}
                onChange={handleLineFieldChange('lotNumber')}
                placeholder="Required for BATCH"
                disabled={normalizeStatus(lineForm.trackingType) === 'NONE'}
              />
            </label>

            <label className="control-field">
              <span>Expiry date</span>
              <input
                type="date"
                value={lineForm.expiryDate}
                onChange={handleLineFieldChange('expiryDate')}
                disabled={normalizeStatus(lineForm.trackingType) === 'NONE'}
              />
            </label>

            <label className="control-field">
              <span>Serial numbers</span>
              <input
                type="text"
                value={lineForm.serialNumbersText}
                onChange={handleLineFieldChange('serialNumbersText')}
                placeholder="Comma-separated for SERIAL"
                disabled={normalizeStatus(lineForm.trackingType) !== 'SERIAL'}
              />
            </label>
          </div>

          <p className="section-note">{selectedProductHint}</p>

          <div className="action-row">
            <button
              type="button"
              className="btn-ghost"
              onClick={handleAddLineItem}
              disabled={lookupsLoading || lookupsFetching}
            >
              Add line item
            </button>
            <span className="section-note">
              Warehouse for this draft:{' '}
              {activeFormWarehouseLabel || 'Not selected'}
            </span>
          </div>

          {draftItems.length ? (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Unit cost</th>
                      <th>Line total</th>
                      <th>Tracking</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftItems.map((lineItem) => (
                      <tr key={lineItem.id}>
                        <td>{lineItem.sku || '-'}</td>
                        <td>{lineItem.productName || '-'}</td>
                        <td>{Number(lineItem.quantity || 0)}</td>
                        <td>{formatMoney(lineItem.unitCost)}</td>
                        <td>{formatMoney(lineItem.lineTotal)}</td>
                        <td>{getLineTrackingSummary(lineItem)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => handleRemoveDraftItem(lineItem.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="metric-grid">
                <article className="metric-card">
                  <p className="metric-label">Draft lines</p>
                  <p className="metric-value">{draftItems.length}</p>
                </article>
                <article className="metric-card">
                  <p className="metric-label">Draft quantity</p>
                  <p className="metric-value">{draftTotalQuantity}</p>
                </article>
                <article className="metric-card">
                  <p className="metric-label">Draft spend</p>
                  <p className="metric-value">
                    {formatMoney(draftTotalAmount)}
                  </p>
                </article>
              </div>
            </>
          ) : (
            <p className="muted">
              Add line items to build a purchase order draft.
            </p>
          )}

          <div className="action-row">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => handleCreatePurchaseOrder('draft')}
              disabled={
                createMutation.isPending ||
                sendMutation.isPending ||
                !draftItems.length
              }
            >
              {pendingCreateMode === 'draft' ? 'Saving...' : 'Save draft'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => handleCreatePurchaseOrder('send')}
              disabled={
                createMutation.isPending ||
                sendMutation.isPending ||
                !draftItems.length
              }
            >
              {pendingCreateMode === 'send' ? 'Sending...' : 'Save and send'}
            </button>
          </div>
        </article>

        <article
          className="data-card"
          data-tutorial-id="purchase-orders-manage"
        >
          <h3>Manage purchase orders</h3>
          <SectionHint>
            Review supplier, warehouse, and status before moving an order
            forward. Drafts can be sent, sent orders can be received, and
            received orders can be closed.
          </SectionHint>
          {purchaseOrders.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO #</th>
                    <th>Supplier</th>
                    <th>Warehouse</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.slice(0, 20).map((order, index) => {
                    const orderId = resolveEntityId(order);
                    const status = normalizeStatus(order?.status);
                    const canSend = SEND_ELIGIBLE_STATUSES.has(status);
                    const canReceive = RECEIVE_ELIGIBLE_STATUSES.has(status);
                    const canClose = CLOSE_ELIGIBLE_STATUSES.has(status);
                    const itemsCount = Array.isArray(order?.items)
                      ? order.items.length
                      : 0;
                    const isPendingSend =
                      pendingRowAction.purchaseOrderId === orderId &&
                      pendingRowAction.type === 'send';
                    const isPendingReceive =
                      pendingRowAction.purchaseOrderId === orderId &&
                      pendingRowAction.type === 'receive';
                    const isPendingClose =
                      pendingRowAction.purchaseOrderId === orderId &&
                      pendingRowAction.type === 'close';

                    return (
                      <tr key={orderId || String(order?.poNumber || index)}>
                        <td>{order?.poNumber || orderId || '-'}</td>
                        <td>{order?.supplier?.name || '-'}</td>
                        <td>
                          {order?.warehouse?.code ||
                            order?.warehouse?.name ||
                            '-'}
                        </td>
                        <td>{status || '-'}</td>
                        <td>{itemsCount}</td>
                        <td>
                          {formatMoney(
                            order?.totalCost || order?.totalAmount || 0
                          )}
                        </td>
                        <td>
                          {formatWhen(order?.updatedAt || order?.createdAt)}
                        </td>
                        <td>
                          <div className="action-row">
                            <button
                              type="button"
                              className="btn-ghost"
                              disabled={
                                !canSend ||
                                !orderId ||
                                Boolean(pendingRowAction.type)
                              }
                              onClick={() => handleSend(orderId)}
                            >
                              {isPendingSend ? 'Sending...' : 'Send'}
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              disabled={
                                !canReceive ||
                                !orderId ||
                                Boolean(pendingRowAction.type)
                              }
                              onClick={() => handleReceive(orderId)}
                            >
                              {isPendingReceive ? 'Receiving...' : 'Receive'}
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              disabled={
                                !canClose ||
                                !orderId ||
                                Boolean(pendingRowAction.type)
                              }
                              onClick={() => handleClose(orderId)}
                            >
                              {isPendingClose ? 'Closing...' : 'Close'}
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
            <p className="muted">No purchase orders available.</p>
          )}
        </article>
      </div>

      <div className="event-grid one-col">
        <article className="event-card">
          <h3>Latest PO timeline</h3>
          <SectionHint>
            Use this stream as a quick audit trail for what changed most
            recently in purchasing.
          </SectionHint>
          <ul className="event-list">
            {poEvents.length ? (
              poEvents.slice(0, 10).map((event) => (
                <li key={event.id} className="event-item">
                  <div>
                    <p className="event-title">{event.title}</p>
                    <p className="event-sub">{event.subtitle}</p>
                  </div>
                  <span className={`event-pill ${event.kind}`}>
                    {event.kind}
                  </span>
                </li>
              ))
            ) : (
              <li className="event-empty">
                No purchase order events received yet.
              </li>
            )}
          </ul>
          {latestPoEvent ? (
            <p className="event-sub">
              Most recent: {formatWhen(latestPoEvent.occurredAt)}
            </p>
          ) : null}
        </article>
      </div>
    </section>
  );
};

export default PurchaseOrders;
