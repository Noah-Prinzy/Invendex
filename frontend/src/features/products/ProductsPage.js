import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adjustProductStockRequest,
  getProductsLowStockSummaryRequest,
  getProductsRequest
} from '../../api/client.js';
import { createIdempotencyKey } from '../../api/idempotency.js';

const ROLES_WITH_LOW_STOCK_ACCESS = new Set(['admin', 'staff']);
const PAGE_SIZE = 8;
const PRODUCTS_QUERY_STALE_TIME_MS = 45 * 1000;
const STOCK_ADJUST_REASONS = ['sale', 'restock', 'adjustment', 'return'];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const Products = ({ accessToken, userRole = null, warehouseId = null }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('adjustment');
  const [adjustNotice, setAdjustNotice] = useState('');
  const queryClient = useQueryClient();

  const canReadLowStockSummary = ROLES_WITH_LOW_STOCK_ACCESS.has(
    String(userRole || '')
  );
  const productsQueryKey = useMemo(
    () => [
      'products:index',
      String(accessToken || ''),
      String(canReadLowStockSummary)
    ],
    [accessToken, canReadLowStockSummary]
  );

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: productsQueryKey,
    enabled: Boolean(accessToken),
    staleTime: PRODUCTS_QUERY_STALE_TIME_MS,
    queryFn: async () => {
      const productsData = await getProductsRequest(accessToken);
      const lowStockData = canReadLowStockSummary
        ? await getProductsLowStockSummaryRequest(accessToken)
        : [];

      return {
        products: Array.isArray(productsData) ? productsData : [],
        lowStockSummary: Array.isArray(lowStockData) ? lowStockData : []
      };
    }
  });

  const stockAdjustMutation = useMutation({
    mutationFn: async ({
      productId,
      amount,
      reason,
      selectedWarehouseId,
      idempotencyKey
    }) =>
      adjustProductStockRequest({
        accessToken,
        productId,
        amount,
        reason,
        warehouseId: selectedWarehouseId,
        idempotencyKey
      }),
    onSuccess: () => {
      setAdjustNotice('Stock adjustment saved.');
      setAdjustAmount('');
      queryClient.invalidateQueries({ queryKey: ['products:index'] });
      refetch();
    },
    onError: (mutationError) => {
      setAdjustNotice(
        String(mutationError?.message || 'Unable to adjust stock')
      );
    }
  });

  const products = useMemo(
    () => (Array.isArray(data?.products) ? data.products : []),
    [data]
  );
  const lowStockSummary = useMemo(
    () => (Array.isArray(data?.lowStockSummary) ? data.lowStockSummary : []),
    [data]
  );
  const errorMessage = String(error?.message || '').trim();
  const canAdjustStock = Boolean(accessToken);
  const normalizedWarehouseId = String(warehouseId || '').trim();

  const handleAdjustStockSubmit = async (event) => {
    event.preventDefault();
    setAdjustNotice('');

    const amount = Number(adjustAmount);
    if (!adjustProductId) {
      setAdjustNotice('Select a product before submitting.');
      return;
    }
    if (!Number.isInteger(amount) || amount === 0) {
      setAdjustNotice('Amount must be a non-zero integer.');
      return;
    }
    if (!normalizedWarehouseId) {
      setAdjustNotice(
        'Select a warehouse in the header before adjusting stock.'
      );
      return;
    }

    await stockAdjustMutation.mutateAsync({
      productId: adjustProductId,
      amount,
      reason: adjustReason,
      selectedWarehouseId: normalizedWarehouseId,
      idempotencyKey: createIdempotencyKey('manual-stock-adjustment')
    });
  };

  const stats = useMemo(() => {
    const total = products.length;
    const lowStockCount = lowStockSummary.length;
    const avgPrice =
      total > 0
        ? products.reduce(
            (sum, product) => sum + Number(product.price || 0),
            0
          ) / total
        : 0;
    return { total, lowStockCount, avgPrice };
  }, [products, lowStockSummary]);

  const lowStockSkus = useMemo(
    () =>
      new Set(
        lowStockSummary.map((item) => String(item.sku || '').toUpperCase())
      ),
    [lowStockSummary]
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = String(searchTerm || '')
      .trim()
      .toLowerCase();

    const withFlags = products.map((product) => {
      const sku = String(product.sku || '').toUpperCase();
      const stock = Number(product.stock || 0);
      const threshold = Number(product.lowStockThreshold || 0);
      return {
        ...product,
        _isLowStock: lowStockSkus.has(sku) || stock <= threshold
      };
    });

    const filtered = withFlags.filter((product) => {
      if (normalizedSearch) {
        const haystack =
          `${product.name || ''} ${product.sku || ''} ${product.category || ''}`
            .toLowerCase()
            .trim();
        if (!haystack.includes(normalizedSearch)) return false;
      }

      if (stockFilter === 'low' && !product._isLowStock) return false;
      if (stockFilter === 'healthy' && product._isLowStock) return false;

      return true;
    });

    filtered.sort((a, b) => {
      const direction = sortDirection === 'desc' ? -1 : 1;

      if (sortKey === 'stock') {
        return (Number(a.stock || 0) - Number(b.stock || 0)) * direction;
      }
      if (sortKey === 'price') {
        return (Number(a.price || 0) - Number(b.price || 0)) * direction;
      }
      if (sortKey === 'threshold') {
        return (
          (Number(a.lowStockThreshold || 0) -
            Number(b.lowStockThreshold || 0)) *
          direction
        );
      }

      return (
        String(a[sortKey] || '').localeCompare(
          String(b[sortKey] || ''),
          undefined,
          { sensitivity: 'base' }
        ) * direction
      );
    });

    return filtered;
  }, [products, lowStockSkus, searchTerm, stockFilter, sortKey, sortDirection]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE)
  );

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  return (
    <section className="panel">
      <header className="panel-head panel-head-row">
        <div>
          <h2>Products</h2>
          <p>Live product list with low-stock visibility.</p>
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
          <p className="metric-label">Total products</p>
          <p className="metric-value">{stats.total}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Low stock SKUs</p>
          <p className="metric-value">{stats.lowStockCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Average price</p>
          <p className="metric-value">{formatCurrency(stats.avgPrice)}</p>
        </article>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {!canReadLowStockSummary ? (
        <p className="section-note">
          Low-stock summary is restricted to `admin` and `staff` roles in
          current backend policy.
        </p>
      ) : null}

      <article className="data-card">
        <h3>Manual stock adjustment</h3>
        <form className="control-row" onSubmit={handleAdjustStockSubmit}>
          <label className="control-field">
            <span>Product</span>
            <select
              value={adjustProductId}
              onChange={(event) => setAdjustProductId(event.target.value)}
              disabled={!canAdjustStock || isLoading || isFetching}
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option
                  key={product.id || product._id}
                  value={product.id || product._id}
                >
                  {product.name || product.sku || product.id || product._id}
                </option>
              ))}
            </select>
          </label>
          <label className="control-field">
            <span>Reason</span>
            <select
              value={adjustReason}
              onChange={(event) => setAdjustReason(event.target.value)}
              disabled={!canAdjustStock || stockAdjustMutation.isPending}
            >
              {STOCK_ADJUST_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>
          <label className="control-field">
            <span>Amount</span>
            <input
              type="number"
              step="1"
              value={adjustAmount}
              onChange={(event) => setAdjustAmount(event.target.value)}
              placeholder="e.g. -3 or 10"
              disabled={!canAdjustStock || stockAdjustMutation.isPending}
            />
          </label>
          <label className="control-field">
            <span>Warehouse scope</span>
            <input
              type="text"
              value={normalizedWarehouseId || 'Not selected'}
              readOnly
            />
          </label>
          <button
            type="submit"
            className="btn-ghost"
            disabled={!canAdjustStock || stockAdjustMutation.isPending}
          >
            {stockAdjustMutation.isPending ? 'Saving...' : 'Adjust stock'}
          </button>
        </form>
        {adjustNotice ? <p className="section-note">{adjustNotice}</p> : null}
      </article>

      <article className="data-card">
        <h3>Catalog</h3>
        <div className="control-row">
          <label className="control-field">
            <span>Search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Name, SKU, category"
            />
          </label>
          <label className="control-field">
            <span>Stock</span>
            <select
              value={stockFilter}
              onChange={(event) => {
                setStockFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="low">Low stock</option>
              <option value="healthy">Healthy</option>
            </select>
          </label>
          <label className="control-field">
            <span>Sort</span>
            <select
              value={sortKey}
              onChange={(event) => {
                setSortKey(event.target.value);
                setPage(1);
              }}
            >
              <option value="name">Name</option>
              <option value="sku">SKU</option>
              <option value="category">Category</option>
              <option value="stock">Stock</option>
              <option value="threshold">Threshold</option>
              <option value="price">Price</option>
            </select>
          </label>
          <label className="control-field">
            <span>Direction</span>
            <select
              value={sortDirection}
              onChange={(event) => {
                setSortDirection(event.target.value);
                setPage(1);
              }}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
        </div>

        {filteredProducts.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => (
                  <tr key={product.id || product._id}>
                    <td>{product.name || '-'}</td>
                    <td>{product.sku || '-'}</td>
                    <td>{product.category || '-'}</td>
                    <td>{Number(product.stock || 0)}</td>
                    <td>{Number(product.lowStockThreshold || 0)}</td>
                    <td>{formatCurrency(product.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No products match your filter.</p>
        )}

        <footer className="pagination-row">
          <p className="muted">
            Showing {paginatedProducts.length} of {filteredProducts.length}{' '}
            filtered products ({products.length} total)
          </p>
          <div className="pagination-controls">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <span className="pagination-text">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </footer>
      </article>
    </section>
  );
};

export default Products;
