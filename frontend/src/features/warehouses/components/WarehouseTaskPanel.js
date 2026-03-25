import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeWmsPickTicketRequest,
  createWmsPickTicketRequest,
  getProductsRequest,
  getWmsReplenishmentRequest,
  startWmsPickTicketRequest
} from '../../../api/client.js';
import { SectionHint } from '../../../components/PageGuide.js';

const createDefaultPickLineForm = () => ({
  productId: '',
  quantity: '1',
  lotNumber: '',
  serialNumbersText: ''
});

const normalizeText = (value) => String(value || '').trim();

const resolveEntityId = (value) =>
  String(value?.id || value?._id || value || '').trim();

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

const parseSerialNumbersText = (value) =>
  String(value || '')
    .split(/[\n,]+/g)
    .map((entry) =>
      String(entry || '')
        .trim()
        .toUpperCase()
    )
    .filter(Boolean);

const mapTicketForSession = (ticket, draftItems = []) => ({
  ticket,
  draftItems: Array.isArray(draftItems) ? draftItems : []
});

const WarehouseTaskPanel = ({
  accessToken = null,
  warehouseId = null,
  activeWarehouseLabel = 'Selected warehouse',
  onPrepareBinTransfer = () => {}
}) => {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [pickLineForm, setPickLineForm] = useState(() =>
    createDefaultPickLineForm()
  );
  const [draftItems, setDraftItems] = useState([]);
  const [sessionTickets, setSessionTickets] = useState([]);
  const [pendingTicketAction, setPendingTicketAction] = useState({
    ticketId: '',
    type: ''
  });

  const scopedWarehouseId = normalizeText(warehouseId);

  const productsQuery = useQuery({
    queryKey: [
      'wms:task-products',
      String(accessToken || ''),
      String(scopedWarehouseId || '')
    ],
    enabled: Boolean(accessToken) && Boolean(scopedWarehouseId),
    queryFn: () =>
      getProductsRequest(accessToken, {
        warehouseId: scopedWarehouseId
      })
  });

  const replenishmentQuery = useQuery({
    queryKey: [
      'wms:replenishment',
      String(accessToken || ''),
      String(scopedWarehouseId || '')
    ],
    enabled: Boolean(accessToken) && Boolean(scopedWarehouseId),
    queryFn: () =>
      getWmsReplenishmentRequest({
        accessToken,
        warehouseId: scopedWarehouseId
      })
  });

  const products = useMemo(
    () =>
      Array.isArray(productsQuery.data)
        ? [...productsQuery.data].sort((left, right) =>
            resolveProductLabel(left).localeCompare(resolveProductLabel(right))
          )
        : [],
    [productsQuery.data]
  );

  const replenishmentRecommendations = useMemo(
    () =>
      Array.isArray(replenishmentQuery.data?.recommendations)
        ? replenishmentQuery.data.recommendations
        : [],
    [replenishmentQuery.data]
  );

  const createPickTicketMutation = useMutation({
    mutationFn: ({ items, notes: nextNotes }) =>
      createWmsPickTicketRequest({
        accessToken,
        warehouseId: scopedWarehouseId,
        items,
        notes: nextNotes
      }),
    onSuccess: async (ticket, variables) => {
      setSessionTickets((current) => [
        mapTicketForSession(ticket, variables?.items),
        ...current
      ]);
      setDraftItems([]);
      setNotes('');
      setPickLineForm(createDefaultPickLineForm());
      setNotice(
        `Pick ticket created: ${normalizeText(ticket?.ticketNumber) || 'new ticket'}.`
      );
      setError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wms:bin-inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard:intelligence'] })
      ]);
    },
    onError: (mutationError) => {
      setNotice('');
      setError(
        String(mutationError?.message || 'Failed to create pick ticket')
      );
    }
  });

  const startPickTicketMutation = useMutation({
    mutationFn: ({ ticketId }) =>
      startWmsPickTicketRequest({
        accessToken,
        ticketId
      }),
    onSuccess: (ticket) => {
      setSessionTickets((current) =>
        current.map((entry) =>
          String(entry?.ticket?._id || '') === String(ticket?._id || '')
            ? { ...entry, ticket }
            : entry
        )
      );
      setPendingTicketAction({ ticketId: '', type: '' });
      setNotice(
        `Pick ticket started: ${normalizeText(ticket?.ticketNumber) || 'ticket'}.`
      );
      setError('');
    },
    onError: (mutationError) => {
      setPendingTicketAction({ ticketId: '', type: '' });
      setNotice('');
      setError(String(mutationError?.message || 'Failed to start pick ticket'));
    }
  });

  const completePickTicketMutation = useMutation({
    mutationFn: ({ ticketId }) =>
      completeWmsPickTicketRequest({
        accessToken,
        ticketId
      }),
    onSuccess: async (ticket) => {
      setSessionTickets((current) =>
        current.map((entry) =>
          String(entry?.ticket?._id || '') === String(ticket?._id || '')
            ? { ...entry, ticket }
            : entry
        )
      );
      setPendingTicketAction({ ticketId: '', type: '' });
      setNotice(
        `Pick ticket packed: ${normalizeText(ticket?.ticketNumber) || 'ticket'}.`
      );
      setError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wms:bin-inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['wms:bin-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard:intelligence'] })
      ]);
    },
    onError: (mutationError) => {
      setPendingTicketAction({ ticketId: '', type: '' });
      setNotice('');
      setError(
        String(mutationError?.message || 'Failed to complete pick ticket')
      );
    }
  });

  const handlePickLineChange = (field) => (event) => {
    const nextValue = event?.target?.value || '';
    setPickLineForm((current) => ({
      ...current,
      [field]: nextValue
    }));
    setNotice('');
    setError('');
  };

  const handleAddDraftLine = (event) => {
    event.preventDefault();

    const productId = normalizeText(pickLineForm.productId);
    const quantity = Number(pickLineForm.quantity);
    const product = products.find(
      (row) => resolveEntityId(row) === String(productId || '')
    );

    if (!productId) {
      setNotice('');
      setError('Select a product before adding a pick line.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setNotice('');
      setError('Pick quantity must be a positive whole number.');
      return;
    }

    const serialNumbers = parseSerialNumbersText(
      pickLineForm.serialNumbersText
    );

    setDraftItems((current) => [
      ...current,
      {
        productId,
        quantity,
        lotNumber: normalizeText(pickLineForm.lotNumber).toUpperCase(),
        serialNumbers,
        productLabel: resolveProductLabel(product, productId)
      }
    ]);
    setPickLineForm(createDefaultPickLineForm());
    setNotice('');
    setError('');
  };

  const handleCreatePickTicket = () => {
    if (!draftItems.length) {
      setNotice('');
      setError('Add at least one pick line before creating a ticket.');
      return;
    }

    createPickTicketMutation.mutate({
      items: draftItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        ...(item.lotNumber ? { lotNumber: item.lotNumber } : {}),
        ...(item.serialNumbers.length
          ? { serialNumbers: item.serialNumbers }
          : {})
      })),
      notes: normalizeText(notes)
    });
  };

  const handleTicketAction = (ticketId, type) => {
    const normalizedTicketId = normalizeText(ticketId);
    if (!normalizedTicketId) return;

    setPendingTicketAction({ ticketId: normalizedTicketId, type });
    if (type === 'start') {
      startPickTicketMutation.mutate({ ticketId: normalizedTicketId });
      return;
    }

    completePickTicketMutation.mutate({ ticketId: normalizedTicketId });
  };

  const handlePrepareBinTransfer = (recommendation) => {
    const primarySource =
      Array.isArray(recommendation?.suggestedSources) &&
      recommendation.suggestedSources.length
        ? recommendation.suggestedSources[0]
        : null;
    const quantity = Math.min(
      Number(primarySource?.quantity || 0),
      Number(recommendation?.neededQuantity || 0)
    );

    if (!primarySource || quantity <= 0) {
      setNotice('');
      setError(
        'No source bin is available to prefill this replenishment move.'
      );
      return;
    }

    onPrepareBinTransfer({
      draftKey: `${normalizeText(recommendation?.productId)}-${normalizeText(
        recommendation?.targetBinId
      )}-${Date.now()}`,
      productId: normalizeText(recommendation?.productId),
      fromBinId: normalizeText(primarySource?.binId),
      fromBinCode: normalizeText(primarySource?.binCode),
      toBinId: normalizeText(recommendation?.targetBinId),
      toBinCode: normalizeText(recommendation?.targetBinCode),
      quantity,
      reason: `Replenish ${normalizeText(recommendation?.targetBinCode) || 'pick face'}`
    });
    setNotice(
      `Prepared a replenishment move into ${
        normalizeText(recommendation?.targetBinCode) || 'the target bin'
      }. Complete it in Bin stock actions.`
    );
    setError('');
  };

  if (!scopedWarehouseId) {
    return (
      <article className="data-card">
        <h3>Warehouse tasks</h3>
        <SectionHint>
          Select a specific warehouse in the header to load replenishment
          recommendations and create pick tickets.
        </SectionHint>
      </article>
    );
  }

  return (
    <>
      <article className="data-card">
        <h3>Warehouse tasks</h3>
        <SectionHint>
          Replenishment recommendations help you refill pick faces, while pick
          tickets reserve and complete outbound warehouse work for{' '}
          <strong>{activeWarehouseLabel || 'the selected warehouse'}</strong>.
        </SectionHint>
        {notice ? <p className="section-note">{notice}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </article>

      <article className="data-card">
        <h3>Replenishment recommendations</h3>
        <SectionHint>
          These suggestions are generated from bin replenishment thresholds and
          current available stock in the selected warehouse.
        </SectionHint>
        {replenishmentRecommendations.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Target bin</th>
                  <th>Available</th>
                  <th>Needed</th>
                  <th>Suggested source</th>
                  <th>Shortfall</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {replenishmentRecommendations.map((row) => {
                  const primarySource =
                    Array.isArray(row?.suggestedSources) &&
                    row.suggestedSources.length
                      ? row.suggestedSources[0]
                      : null;
                  const preparedQuantity = Math.min(
                    Number(primarySource?.quantity || 0),
                    Number(row?.neededQuantity || 0)
                  );

                  return (
                    <tr
                      key={`${normalizeText(row?.productId)}-${normalizeText(row?.targetBinId)}`}
                    >
                      <td>{resolveProductLabel(row, '-')}</td>
                      <td>{row?.targetBinCode || '-'}</td>
                      <td>{formatQuantity(row?.currentAvailable)}</td>
                      <td>{formatQuantity(row?.neededQuantity)}</td>
                      <td>
                        {primarySource
                          ? `${primarySource?.binCode || '-'} (${formatQuantity(
                              primarySource?.quantity
                            )})`
                          : '-'}
                      </td>
                      <td>{formatQuantity(row?.shortfall)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={!primarySource || preparedQuantity <= 0}
                          onClick={() => handlePrepareBinTransfer(row)}
                        >
                          Prefill transfer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            No replenishment actions are recommended for this warehouse right
            now.
          </p>
        )}
      </article>

      <article className="data-card">
        <h3>Create pick ticket</h3>
        <SectionHint>
          Add one or more pick lines, then create a ticket for the current
          warehouse. Starting and completing a ticket updates the current
          session list below.
        </SectionHint>
        <form className="control-row" onSubmit={handleAddDraftLine}>
          <label className="control-field">
            <span>Product</span>
            <select
              aria-label="Pick product"
              value={pickLineForm.productId}
              onChange={handlePickLineChange('productId')}
              disabled={!products.length || createPickTicketMutation.isPending}
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
              aria-label="Pick quantity"
              type="number"
              min="1"
              step="1"
              value={pickLineForm.quantity}
              onChange={handlePickLineChange('quantity')}
              placeholder="1"
              disabled={createPickTicketMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Lot number (optional)</span>
            <input
              type="text"
              value={pickLineForm.lotNumber}
              onChange={handlePickLineChange('lotNumber')}
              placeholder="LOT-001"
              disabled={createPickTicketMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Serials (optional)</span>
            <input
              type="text"
              value={pickLineForm.serialNumbersText}
              onChange={handlePickLineChange('serialNumbersText')}
              placeholder="SN-001,SN-002"
              disabled={createPickTicketMutation.isPending}
            />
          </label>
          <button
            type="submit"
            className="btn-ghost"
            disabled={createPickTicketMutation.isPending || !products.length}
          >
            Add pick line
          </button>
        </form>

        <div className="control-row compact">
          <label className="control-field">
            <span>Ticket notes</span>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event?.target?.value || '')}
              placeholder="Pack with fragile labels"
              disabled={createPickTicketMutation.isPending}
            />
          </label>
          <button
            type="button"
            className="btn-ghost"
            disabled={createPickTicketMutation.isPending || !draftItems.length}
            onClick={handleCreatePickTicket}
          >
            {createPickTicketMutation.isPending
              ? 'Creating ticket...'
              : 'Create pick ticket'}
          </button>
        </div>

        {draftItems.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Lot</th>
                  <th>Serials</th>
                </tr>
              </thead>
              <tbody>
                {draftItems.map((item, index) => (
                  <tr key={`${item.productId}-${index + 1}`}>
                    <td>{item.productLabel}</td>
                    <td>{formatQuantity(item.quantity)}</td>
                    <td>{item.lotNumber || '-'}</td>
                    <td>{item.serialNumbers.length || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            No pick lines added yet. Build a small ticket and create it when you
            are ready.
          </p>
        )}
      </article>

      <article className="data-card">
        <h3>Session pick tickets</h3>
        <SectionHint>
          This list tracks tickets created during the current session so you can
          move them from created to picking to packed without leaving the page.
        </SectionHint>
        {sessionTickets.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Status</th>
                  <th>Lines</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessionTickets.map((entry) => {
                  const ticket = entry?.ticket || {};
                  const ticketId = normalizeText(ticket?._id);
                  const isStarting =
                    pendingTicketAction.ticketId === ticketId &&
                    pendingTicketAction.type === 'start' &&
                    startPickTicketMutation.isPending;
                  const isCompleting =
                    pendingTicketAction.ticketId === ticketId &&
                    pendingTicketAction.type === 'complete' &&
                    completePickTicketMutation.isPending;
                  const status = normalizeText(ticket?.status).toUpperCase();

                  return (
                    <tr key={ticketId}>
                      <td>{ticket?.ticketNumber || '-'}</td>
                      <td>{status || '-'}</td>
                      <td>{formatQuantity(ticket?.items?.length)}</td>
                      <td>{formatDateTime(ticket?.createdAt)}</td>
                      <td>
                        <div className="action-row">
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={isStarting || status !== 'CREATED'}
                            onClick={() =>
                              handleTicketAction(ticketId, 'start')
                            }
                          >
                            {isStarting ? 'Starting...' : 'Start'}
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={
                              isCompleting ||
                              !['CREATED', 'PICKING'].includes(status)
                            }
                            onClick={() =>
                              handleTicketAction(ticketId, 'complete')
                            }
                          >
                            {isCompleting ? 'Completing...' : 'Complete'}
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
          <p className="muted">
            No pick tickets have been created in this session yet.
          </p>
        )}
      </article>
    </>
  );
};

export default WarehouseTaskPanel;
