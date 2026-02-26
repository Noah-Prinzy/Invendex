import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrdersRequest,
  receivePurchaseOrderRequest
} from '../../api/client.js';
import { createIdempotencyKey } from '../../api/idempotency.js';

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

const RECEIVE_ELIGIBLE_STATUSES = new Set(['SENT']);
const RECEIVED_STATUS = 'RECEIVED';

const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

const resolveOrderId = (order) => order?.id || order?._id || null;

const PurchaseOrders = ({ accessToken, poEvents = [] }) => {
  const queryClient = useQueryClient();
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const ordersQueryKey = useMemo(
    () => ['purchase-orders', String(accessToken || '')],
    [accessToken]
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
    queryFn: () => getPurchaseOrdersRequest(accessToken)
  });

  const receiveMutation = useMutation({
    mutationFn: ({ purchaseOrderId, idempotencyKey }) =>
      receivePurchaseOrderRequest({
        accessToken,
        purchaseOrderId,
        idempotencyKey
      }),
    onSuccess: () => {
      setActionError('');
      setActionNotice('Purchase order received successfully.');
      queryClient.invalidateQueries({
        queryKey: ['purchase-orders']
      });
    },
    onError: (mutationError) => {
      setActionNotice('');
      setActionError(
        String(mutationError?.message || 'Unable to receive purchase order')
      );
    }
  });

  const purchaseOrders = useMemo(
    () => (Array.isArray(ordersData) ? ordersData : []),
    [ordersData]
  );

  const handleReceive = async (purchaseOrderId) => {
    if (!purchaseOrderId) return;
    setActionNotice('');
    setActionError('');

    await receiveMutation.mutateAsync({
      purchaseOrderId,
      idempotencyKey: createIdempotencyKey('receive-purchase-order')
    });
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

  return (
    <section className="panel">
      <header className="panel-head panel-head-row">
        <div>
          <h2>Purchase Order Feed</h2>
          <p>Live PO events are grouped and summarized for quick action.</p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => refetchOrders()}
          disabled={!accessToken || ordersLoading || ordersFetching}
        >
          {ordersLoading || ordersFetching ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      <div className="metric-grid">
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
      {actionError ? <p className="form-error">{actionError}</p> : null}
      {actionNotice ? <p className="section-note">{actionNotice}</p> : null}

      <article className="data-card">
        <h3>Manage purchase orders</h3>
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
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.slice(0, 20).map((order, index) => {
                  const orderId = resolveOrderId(order);
                  const status = normalizeStatus(order?.status);
                  const canReceive = RECEIVE_ELIGIBLE_STATUSES.has(status);
                  const itemsCount = Array.isArray(order?.items)
                    ? order.items.length
                    : 0;

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
                        {formatWhen(order?.updatedAt || order?.createdAt)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={
                            !canReceive || receiveMutation.isPending || !orderId
                          }
                          onClick={() => handleReceive(orderId)}
                        >
                          {receiveMutation.isPending
                            ? 'Processing...'
                            : 'Receive'}
                        </button>
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

      <div className="event-grid one-col">
        <article className="event-card">
          <h3>Latest PO timeline</h3>
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
            <>
              <p className="event-sub">
                Most recent: {formatWhen(latestPoEvent.occurredAt)}
              </p>
              <pre>{JSON.stringify(latestPoEvent.raw, null, 2)}</pre>
            </>
          ) : null}
        </article>
      </div>
    </section>
  );
};

export default PurchaseOrders;
