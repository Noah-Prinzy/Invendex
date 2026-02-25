import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getProductsLowStockSummaryRequest,
  getProductsRequest
} from '../api/client.js';

const ROLES_WITH_LOW_STOCK_ACCESS = new Set(['admin', 'staff']);
const PAGE_SIZE = 8;

const formatCurrency = value =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const Products = ({ accessToken, userRole = null }) => {
  const [products, setProducts] = useState([]);
  const [lowStockSummary, setLowStockSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);

  const canReadLowStockSummary = ROLES_WITH_LOW_STOCK_ACCESS.has(String(userRole || ''));

  const loadData = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError('');
    try {
      const productsData = await getProductsRequest(accessToken);
      const lowStockData = canReadLowStockSummary
        ? await getProductsLowStockSummaryRequest(accessToken)
        : [];
      setProducts(Array.isArray(productsData) ? productsData : []);
      setLowStockSummary(Array.isArray(lowStockData) ? lowStockData : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, canReadLowStockSummary]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const total = products.length;
    const lowStockCount = lowStockSummary.length;
    const avgPrice =
      total > 0
        ? products.reduce((sum, product) => sum + Number(product.price || 0), 0) / total
        : 0;
    return { total, lowStockCount, avgPrice };
  }, [products, lowStockSummary]);

  const lowStockSkus = useMemo(
    () => new Set(lowStockSummary.map(item => String(item.sku || '').toUpperCase())),
    [lowStockSummary]
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();

    const withFlags = products.map(product => {
      const sku = String(product.sku || '').toUpperCase();
      const stock = Number(product.stock || 0);
      const threshold = Number(product.lowStockThreshold || 0);
      return {
        ...product,
        _isLowStock: lowStockSkus.has(sku) || stock <= threshold
      };
    });

    const filtered = withFlags.filter(product => {
      if (normalizedSearch) {
        const haystack = `${product.name || ''} ${product.sku || ''} ${product.category || ''}`
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
          (Number(a.lowStockThreshold || 0) - Number(b.lowStockThreshold || 0)) * direction
        );
      }

      return String(a[sortKey] || '')
        .localeCompare(String(b[sortKey] || ''), undefined, { sensitivity: 'base' }) * direction;
    });

    return filtered;
  }, [products, lowStockSkus, searchTerm, stockFilter, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));

  useEffect(() => {
    setPage(current => Math.min(current, totalPages));
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
        <button type="button" className="btn-ghost" onClick={loadData} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
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

      {error ? <p className="form-error">{error}</p> : null}
      {!canReadLowStockSummary ? (
        <p className="section-note">
          Low-stock summary is restricted to `admin` and `staff` roles in current backend policy.
        </p>
      ) : null}

      <article className="data-card">
        <h3>Catalog</h3>
        <div className="control-row">
          <label className="control-field">
            <span>Search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={event => {
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
              onChange={event => {
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
              onChange={event => {
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
              onChange={event => {
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
                {paginatedProducts.map(product => (
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
            Showing {paginatedProducts.length} of {filteredProducts.length} filtered products (
            {products.length} total)
          </p>
          <div className="pagination-controls">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setPage(current => Math.max(1, current - 1))}
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
              onClick={() => setPage(current => Math.min(totalPages, current + 1))}
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
