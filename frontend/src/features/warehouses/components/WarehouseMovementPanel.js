import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWmsMovementLedgerRequest } from '../../../api/client.js';
import { SectionHint } from '../../../components/PageGuide.js';

const MOVEMENT_TYPE_OPTIONS = [
  '',
  'INBOUND',
  'OUTBOUND',
  'TRANSFER',
  'ALLOCATION',
  'PICK',
  'ADJUSTMENT'
];

const normalizeText = (value) => String(value || '').trim();

const resolveEntityId = (value) =>
  String(value?.id || value?._id || value || '').trim();

const resolveProductLabel = (product, fallback = 'Product') => {
  const name = normalizeText(
    product?.name || product?.productName || product?.product?.name
  );
  const sku = normalizeText(product?.sku || product?.product?.sku);

  if (name && sku) return `${name} (${sku})`;
  return name || sku || fallback;
};

const resolveWarehouseLabel = (warehouse, fallback = '-') =>
  normalizeText(warehouse?.code || warehouse?.name) || fallback;

const resolveBinLabel = (bin, fallback = '-') =>
  normalizeText(bin?.code || bin) || fallback;

const formatQuantity = (value) => Number(value || 0).toLocaleString();

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const WarehouseMovementPanel = ({
  accessToken = null,
  warehouseId = null,
  activeWarehouseLabel = 'All warehouses',
  products = []
}) => {
  const [movementType, setMovementType] = useState('');
  const [productId, setProductId] = useState('');
  const [limit, setLimit] = useState('20');

  const productOptions = useMemo(
    () =>
      Array.isArray(products)
        ? [...products].sort((left, right) =>
            resolveProductLabel(left).localeCompare(resolveProductLabel(right))
          )
        : [],
    [products]
  );

  const movementQuery = useQuery({
    queryKey: [
      'warehouse:wms-movements',
      String(accessToken || ''),
      String(warehouseId || ''),
      String(movementType || ''),
      String(productId || ''),
      String(limit || '20')
    ],
    enabled: Boolean(accessToken),
    staleTime: 15 * 1000,
    queryFn: () =>
      getWmsMovementLedgerRequest({
        accessToken,
        warehouseId: normalizeText(warehouseId) || null,
        productId: normalizeText(productId) || null,
        type: normalizeText(movementType) || null,
        limit: Number(limit || 20)
      })
  });

  const movementRows = useMemo(
    () => (Array.isArray(movementQuery.data) ? movementQuery.data : []),
    [movementQuery.data]
  );

  const movementSummary = useMemo(
    () =>
      movementRows.reduce(
        (summary, row) => {
          summary.count += 1;
          summary.quantity += Number(row?.quantity || 0);
          summary.products.add(resolveEntityId(row?.product));
          return summary;
        },
        {
          count: 0,
          quantity: 0,
          products: new Set()
        }
      ),
    [movementRows]
  );

  return (
    <article className="data-card">
      <h3>Warehouse movement ledger</h3>
      <SectionHint>
        Review the latest WMS movements for{' '}
        <strong>{activeWarehouseLabel || 'the current scope'}</strong>. Use the
        filters to isolate one movement type or one product when something looks
        off.
      </SectionHint>

      <div className="control-row compact">
        <label className="control-field">
          <span>Movement type</span>
          <select
            aria-label="Movement type filter"
            value={movementType}
            onChange={(event) => setMovementType(event?.target?.value || '')}
          >
            <option value="">All types</option>
            {MOVEMENT_TYPE_OPTIONS.filter(Boolean).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="control-field">
          <span>Product</span>
          <select
            aria-label="Movement product filter"
            value={productId}
            onChange={(event) => setProductId(event?.target?.value || '')}
            disabled={!productOptions.length}
          >
            <option value="">All products</option>
            {productOptions.map((product) => {
              const optionId = resolveEntityId(product);
              return (
                <option key={optionId} value={optionId}>
                  {resolveProductLabel(product, optionId)}
                </option>
              );
            })}
          </select>
        </label>
        <label className="control-field">
          <span>Rows</span>
          <select
            aria-label="Movement row limit"
            value={limit}
            onChange={(event) => setLimit(event?.target?.value || '20')}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </label>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => movementQuery.refetch()}
          disabled={movementQuery.isFetching}
        >
          {movementQuery.isFetching ? 'Refreshing...' : 'Refresh movements'}
        </button>
      </div>

      <p className="muted">
        Loaded {movementSummary.count} movement(s), totaling{' '}
        {formatQuantity(movementSummary.quantity)} unit(s) across{' '}
        {movementSummary.products.size} product(s).
      </p>

      {movementQuery.error ? (
        <p className="form-error">
          {String(
            movementQuery.error?.message || 'Unable to load movement ledger'
          )}
        </p>
      ) : null}

      {movementRows.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Moved</th>
                <th>Type</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>From</th>
                <th>To</th>
                <th>Reference</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {movementRows.map((row) => {
                const movementId = resolveEntityId(row);
                const fromLabel = `${resolveWarehouseLabel(
                  row?.warehouseFrom
                )} / ${resolveBinLabel(row?.binFrom)}`;
                const toLabel = `${resolveWarehouseLabel(
                  row?.warehouseTo
                )} / ${resolveBinLabel(row?.binTo)}`;

                return (
                  <tr key={movementId}>
                    <td>{formatDateTime(row?.movedAt || row?.updatedAt)}</td>
                    <td>{row?.movementType || '-'}</td>
                    <td>{resolveProductLabel(row?.product || row, '-')}</td>
                    <td>{formatQuantity(row?.quantity)}</td>
                    <td>{fromLabel}</td>
                    <td>{toLabel}</td>
                    <td>
                      {normalizeText(row?.referenceType)
                        ? `${row.referenceType}${normalizeText(row?.referenceId) ? ` · ${row.referenceId}` : ''}`
                        : '-'}
                    </td>
                    <td>{row?.reason || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">
          No WMS movements have been recorded for the current filter set yet.
        </p>
      )}
    </article>
  );
};

export default WarehouseMovementPanel;
