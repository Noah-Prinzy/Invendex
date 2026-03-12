import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getProductsHealthScoreRequest,
  getProductsLowStockSummaryRequest,
  getProductsRequest,
  getAiDemandAnomaliesRequest,
  getAiSupplierReliabilityRequest,
  getDashboardDeadStockRequest,
  getDashboardDeadStockRescueRequest,
  getDashboardDigitalTwinRequest,
  getDashboardInventoryAdvisorRequest,
  getDashboardSlowMovingSkusRequest,
  getDashboardStockAgingBucketsRequest,
  getDashboardSupplierRankingRequest,
  getDashboardTopSellingItemsRequest,
  getDashboardTurnoverSkusRequest,
  getWmsBinInventoryRequest,
  getWmsBinMovementsRequest
} from '../../api/client.js';
import { SectionHint } from '../../components/PageGuide.js';
import useOrganizationCurrency from '../../hooks/finance/useOrganizationCurrency.js';
import { readCachedData, writeCachedData } from '../../offline/dataCache.js';

const REPORTS_QUERY_STALE_TIME_MS = 45 * 1000;

const formatWhen = (iso) => {
  if (!iso) return 'n/a';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = (iso) => {
  if (!iso) return 'n/a';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTwinBandClass = (band, utilizationPct) => {
  const normalized = String(band || '')
    .trim()
    .toUpperCase();
  if (normalized === 'OVER_CAPACITY') return 'band-over';
  if (normalized === 'DENSE') return 'band-dense';
  if (normalized === 'LOW') return 'band-low';
  if (normalized === 'BALANCED') return 'band-balanced';
  const utilization = Number(utilizationPct || 0);
  if (utilization >= 100) return 'band-over';
  if (utilization >= 85) return 'band-dense';
  if (utilization <= 15) return 'band-low';
  return 'band-balanced';
};

const Dashboard = ({
  accessToken = null,
  warehouseId = null,
  activeWarehouseLabel = 'All warehouses',
  inventoryEvents = [],
  financeEvents = [],
  authEvents = []
}) => {
  const [salesWindowDays, setSalesWindowDays] = useState(30);
  const [focusedZonesByWarehouse, setFocusedZonesByWarehouse] = useState({});
  const [selectedTwinBin, setSelectedTwinBin] = useState(null);
  const [twinDrawerTab, setTwinDrawerTab] = useState('inventory');
  const { formatFromBaseAmount } = useOrganizationCurrency({
    accessToken
  });

  const intelligenceQuery = useQuery({
    queryKey: [
      'dashboard:intelligence',
      String(accessToken || ''),
      Number(salesWindowDays || 30),
      String(warehouseId || '')
    ],
    enabled: Boolean(accessToken),
    staleTime: REPORTS_QUERY_STALE_TIME_MS,
    queryFn: async () => {
      const cacheKey = `dashboard-intel:${String(warehouseId || 'all')}:${Number(
        salesWindowDays || 30
      )}`;
      try {
        const [
          topSelling,
          turnoverSkus,
          slowMovingSkus,
          stockAgingBuckets,
          supplierRanking,
          deadStock,
          products,
          lowStockSummary,
          healthScore,
          inventoryAdvisor,
          deadStockRescue,
          digitalTwin
        ] = await Promise.all([
          getDashboardTopSellingItemsRequest({
            accessToken,
            days: salesWindowDays,
            limit: 8,
            warehouseId: warehouseId || null
          }),
          getDashboardTurnoverSkusRequest({
            accessToken,
            days: salesWindowDays,
            limit: 8,
            warehouseId: warehouseId || null
          }),
          getDashboardSlowMovingSkusRequest({
            accessToken,
            days: Math.max(Number(salesWindowDays || 30), 60),
            limit: 8,
            warehouseId: warehouseId || null
          }),
          getDashboardStockAgingBucketsRequest({
            accessToken,
            warehouseId: warehouseId || null
          }),
          getDashboardSupplierRankingRequest({
            accessToken,
            days: 180,
            warehouseId: warehouseId || null
          }),
          getDashboardDeadStockRequest({
            accessToken,
            days: 90,
            warehouseId: warehouseId || null,
            limit: 20
          }),
          getProductsRequest(accessToken, {
            warehouseId: warehouseId || null
          }),
          getProductsLowStockSummaryRequest({
            accessToken,
            warehouseId: warehouseId || null
          }),
          getProductsHealthScoreRequest({
            accessToken,
            warehouseId: warehouseId || null
          }),
          getDashboardInventoryAdvisorRequest({
            accessToken,
            days: salesWindowDays,
            warehouseId: warehouseId || null,
            limit: 10
          }),
          getDashboardDeadStockRescueRequest({
            accessToken,
            days: 90,
            warehouseId: warehouseId || null,
            limit: 12
          }),
          getDashboardDigitalTwinRequest({
            accessToken,
            warehouseId: warehouseId || null,
            zoneLimit: 12,
            binLimitPerZone: 120
          })
        ]);

        const topSellingRows = Array.isArray(topSelling) ? topSelling : [];
        const referenceProductId = String(
          topSellingRows[0]?.productId || ''
        ).trim();
        const [aiDemandResult, aiSupplierResult] = await Promise.allSettled([
          getAiDemandAnomaliesRequest({
            accessToken,
            productId: referenceProductId || null,
            days: Math.max(Number(salesWindowDays || 30), 90),
            zThreshold: 2.5,
            minDemand: 1
          }),
          getAiSupplierReliabilityRequest({
            accessToken,
            days: 180,
            warehouseId: warehouseId || null
          })
        ]);

        const aiDemandAnomalies =
          aiDemandResult.status === 'fulfilled' &&
          aiDemandResult.value &&
          typeof aiDemandResult.value === 'object'
            ? aiDemandResult.value
            : {
                productId: referenceProductId || null,
                anomalyCount: 0,
                anomalies: [],
                status: 'unavailable'
              };

        const aiSupplierReliability =
          aiSupplierResult.status === 'fulfilled' &&
          Array.isArray(aiSupplierResult.value)
            ? aiSupplierResult.value
            : [];

        const payload = {
          topSelling: topSellingRows,
          turnoverSkus: Array.isArray(turnoverSkus) ? turnoverSkus : [],
          slowMovingSkus: Array.isArray(slowMovingSkus) ? slowMovingSkus : [],
          stockAgingBuckets:
            stockAgingBuckets && typeof stockAgingBuckets === 'object'
              ? stockAgingBuckets
              : { summary: {} },
          supplierRanking: Array.isArray(supplierRanking)
            ? supplierRanking
            : [],
          deadStock:
            deadStock && typeof deadStock === 'object'
              ? deadStock
              : { items: [], count: 0, totalValue: 0, thresholdDays: 90 },
          products: Array.isArray(products) ? products : [],
          lowStockSummary: Array.isArray(lowStockSummary)
            ? lowStockSummary
            : [],
          healthScore:
            healthScore && typeof healthScore === 'object'
              ? healthScore
              : null,
          inventoryAdvisor:
            inventoryAdvisor && typeof inventoryAdvisor === 'object'
              ? inventoryAdvisor
              : { recommendations: [], totals: {} },
          deadStockRescue:
            deadStockRescue && typeof deadStockRescue === 'object'
              ? deadStockRescue
              : { actions: [], totals: {} },
          digitalTwin:
            digitalTwin && typeof digitalTwin === 'object'
              ? digitalTwin
              : { totals: {}, warehouses: [] },
          aiDemandAnomalies,
          aiSupplierReliability,
          aiReferenceProductId: referenceProductId || null
        };

        writeCachedData(cacheKey, payload);
        return payload;
      } catch (error) {
        if (Number(error?.statusCode || 0) === 0) {
          const cached = readCachedData(cacheKey, {
            maxAgeMs: 60 * 60 * 1000
          });
          if (cached) {
            return cached;
          }
        }
        throw error;
      }
    }
  });

  const latestInventory = inventoryEvents[0] || null;
  const latestFinance = financeEvents[0] || null;
  const latestAuth = authEvents[0] || null;

  const intelligence = intelligenceQuery.data || {
    topSelling: [],
    turnoverSkus: [],
    slowMovingSkus: [],
    stockAgingBuckets: { summary: {} },
    supplierRanking: [],
    deadStock: { items: [], count: 0, totalValue: 0, thresholdDays: 90 },
    products: [],
    lowStockSummary: [],
    healthScore: null,
    inventoryAdvisor: { recommendations: [], totals: {} },
    deadStockRescue: { actions: [], totals: {} },
    digitalTwin: { totals: {}, warehouses: [] },
    aiDemandAnomalies: { anomalyCount: 0, anomalies: [], status: 'idle' },
    aiSupplierReliability: [],
    aiReferenceProductId: null
  };

  const deadStockRows = Array.isArray(intelligence.deadStock?.items)
    ? intelligence.deadStock.items
    : [];
  const scopedProducts = Array.isArray(intelligence.products)
    ? intelligence.products
    : [];
  const scopedLowStockSummary = Array.isArray(intelligence.lowStockSummary)
    ? intelligence.lowStockSummary
    : [];
  const scopedHealthScore =
    intelligence.healthScore && typeof intelligence.healthScore === 'object'
      ? intelligence.healthScore
      : null;
  const scopedOnHandUnits =
    Number(intelligence.digitalTwin?.totals?.unitsBinned || 0) +
    Number(intelligence.digitalTwin?.totals?.unitsUnbinned || 0);

  const agingSummaryRows = useMemo(() => {
    const summary = intelligence.stockAgingBuckets?.summary || {};
    const buckets = [
      { key: 'bucket0to30', label: '0-30 days' },
      { key: 'bucket31to60', label: '31-60 days' },
      { key: 'bucket61to90', label: '61-90 days' },
      { key: 'bucket90plus', label: '90+ days' }
    ];

    return buckets.map((bucket) => ({
      label: bucket.label,
      skuCount: Number(summary?.[bucket.key]?.skuCount || 0),
      quantity: Number(summary?.[bucket.key]?.quantity || 0)
    }));
  }, [intelligence.stockAgingBuckets]);

  const metrics = [
    { label: 'Inventory events', value: String(inventoryEvents.length) },
    {
      label: 'Selected warehouse',
      value: activeWarehouseLabel || 'All warehouses'
    },
    {
      label: 'Products in scope',
      value: String(scopedProducts.length)
    },
    {
      label: 'Units on hand',
      value: String(Math.round(scopedOnHandUnits))
    },
    {
      label: 'Low-stock SKUs',
      value: String(scopedLowStockSummary.length)
    },
    {
      label: 'Inventory health',
      value: scopedHealthScore
        ? `${Number(scopedHealthScore.score || 0).toFixed(1)} / 100`
        : '-',
      caption: scopedHealthScore?.band || 'No score available'
    },
    {
      label: 'Dead stock items',
      value: String(Number(intelligence.deadStock?.count || deadStockRows.length))
    },
    {
      label: 'Dead stock value',
      value: formatFromBaseAmount(intelligence.deadStock?.totalValue || 0)
    },
    {
      label: 'Fast turnover SKUs',
      value: String(intelligence.turnoverSkus.length)
    },
    {
      label: 'Slow moving SKUs',
      value: String(intelligence.slowMovingSkus.length)
    },
    {
      label: 'Supplier signals',
      value: String(intelligence.supplierRanking.length)
    },
    {
      label: 'AI demand anomalies',
      value: String(Number(intelligence.aiDemandAnomalies?.anomalyCount || 0))
    }
  ];

  useEffect(() => {
    if (!selectedTwinBin) return;

    const warehouses = Array.isArray(intelligence.digitalTwin?.warehouses)
      ? intelligence.digitalTwin.warehouses
      : [];
    const warehouse = warehouses.find(
      (row) =>
        String(row.warehouseId || row.warehouseCode || '') ===
        String(selectedTwinBin.warehouseKey || '')
    );

    if (!warehouse) {
      setSelectedTwinBin(null);
      return;
    }

    const zone = Array.isArray(warehouse.zones)
      ? warehouse.zones.find(
          (row) =>
            String(row.zone || 'UNSPECIFIED') ===
            String(selectedTwinBin.zoneKey || '')
        )
      : null;

    if (!zone) {
      setSelectedTwinBin(null);
      return;
    }

    const bin = Array.isArray(zone.bins)
      ? zone.bins.find(
          (row) =>
            String(row.binId || row.code || '') ===
            String(selectedTwinBin.binId || '')
        )
      : null;

    if (!bin) {
      setSelectedTwinBin(null);
    }
  }, [intelligence.digitalTwin, selectedTwinBin]);

  useEffect(() => {
    if (!selectedTwinBin) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedTwinBin(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedTwinBin]);

  useEffect(() => {
    if (!selectedTwinBin) return;
    setTwinDrawerTab('inventory');
  }, [selectedTwinBin?.binId]);

  const binInventoryQuery = useQuery({
    queryKey: [
      'dashboard:digital-twin:bin-inventory',
      String(accessToken || ''),
      String(selectedTwinBin?.binId || ''),
      String(selectedTwinBin?.warehouseId || '')
    ],
    enabled: Boolean(accessToken && selectedTwinBin?.binId),
    staleTime: 15 * 1000,
    queryFn: async () =>
      getWmsBinInventoryRequest({
        accessToken,
        binId: selectedTwinBin?.binId,
        warehouseId: selectedTwinBin?.warehouseId || null,
        limit: 300
      })
  });

  const binMovementsQuery = useQuery({
    queryKey: [
      'dashboard:digital-twin:bin-movements',
      String(accessToken || ''),
      String(selectedTwinBin?.binId || ''),
      String(selectedTwinBin?.warehouseId || ''),
      String(twinDrawerTab || 'inventory')
    ],
    enabled: Boolean(
      accessToken &&
      selectedTwinBin?.binId &&
      String(twinDrawerTab) === 'movements'
    ),
    staleTime: 15 * 1000,
    queryFn: async () =>
      getWmsBinMovementsRequest({
        accessToken,
        binId: selectedTwinBin?.binId,
        warehouseId: selectedTwinBin?.warehouseId || null,
        limit: 300
      })
  });

  const setFocusedZone = (warehouseKey, zoneKey = '') => {
    setFocusedZonesByWarehouse((previous) => {
      const next = { ...previous };
      if (!zoneKey) {
        delete next[warehouseKey];
      } else {
        next[warehouseKey] = zoneKey;
      }
      return next;
    });
  };

  const binInventoryData = binInventoryQuery.data || {
    bin: null,
    totals: {
      lines: 0,
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityAvailable: 0,
      inventoryValue: 0
    },
    items: []
  };

  const binInventoryRows = Array.isArray(binInventoryData.items)
    ? binInventoryData.items
    : [];

  const binMovementData = binMovementsQuery.data || {
    bin: null,
    totals: {
      count: 0,
      quantity: 0,
      inboundQuantity: 0,
      outboundQuantity: 0,
      byType: {}
    },
    movements: []
  };

  const binMovementRows = Array.isArray(binMovementData.movements)
    ? binMovementData.movements
    : [];

  return (
    <>
      <section className="panel">
        <header className="panel-head panel-head-row">
          <div>
            <h2>Operations Dashboard</h2>
            <p>
              Realtime streams plus sales, stock, and supplier intelligence.
            </p>
          </div>
          <div className="obs-actions">
            <label className="control-field compact-select">
              <span>Sales window</span>
              <select
                value={salesWindowDays}
                onChange={(event) =>
                  setSalesWindowDays(Number(event.target.value || 30))
                }
              >
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
            <button
              type="button"
              className="btn-ghost aligned-action-btn"
              onClick={() => intelligenceQuery.refetch()}
              disabled={
                intelligenceQuery.isLoading || intelligenceQuery.isFetching
              }
            >
              {intelligenceQuery.isLoading || intelligenceQuery.isFetching
                ? 'Loading...'
                : 'Refresh'}
            </button>
          </div>
        </header>

        <div className="metric-grid" data-tutorial-id="dashboard-metrics">
          {metrics.map((metric) => (
            <article key={metric.label} className="metric-card">
              <p className="metric-label">{metric.label}</p>
              <p className="metric-value">{metric.value}</p>
              {metric.caption ? (
                <p className="event-sub">{metric.caption}</p>
              ) : null}
            </article>
          ))}
        </div>

        {intelligenceQuery.isError ? (
          <p className="form-error">
            {String(
              intelligenceQuery.error?.message ||
                'Failed to load dashboard intelligence'
            )}
          </p>
        ) : null}

        <div className="data-grid">
          <article className="data-card">
            <h3>Top Selling Items</h3>
            <SectionHint>
              Start here if you want to see what is leaving the shelf fastest in
              the selected warehouse scope.
            </SectionHint>
            {intelligence.topSelling.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Qty sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intelligence.topSelling.slice(0, 8).map((row) => (
                      <tr key={String(row.productId || row.sku || row.name)}>
                        <td>{row.sku || '-'}</td>
                        <td>{row.name || '-'}</td>
                        <td>{Number(row.quantitySold || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No sales data for this period.</p>
            )}
          </article>

          <article className="data-card">
            <h3>Fast Turnover SKUs</h3>
            <SectionHint>
              These items sell and replenish quickly, so they are useful for
              spotting strong movers and healthy stock velocity.
            </SectionHint>
            {intelligence.turnoverSkus.length ? (
              <ul className="rank-list">
                {intelligence.turnoverSkus.slice(0, 8).map((row) => (
                  <li
                    key={String(row.productId || row.sku || row.name)}
                    className="rank-item"
                  >
                    <p>{row.sku || row.name || 'SKU'}</p>
                    <span>{Number(row.turnoverRatio || 0).toFixed(2)}x</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No turnover insights yet.</p>
            )}
          </article>

          <article className="data-card">
            <h3>Slow Moving SKUs</h3>
            <SectionHint>
              Use this list to find items that are sitting longer than expected
              and may need markdowns, promotions, or smaller reorder quantities.
            </SectionHint>
            {intelligence.slowMovingSkus.length ? (
              <ul className="rank-list">
                {intelligence.slowMovingSkus.slice(0, 8).map((row) => (
                  <li
                    key={String(row.productId || row.sku || row.name)}
                    className="rank-item"
                  >
                    <p>{row.sku || row.name || 'SKU'}</p>
                    <span>
                      {Number(row.velocityPerDay || 0).toFixed(2)}/day
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No slow-moving stock detected.</p>
            )}
          </article>

          <article className="data-card">
            <h3>Stock Aging Buckets</h3>
            <ul className="rank-list">
              {agingSummaryRows.map((bucket) => (
                <li key={bucket.label} className="rank-item">
                  <p>{bucket.label}</p>
                  <span>
                    {bucket.skuCount} SKUs | Qty {bucket.quantity}
                  </span>
                </li>
              ))}
            </ul>
          </article>

          <article className="data-card">
            <h3>Supplier Performance</h3>
            {intelligence.supplierRanking.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th>Score</th>
                      <th>On-time %</th>
                      <th>Lead days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intelligence.supplierRanking.slice(0, 8).map((row) => (
                      <tr key={String(row.supplierId || row.supplierName)}>
                        <td>{row.supplierName || '-'}</td>
                        <td>{Number(row.score || 0).toFixed(2)}</td>
                        <td>{Number(row.onTimeRate || 0).toFixed(2)}%</td>
                        <td>{Number(row.avgLeadTimeDays || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No supplier ranking data yet.</p>
            )}
          </article>

          <article className="data-card">
            <h3>AI Supplier Reliability</h3>
            {Array.isArray(intelligence.aiSupplierReliability) &&
            intelligence.aiSupplierReliability.length ? (
              <ul className="rank-list">
                {intelligence.aiSupplierReliability.slice(0, 8).map((row) => (
                  <li
                    key={String(row.supplierId || row.supplierName)}
                    className="rank-item"
                  >
                    <p>{row.supplierName || '-'}</p>
                    <span>{Number(row.score || 0).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                AI supplier reliability is not available for this user role or
                organization yet.
              </p>
            )}
          </article>

          <article className="data-card">
            <h3>
              Dead Stock ({Number(intelligence.deadStock?.thresholdDays || 90)}
              d)
            </h3>
            {deadStockRows.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Warehouse</th>
                      <th>Age</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deadStockRows.slice(0, 8).map((row) => (
                      <tr
                        key={`${row.productId || row.sku}-${row.warehouseId || row.warehouseCode}`}
                      >
                        <td>{row.sku || '-'}</td>
                        <td>{row.warehouseCode || '-'}</td>
                        <td>{Number(row.ageDays || 0)}</td>
                        <td>{Number(row.quantityOnHand || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No dead stock records for this filter.</p>
            )}
          </article>

          <article className="data-card">
            <h3>AI Inventory Advisor</h3>
            {Array.isArray(intelligence.inventoryAdvisor?.recommendations) &&
            intelligence.inventoryAdvisor.recommendations.length ? (
              <ul className="rank-list">
                {intelligence.inventoryAdvisor.recommendations
                  .slice(0, 8)
                  .map((row) => (
                    <li
                      key={String(row.id || row.sku || row.productId)}
                      className="rank-item"
                    >
                      <p>
                        {row.sku || 'SKU'} (
                        {String(row.priority || 'medium').toUpperCase()})
                      </p>
                      <span>{row.recommendation || row.summary || '-'}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="muted">
                No advisor recommendations for current scope.
              </p>
            )}
          </article>

          <article className="data-card">
            <h3>Dead Stock Rescue Actions</h3>
            {Array.isArray(intelligence.deadStockRescue?.actions) &&
            intelligence.deadStockRescue.actions.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Warehouse</th>
                      <th>Action</th>
                      <th>Discount</th>
                      <th>Recoverable value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intelligence.deadStockRescue.actions
                      .slice(0, 8)
                      .map((row) => (
                        <tr
                          key={`${row.productId || row.sku}-${row.warehouseId || row.warehouseCode}`}
                        >
                          <td>{row.sku || '-'}</td>
                          <td>{row.warehouseCode || '-'}</td>
                          <td>{row.recommendedAction || '-'}</td>
                          <td>{Number(row.suggestedDiscountPct || 0)}%</td>
                          <td>
                            {formatFromBaseAmount(
                              row.estimatedRecoverableValue
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">
                No dead stock rescue actions at the moment.
              </p>
            )}
          </article>

          <article className="data-card">
            <h3>Warehouse Digital Twin</h3>
            <p className="section-note">
              Warehouses:{' '}
              {Number(intelligence.digitalTwin?.totals?.warehouses || 0)} |
              Zones: {Number(intelligence.digitalTwin?.totals?.zones || 0)} |
              Bins: {Number(intelligence.digitalTwin?.totals?.bins || 0)} |
              Utilization:{' '}
              {Number(
                intelligence.digitalTwin?.totals?.utilizationPct || 0
              ).toFixed(2)}
              %
            </p>
            {Array.isArray(intelligence.digitalTwin?.warehouses) &&
            intelligence.digitalTwin.warehouses.length ? (
              <div className="digital-twin-shell">
                <div className="digital-twin-legend">
                  <span className="legend-item band-over">Over capacity</span>
                  <span className="legend-item band-dense">Dense</span>
                  <span className="legend-item band-balanced">Balanced</span>
                  <span className="legend-item band-low">Low</span>
                </div>
                {selectedTwinBin ? (
                  <div className="digital-twin-detail">
                    <div className="digital-twin-detail-body">
                      <p className="eyebrow">Selected Bin</p>
                      <h4>
                        {selectedTwinBin.binCode || 'BIN'} |{' '}
                        {selectedTwinBin.warehouseCode || '-'}
                      </h4>
                      <p className="muted">
                        Zone {selectedTwinBin.zoneKey || 'UNSPECIFIED'} |{' '}
                        {selectedTwinBin.binType || 'STORAGE'}
                        {selectedTwinBin.locationHint
                          ? ` | ${selectedTwinBin.locationHint}`
                          : ''}
                      </p>
                      <div className="digital-twin-detail-chips">
                        <span className="digital-twin-chip">
                          On hand{' '}
                          {Number(selectedTwinBin.quantityOnHand || 0).toFixed(
                            2
                          )}
                        </span>
                        <span className="digital-twin-chip">
                          Reserved{' '}
                          {Number(
                            selectedTwinBin.quantityReserved || 0
                          ).toFixed(2)}
                        </span>
                        <span className="digital-twin-chip">
                          Available{' '}
                          {Number(
                            selectedTwinBin.quantityAvailable || 0
                          ).toFixed(2)}
                        </span>
                        <span className="digital-twin-chip">
                          Capacity{' '}
                          {Number.isFinite(
                            Number(selectedTwinBin.maxCapacityUnits)
                          )
                            ? Number(selectedTwinBin.maxCapacityUnits).toFixed(
                                2
                              )
                            : 'n/a'}
                        </span>
                        <span className="digital-twin-chip">
                          Utilization{' '}
                          {Number.isFinite(
                            Number(selectedTwinBin.utilizationPct)
                          )
                            ? `${Number(selectedTwinBin.utilizationPct).toFixed(2)}%`
                            : 'n/a'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setSelectedTwinBin(null)}
                    >
                      Clear selection
                    </button>
                  </div>
                ) : null}
                {intelligence.digitalTwin.warehouses
                  .slice(0, 4)
                  .map((warehouse) => (
                    <section
                      key={String(
                        warehouse.warehouseId || warehouse.warehouseCode
                      )}
                      className="digital-twin-warehouse"
                    >
                      {(() => {
                        const warehouseKey = String(
                          warehouse.warehouseId || warehouse.warehouseCode || ''
                        );
                        const zoneRows = Array.isArray(warehouse.zones)
                          ? warehouse.zones.slice(0, 8)
                          : [];
                        const zoneKeys = Array.from(
                          new Set(
                            zoneRows.map(
                              (row) =>
                                String(row.zone || 'UNSPECIFIED').trim() ||
                                'UNSPECIFIED'
                            )
                          )
                        );
                        const focusedZoneKey = String(
                          focusedZonesByWarehouse[warehouseKey] || ''
                        ).trim();
                        const visibleZones = focusedZoneKey
                          ? zoneRows.filter(
                              (row) =>
                                String(row.zone || 'UNSPECIFIED').trim() ===
                                focusedZoneKey
                            )
                          : zoneRows;

                        return (
                          <>
                            <header className="digital-twin-warehouse-head">
                              <h4>
                                {warehouse.warehouseCode ||
                                  warehouse.warehouseName ||
                                  'Warehouse'}
                              </h4>
                              <div className="digital-twin-stats">
                                <span className="digital-twin-chip">
                                  On hand{' '}
                                  {Number(
                                    warehouse?.totals?.quantityOnHand || 0
                                  ).toFixed(2)}
                                </span>
                                <span className="digital-twin-chip">
                                  Binned{' '}
                                  {Number(
                                    warehouse?.totals?.quantityBinned || 0
                                  ).toFixed(2)}
                                </span>
                                <span className="digital-twin-chip">
                                  Unbinned{' '}
                                  {Number(
                                    warehouse?.totals?.quantityUnbinned || 0
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </header>
                            {zoneKeys.length ? (
                              <div className="digital-twin-zone-filters">
                                <button
                                  type="button"
                                  className={`digital-twin-zone-filter ${focusedZoneKey ? '' : 'active'}`}
                                  onClick={() =>
                                    setFocusedZone(warehouseKey, '')
                                  }
                                >
                                  All zones
                                </button>
                                {zoneKeys.map((zoneKey) => (
                                  <button
                                    key={`${warehouseKey}-filter-${zoneKey}`}
                                    type="button"
                                    className={`digital-twin-zone-filter ${
                                      focusedZoneKey === zoneKey ? 'active' : ''
                                    }`}
                                    onClick={() =>
                                      setFocusedZone(warehouseKey, zoneKey)
                                    }
                                  >
                                    {zoneKey}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                            {visibleZones.length ? (
                              <div className="digital-twin-zone-grid">
                                {visibleZones.map((zone) => (
                                  <article
                                    key={`${String(warehouse.warehouseId || '')}-${String(zone.zone || '')}`}
                                    className={`digital-twin-zone ${
                                      focusedZoneKey &&
                                      focusedZoneKey ===
                                        (String(
                                          zone.zone || 'UNSPECIFIED'
                                        ).trim() || 'UNSPECIFIED')
                                        ? 'focused'
                                        : ''
                                    }`}
                                  >
                                    <div className="digital-twin-zone-head">
                                      <p className="digital-twin-zone-name">
                                        Zone {zone.zone || 'UNSPECIFIED'}
                                      </p>
                                      <span className="digital-twin-zone-meta">
                                        {Number(zone?.totals?.bins || 0)} bins
                                      </span>
                                    </div>
                                    <div className="digital-twin-bins">
                                      {Array.isArray(zone.bins) &&
                                      zone.bins.length ? (
                                        zone.bins.slice(0, 24).map((bin) => (
                                          <button
                                            type="button"
                                            key={String(bin.binId || bin.code)}
                                            className={`digital-twin-bin ${getTwinBandClass(
                                              bin.utilizationBand,
                                              bin.utilizationPct
                                            )} ${
                                              selectedTwinBin &&
                                              String(
                                                selectedTwinBin.binId || ''
                                              ) ===
                                                String(
                                                  bin.binId || bin.code || ''
                                                )
                                                ? 'active'
                                                : ''
                                            }`}
                                            onClick={() =>
                                              setSelectedTwinBin({
                                                warehouseKey,
                                                warehouseId:
                                                  warehouse.warehouseId || null,
                                                warehouseCode:
                                                  warehouse.warehouseCode ||
                                                  warehouse.warehouseName ||
                                                  null,
                                                zoneKey:
                                                  String(
                                                    zone.zone || 'UNSPECIFIED'
                                                  ).trim() || 'UNSPECIFIED',
                                                binId: String(
                                                  bin.binId || bin.code || ''
                                                ),
                                                binCode: bin.code || null,
                                                binType: bin.binType || null,
                                                quantityOnHand: Number(
                                                  bin.quantityOnHand || 0
                                                ),
                                                quantityReserved: Number(
                                                  bin.quantityReserved || 0
                                                ),
                                                quantityAvailable: Number(
                                                  bin.quantityAvailable || 0
                                                ),
                                                maxCapacityUnits:
                                                  Number.isFinite(
                                                    Number(bin.maxCapacityUnits)
                                                  )
                                                    ? Number(
                                                        bin.maxCapacityUnits
                                                      )
                                                    : null,
                                                utilizationPct: Number.isFinite(
                                                  Number(bin.utilizationPct)
                                                )
                                                  ? Number(bin.utilizationPct)
                                                  : null,
                                                locationHint: [
                                                  bin.aisle,
                                                  bin.rack,
                                                  bin.shelf
                                                ]
                                                  .filter(Boolean)
                                                  .join('/')
                                              })
                                            }
                                            title={`${bin.code || 'BIN'} | On hand ${Number(
                                              bin.quantityOnHand || 0
                                            )} | Reserved ${Number(bin.quantityReserved || 0)} | Utilization ${
                                              Number.isFinite(
                                                Number(bin.utilizationPct)
                                              )
                                                ? `${Number(bin.utilizationPct).toFixed(2)}%`
                                                : 'n/a'
                                            }`}
                                          >
                                            <p className="digital-twin-bin-code">
                                              {bin.code || '-'}
                                            </p>
                                            <p className="digital-twin-bin-qty">
                                              {Number(bin.quantityOnHand || 0)}
                                            </p>
                                          </button>
                                        ))
                                      ) : (
                                        <p className="muted">
                                          No bins in this zone.
                                        </p>
                                      )}
                                    </div>
                                  </article>
                                ))}
                              </div>
                            ) : (
                              <p className="muted">
                                No zones available for this warehouse.
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </section>
                  ))}
              </div>
            ) : (
              <p className="muted">
                No bin-level map is available for this scope yet.
              </p>
            )}
          </article>

          <article className="data-card">
            <h3>AI Demand Anomalies</h3>
            <p className="section-note">
              Product:{' '}
              {intelligence.aiReferenceProductId
                ? String(intelligence.topSelling[0]?.sku || 'Top seller')
                : 'n/a'}
            </p>
            {Array.isArray(intelligence.aiDemandAnomalies?.anomalies) &&
            intelligence.aiDemandAnomalies.anomalies.length ? (
              <ul className="rank-list">
                {intelligence.aiDemandAnomalies.anomalies
                  .slice(0, 8)
                  .map((anomaly) => (
                    <li
                      key={`${anomaly.date}-${anomaly.zScore}`}
                      className="rank-item"
                    >
                      <p>
                        {anomaly.date} ({anomaly.severity})
                      </p>
                      <span>z={Number(anomaly.zScore || 0).toFixed(2)}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="muted">
                No demand anomalies detected for the selected window.
              </p>
            )}
          </article>
        </div>

        <div className="event-grid" data-tutorial-id="dashboard-streams">
          <article className="event-card">
            <h3>Inventory stream</h3>
            <ul className="event-list">
              {inventoryEvents.length ? (
                inventoryEvents.slice(0, 6).map((event) => (
                  <li key={event.id} className="event-item">
                    <div>
                      <p className="event-title">{event.title}</p>
                      <p className="event-sub">{event.subtitle}</p>
                    </div>
                    <span className="event-time">
                      {formatWhen(event.occurredAt)}
                    </span>
                  </li>
                ))
              ) : (
                <li className="event-empty">No inventory events yet.</li>
              )}
            </ul>
            {latestInventory ? (
              <div className="event-summary event-summary-inventory">
                <p className="event-summary-label">Latest inventory activity</p>
                <p className="event-summary-title">{latestInventory.title}</p>
                <p className="event-summary-sub">{latestInventory.subtitle}</p>
                <p className="event-summary-time">
                  {formatDateTime(latestInventory.occurredAt)}
                </p>
              </div>
            ) : null}
          </article>

          <article className="event-card">
            <h3>Finance stream</h3>
            <ul className="event-list">
              {financeEvents.length ? (
                financeEvents.slice(0, 6).map((event) => (
                  <li key={event.id} className="event-item">
                    <div>
                      <p className="event-title">{event.title}</p>
                      <p className="event-sub">{event.subtitle}</p>
                    </div>
                    <span className="event-time">
                      {formatWhen(event.occurredAt)}
                    </span>
                  </li>
                ))
              ) : (
                <li className="event-empty">No finance events yet.</li>
              )}
            </ul>
            {latestFinance ? (
              <div className="event-summary event-summary-finance">
                <p className="event-summary-label">Latest finance activity</p>
                <p className="event-summary-title">{latestFinance.title}</p>
                <p className="event-summary-sub">{latestFinance.subtitle}</p>
                <p className="event-summary-time">
                  {formatDateTime(latestFinance.occurredAt)}
                </p>
              </div>
            ) : null}
          </article>

          <article className="event-card">
            <h3>Auth stream</h3>
            <ul className="event-list">
              {authEvents.length ? (
                authEvents.slice(0, 6).map((event) => (
                  <li key={event.id} className="event-item">
                    <div>
                      <p className="event-title">{event.title}</p>
                      <p className="event-sub">{event.subtitle}</p>
                    </div>
                    <span className="event-time">
                      {formatWhen(event.occurredAt)}
                    </span>
                  </li>
                ))
              ) : (
                <li className="event-empty">No auth events yet.</li>
              )}
            </ul>
            {latestAuth ? (
              <div className="event-summary event-summary-auth">
                <p className="event-summary-label">Latest auth activity</p>
                <p className="event-summary-title">{latestAuth.title}</p>
                <p className="event-summary-sub">{latestAuth.subtitle}</p>
                <p className="event-summary-time">
                  {formatDateTime(latestAuth.occurredAt)}
                </p>
              </div>
            ) : null}
          </article>
        </div>
      </section>
      {selectedTwinBin ? (
        <div
          className="digital-twin-drawer-overlay"
          onClick={() => setSelectedTwinBin(null)}
        >
          <aside
            className="digital-twin-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Bin inventory details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="digital-twin-drawer-head">
              <div>
                <p className="eyebrow">Bin Inventory</p>
                <h3>
                  {selectedTwinBin.binCode || 'BIN'} |{' '}
                  {selectedTwinBin.warehouseCode || '-'}
                </h3>
                <p className="muted">
                  Zone {selectedTwinBin.zoneKey || 'UNSPECIFIED'} |{' '}
                  {selectedTwinBin.binType || 'STORAGE'}
                  {selectedTwinBin.locationHint
                    ? ` | ${selectedTwinBin.locationHint}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setSelectedTwinBin(null)}
              >
                Close
              </button>
            </header>

            <div className="digital-twin-drawer-tabs">
              <button
                type="button"
                className={`digital-twin-drawer-tab ${
                  twinDrawerTab === 'inventory' ? 'active' : ''
                }`}
                onClick={() => setTwinDrawerTab('inventory')}
              >
                Inventory
              </button>
              <button
                type="button"
                className={`digital-twin-drawer-tab ${
                  twinDrawerTab === 'movements' ? 'active' : ''
                }`}
                onClick={() => setTwinDrawerTab('movements')}
              >
                Movements
              </button>
            </div>

            {twinDrawerTab === 'inventory' && binInventoryQuery.isPending ? (
              <p className="section-note">Loading bin inventory...</p>
            ) : null}

            {twinDrawerTab === 'inventory' && binInventoryQuery.isError ? (
              <p className="form-error">
                {String(
                  binInventoryQuery.error?.message ||
                    'Unable to load bin inventory details'
                )}
              </p>
            ) : null}

            {twinDrawerTab === 'inventory' &&
            !binInventoryQuery.isPending &&
            !binInventoryQuery.isError ? (
              <>
                <div className="digital-twin-drawer-metrics">
                  <span className="digital-twin-chip">
                    Lines {Number(binInventoryData?.totals?.lines || 0)}
                  </span>
                  <span className="digital-twin-chip">
                    On hand{' '}
                    {Number(
                      binInventoryData?.totals?.quantityOnHand || 0
                    ).toFixed(2)}
                  </span>
                  <span className="digital-twin-chip">
                    Reserved{' '}
                    {Number(
                      binInventoryData?.totals?.quantityReserved || 0
                    ).toFixed(2)}
                  </span>
                  <span className="digital-twin-chip">
                    Available{' '}
                    {Number(
                      binInventoryData?.totals?.quantityAvailable || 0
                    ).toFixed(2)}
                  </span>
                  <span className="digital-twin-chip">
                    Value{' '}
                    {formatFromBaseAmount(
                      binInventoryData?.totals?.inventoryValue || 0
                    )}
                  </span>
                </div>

                {binInventoryRows.length ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Product</th>
                          <th>On hand</th>
                          <th>Reserved</th>
                          <th>Available</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {binInventoryRows.map((row) => (
                          <tr
                            key={String(
                              row.inventoryId || row.productId || row.sku
                            )}
                          >
                            <td>{row.sku || '-'}</td>
                            <td>{row.productName || '-'}</td>
                            <td>
                              {Number(row.quantityOnHand || 0).toFixed(2)}
                            </td>
                            <td>
                              {Number(row.quantityReserved || 0).toFixed(2)}
                            </td>
                            <td>
                              {Number(row.quantityAvailable || 0).toFixed(2)}
                            </td>
                            <td>
                              {formatFromBaseAmount(
                                Number(row.quantityOnHand || 0) *
                                  Number(row.unitPrice || 0)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">
                    No product stock lines found in this bin.
                  </p>
                )}
              </>
            ) : null}

            {twinDrawerTab === 'movements' && binMovementsQuery.isPending ? (
              <p className="section-note">Loading bin movement history...</p>
            ) : null}

            {twinDrawerTab === 'movements' && binMovementsQuery.isError ? (
              <p className="form-error">
                {String(
                  binMovementsQuery.error?.message ||
                    'Unable to load bin movement history'
                )}
              </p>
            ) : null}

            {twinDrawerTab === 'movements' &&
            !binMovementsQuery.isPending &&
            !binMovementsQuery.isError ? (
              <>
                <div className="digital-twin-drawer-metrics">
                  <span className="digital-twin-chip">
                    Movements {Number(binMovementData?.totals?.count || 0)}
                  </span>
                  <span className="digital-twin-chip">
                    Qty moved{' '}
                    {Number(binMovementData?.totals?.quantity || 0).toFixed(2)}
                  </span>
                  <span className="digital-twin-chip">
                    Inbound{' '}
                    {Number(
                      binMovementData?.totals?.inboundQuantity || 0
                    ).toFixed(2)}
                  </span>
                  <span className="digital-twin-chip">
                    Outbound{' '}
                    {Number(
                      binMovementData?.totals?.outboundQuantity || 0
                    ).toFixed(2)}
                  </span>
                </div>

                {binMovementRows.length ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>When</th>
                          <th>Type</th>
                          <th>Dir</th>
                          <th>SKU</th>
                          <th>Qty</th>
                          <th>Route</th>
                        </tr>
                      </thead>
                      <tbody>
                        {binMovementRows.map((row) => (
                          <tr
                            key={String(
                              row.movementId || row.referenceId || row.movedAt
                            )}
                          >
                            <td>{formatDateTime(row.movedAt)}</td>
                            <td>{row.movementType || '-'}</td>
                            <td>{row.direction || '-'}</td>
                            <td>{row.sku || row.productName || '-'}</td>
                            <td>{Number(row.quantity || 0).toFixed(2)}</td>
                            <td>
                              {(row.binFromCode || '-') +
                                ' -> ' +
                                (row.binToCode || '-')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">
                    No movement history found for this bin.
                  </p>
                )}
              </>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
};

export default Dashboard;
