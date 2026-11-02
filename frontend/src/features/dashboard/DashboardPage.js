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
const DASHBOARD_VIEW_KEYS = new Set(['overview', 'inventory', 'suppliers', 'ai', 'warehouse', 'activity']);
const DASHBOARD_VIEW_META = Object.freeze({
  inventory: {
    eyebrow: 'Inventory intelligence',
    title: 'Inventory performance',
    description: 'Review sales velocity, stock aging, dead stock, and movement signals.'
  },
  suppliers: {
    eyebrow: 'Supplier intelligence',
    title: 'Supplier performance',
    description: 'Compare supplier delivery performance, lead time, and reliability.'
  },
  ai: {
    eyebrow: 'Decision support',
    title: 'AI insights',
    description: 'Focus on recommendations, rescue actions, and unusual demand patterns.'
  },
  warehouse: {
    eyebrow: 'Warehouse operations',
    title: 'Warehouse map',
    description: 'Explore zones, bins, stock placement, and utilization in one focused view.'
  },
  activity: {
    eyebrow: 'Workspace activity',
    title: 'Live activity',
    description: 'Follow the latest inventory, finance, and access events.'
  }
});

const readDashboardView = () => {
  if (typeof window === 'undefined') return 'overview';
  const view = String(new URLSearchParams(window.location.search).get('dashboardPage') || '').trim();
  return DASHBOARD_VIEW_KEYS.has(view) ? view : 'overview';
};

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

// Small numeric helpers to cut down on repeated `Number(x || 0).toFixed(n)`
// noise throughout the render tree below.
const fmt = (value, decimals = 2) => Number(value || 0).toFixed(decimals);
const num = (value) => Number(value || 0);

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

// ---------------------------------------------------------------------------
// Reusable presentational pieces. These were previously duplicated inline for
// every panel (top selling, turnover, slow moving, suppliers, dead stock,
// advisor, rescue actions...). Pulling them out keeps the main component
// focused on data wiring and makes each panel a one-line declaration.
// ---------------------------------------------------------------------------

const RankListCard = ({ title, hint, note, items, emptyText, renderItem, category = 'inventory' }) => (
  <article className="data-card dashboard-detail-card" data-dashboard-category={category}>
    <h3>{title}</h3>
    {hint ? <SectionHint>{hint}</SectionHint> : null}
    {note ? <p className="section-note">{note}</p> : null}
    {items.length ? (
      <ul className="rank-list">{items.map(renderItem)}</ul>
    ) : (
      <p className="muted">{emptyText}</p>
    )}
  </article>
);

const DataTableCard = ({ title, hint, headers, rows, emptyText, renderRow, category = 'inventory' }) => (
  <article className="data-card dashboard-detail-card" data-dashboard-category={category}>
    <h3>{title}</h3>
    {hint ? <SectionHint>{hint}</SectionHint> : null}
    {rows.length ? (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>{rows.map(renderRow)}</tbody>
        </table>
      </div>
    ) : (
      <p className="muted">{emptyText}</p>
    )}
  </article>
);

const ZoneBinGrid = ({ zone, warehouse, warehouseKey, focusedZoneKey, selectedTwinBin, onSelectBin }) => {
  const zoneKey = String(zone.zone || 'UNSPECIFIED').trim() || 'UNSPECIFIED';
  const bins = Array.isArray(zone.bins) ? zone.bins.slice(0, 24) : [];

  return (
    <article
      className={`digital-twin-zone ${focusedZoneKey && focusedZoneKey === zoneKey ? 'focused' : ''}`}
    >
      <div className="digital-twin-zone-head">
        <p className="digital-twin-zone-name">Zone {zone.zone || 'UNSPECIFIED'}</p>
        <span className="digital-twin-zone-meta">{num(zone?.totals?.bins)} bins</span>
      </div>
      <div className="digital-twin-bins">
        {bins.length ? (
          bins.map((bin) => {
            const binId = String(bin.binId || bin.code || '');
            const isActive =
              selectedTwinBin && String(selectedTwinBin.binId || '') === binId;

            return (
              <button
                type="button"
                key={String(bin.binId || bin.code)}
                className={`digital-twin-bin ${getTwinBandClass(
                  bin.utilizationBand,
                  bin.utilizationPct
                )} ${isActive ? 'active' : ''}`}
                aria-pressed={Boolean(isActive)}
                onClick={() =>
                  onSelectBin({
                    warehouseKey,
                    warehouseId: warehouse.warehouseId || null,
                    warehouseCode: warehouse.warehouseCode || warehouse.warehouseName || null,
                    zoneKey,
                    binId,
                    binCode: bin.code || null,
                    binType: bin.binType || null,
                    quantityOnHand: num(bin.quantityOnHand),
                    quantityReserved: num(bin.quantityReserved),
                    quantityAvailable: num(bin.quantityAvailable),
                    maxCapacityUnits: Number.isFinite(Number(bin.maxCapacityUnits))
                      ? Number(bin.maxCapacityUnits)
                      : null,
                    utilizationPct: Number.isFinite(Number(bin.utilizationPct))
                      ? Number(bin.utilizationPct)
                      : null,
                    locationHint: [bin.aisle, bin.rack, bin.shelf].filter(Boolean).join('/')
                  })
                }
                title={`${bin.code || 'BIN'} | On hand ${num(bin.quantityOnHand)} | Reserved ${num(
                  bin.quantityReserved
                )} | Utilization ${
                  Number.isFinite(Number(bin.utilizationPct))
                    ? `${fmt(bin.utilizationPct)}%`
                    : 'n/a'
                }`}
              >
                <p className="digital-twin-bin-code">{bin.code || '-'}</p>
                <p className="digital-twin-bin-qty">{num(bin.quantityOnHand)}</p>
              </button>
            );
          })
        ) : (
          <p className="muted">No bins in this zone.</p>
        )}
      </div>
    </article>
  );
};

const WarehouseZonePanel = ({
  warehouse,
  focusedZoneKey,
  onFocusZone,
  selectedTwinBin,
  onSelectBin
}) => {
  const warehouseKey = String(warehouse.warehouseId || warehouse.warehouseCode || '');
  const zoneRows = Array.isArray(warehouse.zones) ? warehouse.zones.slice(0, 8) : [];
  const zoneKeys = Array.from(
    new Set(zoneRows.map((row) => String(row.zone || 'UNSPECIFIED').trim() || 'UNSPECIFIED'))
  );
  const visibleZones = focusedZoneKey
    ? zoneRows.filter((row) => String(row.zone || 'UNSPECIFIED').trim() === focusedZoneKey)
    : zoneRows;

  return (
    <section className="digital-twin-warehouse">
      <header className="digital-twin-warehouse-head">
        <h4>{warehouse.warehouseCode || warehouse.warehouseName || 'Warehouse'}</h4>
        <div className="digital-twin-stats">
          <span className="digital-twin-chip">On hand {fmt(warehouse?.totals?.quantityOnHand)}</span>
          <span className="digital-twin-chip">Binned {fmt(warehouse?.totals?.quantityBinned)}</span>
          <span className="digital-twin-chip">Unbinned {fmt(warehouse?.totals?.quantityUnbinned)}</span>
        </div>
      </header>

      {zoneKeys.length ? (
        <div className="digital-twin-zone-filters">
          <button
            type="button"
            className={`digital-twin-zone-filter ${focusedZoneKey ? '' : 'active'}`}
            aria-pressed={!focusedZoneKey}
            onClick={() => onFocusZone(warehouseKey, '')}
          >
            All zones
          </button>
          {zoneKeys.map((zoneKey) => (
            <button
              key={`${warehouseKey}-filter-${zoneKey}`}
              type="button"
              className={`digital-twin-zone-filter ${focusedZoneKey === zoneKey ? 'active' : ''}`}
              aria-pressed={focusedZoneKey === zoneKey}
              onClick={() => onFocusZone(warehouseKey, zoneKey)}
            >
              {zoneKey}
            </button>
          ))}
        </div>
      ) : null}

      {visibleZones.length ? (
        <div className="digital-twin-zone-grid">
          {visibleZones.map((zone) => (
            <ZoneBinGrid
              key={`${String(warehouse.warehouseId || '')}-${String(zone.zone || '')}`}
              zone={zone}
              warehouse={warehouse}
              warehouseKey={warehouseKey}
              focusedZoneKey={focusedZoneKey}
              selectedTwinBin={selectedTwinBin}
              onSelectBin={onSelectBin}
            />
          ))}
        </div>
      ) : (
        <p className="muted">No zones available for this warehouse.</p>
      )}
    </section>
  );
};

const BinDetailDrawer = ({
  accessToken,
  selectedTwinBin,
  twinDrawerTab,
  onSelectTab,
  onClose,
  formatFromBaseAmount
}) => {
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
      accessToken && selectedTwinBin?.binId && String(twinDrawerTab) === 'movements'
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
  const binInventoryRows = Array.isArray(binInventoryData.items) ? binInventoryData.items : [];

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
  const binMovementRows = Array.isArray(binMovementData.movements) ? binMovementData.movements : [];

  return (
    <div className="digital-twin-drawer-overlay" onClick={onClose}>
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
              {selectedTwinBin.binCode || 'BIN'} | {selectedTwinBin.warehouseCode || '-'}
            </h3>
            <p className="muted">
              Zone {selectedTwinBin.zoneKey || 'UNSPECIFIED'} | {selectedTwinBin.binType || 'STORAGE'}
              {selectedTwinBin.locationHint ? ` | ${selectedTwinBin.locationHint}` : ''}
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="digital-twin-drawer-tabs" role="tablist" aria-label="Bin detail views">
          <button
            type="button"
            role="tab"
            aria-selected={twinDrawerTab === 'inventory'}
            className={`digital-twin-drawer-tab ${twinDrawerTab === 'inventory' ? 'active' : ''}`}
            onClick={() => onSelectTab('inventory')}
          >
            Inventory
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={twinDrawerTab === 'movements'}
            className={`digital-twin-drawer-tab ${twinDrawerTab === 'movements' ? 'active' : ''}`}
            onClick={() => onSelectTab('movements')}
          >
            Movements
          </button>
        </div>

        {twinDrawerTab === 'inventory' && binInventoryQuery.isPending ? (
          <p className="section-note">Loading bin inventory...</p>
        ) : null}

        {twinDrawerTab === 'inventory' && binInventoryQuery.isError ? (
          <p className="form-error">
            {String(binInventoryQuery.error?.message || 'Unable to load bin inventory details')}
          </p>
        ) : null}

        {twinDrawerTab === 'inventory' && !binInventoryQuery.isPending && !binInventoryQuery.isError ? (
          <>
            <div className="digital-twin-drawer-metrics">
              <span className="digital-twin-chip">Lines {num(binInventoryData?.totals?.lines)}</span>
              <span className="digital-twin-chip">On hand {fmt(binInventoryData?.totals?.quantityOnHand)}</span>
              <span className="digital-twin-chip">
                Reserved {fmt(binInventoryData?.totals?.quantityReserved)}
              </span>
              <span className="digital-twin-chip">
                Available {fmt(binInventoryData?.totals?.quantityAvailable)}
              </span>
              <span className="digital-twin-chip">
                Value {formatFromBaseAmount(binInventoryData?.totals?.inventoryValue || 0)}
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
                      <tr key={String(row.inventoryId || row.productId || row.sku)}>
                        <td>{row.sku || '-'}</td>
                        <td>{row.productName || '-'}</td>
                        <td>{fmt(row.quantityOnHand)}</td>
                        <td>{fmt(row.quantityReserved)}</td>
                        <td>{fmt(row.quantityAvailable)}</td>
                        <td>
                          {formatFromBaseAmount(num(row.quantityOnHand) * num(row.unitPrice))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No product stock lines found in this bin.</p>
            )}
          </>
        ) : null}

        {twinDrawerTab === 'movements' && binMovementsQuery.isPending ? (
          <p className="section-note">Loading bin movement history...</p>
        ) : null}

        {twinDrawerTab === 'movements' && binMovementsQuery.isError ? (
          <p className="form-error">
            {String(binMovementsQuery.error?.message || 'Unable to load bin movement history')}
          </p>
        ) : null}

        {twinDrawerTab === 'movements' && !binMovementsQuery.isPending && !binMovementsQuery.isError ? (
          <>
            <div className="digital-twin-drawer-metrics">
              <span className="digital-twin-chip">Movements {num(binMovementData?.totals?.count)}</span>
              <span className="digital-twin-chip">Qty moved {fmt(binMovementData?.totals?.quantity)}</span>
              <span className="digital-twin-chip">
                Inbound {fmt(binMovementData?.totals?.inboundQuantity)}
              </span>
              <span className="digital-twin-chip">
                Outbound {fmt(binMovementData?.totals?.outboundQuantity)}
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
                      <tr key={String(row.movementId || row.referenceId || row.movedAt)}>
                        <td>{formatDateTime(row.movedAt)}</td>
                        <td>{row.movementType || '-'}</td>
                        <td>{row.direction || '-'}</td>
                        <td>{row.sku || row.productName || '-'}</td>
                        <td>{fmt(row.quantity)}</td>
                        <td>{(row.binFromCode || '-') + ' -> ' + (row.binToCode || '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No movement history found for this bin.</p>
            )}
          </>
        ) : null}
      </aside>
    </div>
  );
};

const EventStreamCard = ({ title, events, latest, summaryClassName }) => (
  <article className="event-card">
    <h3>{title}</h3>
    <ul className="event-list">
      {events.length ? (
        events.slice(0, 6).map((event) => (
          <li key={event.id} className="event-item">
            <div>
              <p className="event-title">{event.title}</p>
              <p className="event-sub">{event.subtitle}</p>
            </div>
            <span className="event-time">{formatWhen(event.occurredAt)}</span>
          </li>
        ))
      ) : (
        <li className="event-empty">No {title.toLowerCase()} yet.</li>
      )}
    </ul>
    {latest ? (
      <div className={`event-summary ${summaryClassName}`}>
        <p className="event-summary-label">Latest {title.toLowerCase()} activity</p>
        <p className="event-summary-title">{latest.title}</p>
        <p className="event-summary-sub">{latest.subtitle}</p>
        <p className="event-summary-time">{formatDateTime(latest.occurredAt)}</p>
      </div>
    ) : null}
  </article>
);

const Dashboard = ({
  accessToken = null,
  warehouseId = null,
  activeWarehouseLabel = 'All warehouses',
  inventoryEvents = [],
  financeEvents = [],
  authEvents = []
}) => {
  const [salesWindowDays, setSalesWindowDays] = useState(30);
  const [dashboardView, setDashboardView] = useState(readDashboardView);
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
        const referenceProductId = String(topSellingRows[0]?.productId || '').trim();
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
          aiSupplierResult.status === 'fulfilled' && Array.isArray(aiSupplierResult.value)
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
          supplierRanking: Array.isArray(supplierRanking) ? supplierRanking : [],
          deadStock:
            deadStock && typeof deadStock === 'object'
              ? deadStock
              : { items: [], count: 0, totalValue: 0, thresholdDays: 90 },
          products: Array.isArray(products) ? products : [],
          lowStockSummary: Array.isArray(lowStockSummary) ? lowStockSummary : [],
          healthScore: healthScore && typeof healthScore === 'object' ? healthScore : null,
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
  const scopedProducts = Array.isArray(intelligence.products) ? intelligence.products : [];
  const scopedLowStockSummary = Array.isArray(intelligence.lowStockSummary)
    ? intelligence.lowStockSummary
    : [];
  const scopedHealthScore =
    intelligence.healthScore && typeof intelligence.healthScore === 'object'
      ? intelligence.healthScore
      : null;
  const scopedOnHandUnits =
    num(intelligence.digitalTwin?.totals?.unitsBinned) +
    num(intelligence.digitalTwin?.totals?.unitsUnbinned);

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
      skuCount: num(summary?.[bucket.key]?.skuCount),
      quantity: num(summary?.[bucket.key]?.quantity)
    }));
  }, [intelligence.stockAgingBuckets]);

  const metrics = useMemo(
    () => [
      { label: 'Products in scope', value: String(scopedProducts.length) },
      { label: 'Units on hand', value: String(Math.round(scopedOnHandUnits)) },
      {
        label: 'Low-stock SKUs',
        value: String(scopedLowStockSummary.length),
        caption: scopedLowStockSummary.length ? 'Needs attention' : 'Stock levels look healthy',
        tone: scopedLowStockSummary.length ? 'warning' : 'success'
      },
      {
        label: 'Inventory health',
        value: scopedHealthScore ? `${fmt(scopedHealthScore.score, 1)} / 100` : '-',
        caption: scopedHealthScore?.band || 'No score available',
        tone: num(scopedHealthScore?.score) >= 80 ? 'success' : 'warning'
      },
    ],
    [
      scopedProducts.length,
      scopedOnHandUnits,
      scopedLowStockSummary.length,
      scopedHealthScore
    ]
  );

  const secondaryMetrics = useMemo(
    () => [
      { label: 'Selected warehouse', value: activeWarehouseLabel || 'All warehouses' },
      { label: 'Inventory events', value: String(inventoryEvents.length) },
      {
        label: 'Dead stock items',
        value: String(num(intelligence.deadStock?.count) || deadStockRows.length),
        tone: num(intelligence.deadStock?.count) || deadStockRows.length ? 'warning' : 'success'
      },
      {
        label: 'Dead stock value',
        value: formatFromBaseAmount(intelligence.deadStock?.totalValue || 0)
      },
      { label: 'Fast turnover SKUs', value: String(intelligence.turnoverSkus.length) },
      { label: 'Slow moving SKUs', value: String(intelligence.slowMovingSkus.length) },
      { label: 'Supplier signals', value: String(intelligence.supplierRanking.length) },
      {
        label: 'AI demand anomalies',
        value: String(num(intelligence.aiDemandAnomalies?.anomalyCount))
      }
    ],
    [
      activeWarehouseLabel,
      inventoryEvents.length,
      intelligence.deadStock,
      deadStockRows.length,
      formatFromBaseAmount,
      intelligence.turnoverSkus.length,
      intelligence.slowMovingSkus.length,
      intelligence.supplierRanking.length,
      intelligence.aiDemandAnomalies
    ]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (dashboardView === 'overview') {
      url.searchParams.delete('dashboardPage');
    } else {
      url.searchParams.set('dashboardPage', dashboardView);
    }
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [dashboardView]);

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
          (row) => String(row.zone || 'UNSPECIFIED') === String(selectedTwinBin.zoneKey || '')
        )
      : null;

    if (!zone) {
      setSelectedTwinBin(null);
      return;
    }

    const bin = Array.isArray(zone.bins)
      ? zone.bins.find(
          (row) => String(row.binId || row.code || '') === String(selectedTwinBin.binId || '')
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

  return (
    <>
      <section className="panel dashboard-panel">
        {dashboardView === 'overview' ? (
          <>
        <header className="panel-head panel-head-row dashboard-hero">
          <div>
            <p className="eyebrow">Inventory command center</p>
            <h2>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}</h2>
            <p>A clear view of stock health, risks, and the actions that need attention.</p>
          </div>
          <div className="obs-actions">
            <label className="control-field compact-select">
              <span>Sales window</span>
              <select
                value={salesWindowDays}
                onChange={(event) => setSalesWindowDays(Number(event.target.value || 30))}
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
              disabled={intelligenceQuery.isLoading || intelligenceQuery.isFetching}
            >
              {intelligenceQuery.isLoading || intelligenceQuery.isFetching ? 'Refreshing...' : 'Refresh data'}
            </button>
          </div>
        </header>

        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">At a glance</p>
            <h3>Inventory overview</h3>
          </div>
          <span className="dashboard-scope">{activeWarehouseLabel || 'All warehouses'}</span>
        </div>
        <div className="metric-grid" data-tutorial-id="dashboard-metrics">
          {metrics.map((metric) => (
            <article key={metric.label} className={`metric-card ${metric.tone ? `metric-card-${metric.tone}` : ''}`}>
              <p className="metric-label">{metric.label}</p>
              <p className="metric-value">{metric.value}</p>
              {metric.caption ? <p className="event-sub">{metric.caption}</p> : null}
            </article>
          ))}
        </div>

        <details className="dashboard-more-metrics">
          <summary>View more operational signals</summary>
          <div className="metric-grid metric-grid-secondary">
            {secondaryMetrics.map((metric) => (
              <article key={metric.label} className={`metric-card ${metric.tone ? `metric-card-${metric.tone}` : ''}`}>
                <p className="metric-label">{metric.label}</p>
                <p className="metric-value">{metric.value}</p>
              </article>
            ))}
          </div>
        </details>

        <nav className="dashboard-page-nav" aria-label="Dashboard sections">
          {[
            ['inventory', 'Inventory', 'Sales, movement and aging'],
            ['suppliers', 'Suppliers', 'Performance and reliability'],
            ['ai', 'AI insights', 'Recommendations and anomalies'],
            ['warehouse', 'Warehouse map', 'Bins, zones and utilization'],
            ['activity', 'Live activity', 'Recent workspace events']
          ].map(([key, label, description]) => (
            <button
              type="button"
              key={key}
              className={`dashboard-page-link ${dashboardView === key ? 'active' : ''}`}
              aria-current={dashboardView === key ? 'page' : undefined}
              onClick={() => setDashboardView(key)}
            >
              <span>{label}</span>
              <small>{description}</small>
            </button>
          ))}
        </nav>
          </>
        ) : (
          <header className="dashboard-detail-page-head">
            <button type="button" className="dashboard-back-link" onClick={() => setDashboardView('overview')}>
              <span aria-hidden="true">←</span> Dashboard
            </button>
            <div>
              <p className="eyebrow">{DASHBOARD_VIEW_META[dashboardView]?.eyebrow}</p>
              <h2>{DASHBOARD_VIEW_META[dashboardView]?.title}</h2>
              <p>{DASHBOARD_VIEW_META[dashboardView]?.description}</p>
            </div>
            <div className="dashboard-detail-actions">
              <span className="dashboard-scope">{activeWarehouseLabel || 'All warehouses'}</span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => intelligenceQuery.refetch()}
                disabled={intelligenceQuery.isLoading || intelligenceQuery.isFetching}
              >
                {intelligenceQuery.isLoading || intelligenceQuery.isFetching ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </header>
        )}

        {intelligenceQuery.isError ? (
          <p className="form-error">
            {String(intelligenceQuery.error?.message || 'Failed to load dashboard intelligence')}
          </p>
        ) : null}

        <div className={`dashboard-view dashboard-view-${dashboardView}`} data-dashboard-view={dashboardView}>
        <div className="dashboard-section-heading dashboard-section-spaced dashboard-detail-heading">
          <div>
            <p className="eyebrow">Decision center</p>
            <h3>What needs your attention</h3>
          </div>
          <p>Sales movement, aging stock, suppliers, and AI recommendations.</p>
        </div>

        <div className="data-grid dashboard-insight-grid">
          <DataTableCard
            category="inventory"
            title="Top Selling Items"
            hint="Start here if you want to see what is leaving the shelf fastest in the selected warehouse scope."
            headers={['SKU', 'Name', 'Qty sold']}
            rows={intelligence.topSelling.slice(0, 8)}
            emptyText="No sales data for this period."
            renderRow={(row) => (
              <tr key={String(row.productId || row.sku || row.name)}>
                <td>{row.sku || '-'}</td>
                <td>{row.name || '-'}</td>
                <td>{num(row.quantitySold)}</td>
              </tr>
            )}
          />

          <RankListCard
            category="inventory"
            title="Fast Turnover SKUs"
            hint="These items sell and replenish quickly, so they are useful for spotting strong movers and healthy stock velocity."
            items={intelligence.turnoverSkus.slice(0, 8)}
            emptyText="No turnover insights yet."
            renderItem={(row) => (
              <li key={String(row.productId || row.sku || row.name)} className="rank-item">
                <p>{row.sku || row.name || 'SKU'}</p>
                <span>{fmt(row.turnoverRatio)}x</span>
              </li>
            )}
          />

          <RankListCard
            category="inventory"
            title="Slow Moving SKUs"
            hint="Use this list to find items that are sitting longer than expected and may need markdowns, promotions, or smaller reorder quantities."
            items={intelligence.slowMovingSkus.slice(0, 8)}
            emptyText="No slow-moving stock detected."
            renderItem={(row) => (
              <li key={String(row.productId || row.sku || row.name)} className="rank-item">
                <p>{row.sku || row.name || 'SKU'}</p>
                <span>{fmt(row.velocityPerDay)}/day</span>
              </li>
            )}
          />

          <RankListCard
            category="inventory"
            title="Stock Aging Buckets"
            items={agingSummaryRows}
            emptyText="No aging data available."
            renderItem={(bucket) => (
              <li key={bucket.label} className="rank-item">
                <p>{bucket.label}</p>
                <span>
                  {bucket.skuCount} SKUs | Qty {bucket.quantity}
                </span>
              </li>
            )}
          />

          <DataTableCard
            category="suppliers"
            title="Supplier Performance"
            headers={['Supplier', 'Score', 'On-time %', 'Lead days']}
            rows={intelligence.supplierRanking.slice(0, 8)}
            emptyText="No supplier ranking data yet."
            renderRow={(row) => (
              <tr key={String(row.supplierId || row.supplierName)}>
                <td>{row.supplierName || '-'}</td>
                <td>{fmt(row.score)}</td>
                <td>{fmt(row.onTimeRate)}%</td>
                <td>{fmt(row.avgLeadTimeDays)}</td>
              </tr>
            )}
          />

          <RankListCard
            category="suppliers"
            title="AI Supplier Reliability"
            items={
              Array.isArray(intelligence.aiSupplierReliability)
                ? intelligence.aiSupplierReliability.slice(0, 8)
                : []
            }
            emptyText="AI supplier reliability is not available for this user role or organization yet."
            renderItem={(row) => (
              <li key={String(row.supplierId || row.supplierName)} className="rank-item">
                <p>{row.supplierName || '-'}</p>
                <span>{fmt(row.score)}</span>
              </li>
            )}
          />

          <DataTableCard
            category="inventory"
            title={`Dead Stock (${num(intelligence.deadStock?.thresholdDays) || 90}d)`}
            headers={['SKU', 'Warehouse', 'Age', 'Qty']}
            rows={deadStockRows.slice(0, 8)}
            emptyText="No dead stock records for this filter."
            renderRow={(row) => (
              <tr key={`${row.productId || row.sku}-${row.warehouseId || row.warehouseCode}`}>
                <td>{row.sku || '-'}</td>
                <td>{row.warehouseCode || '-'}</td>
                <td>{num(row.ageDays)}</td>
                <td>{num(row.quantityOnHand)}</td>
              </tr>
            )}
          />

          <RankListCard
            category="ai"
            title="AI Inventory Advisor"
            items={
              Array.isArray(intelligence.inventoryAdvisor?.recommendations)
                ? intelligence.inventoryAdvisor.recommendations.slice(0, 8)
                : []
            }
            emptyText="No advisor recommendations for current scope."
            renderItem={(row) => (
              <li key={String(row.id || row.sku || row.productId)} className="rank-item">
                <p>
                  {row.sku || 'SKU'} ({String(row.priority || 'medium').toUpperCase()})
                </p>
                <span>{row.recommendation || row.summary || '-'}</span>
              </li>
            )}
          />

          <DataTableCard
            category="ai"
            title="Dead Stock Rescue Actions"
            headers={['SKU', 'Warehouse', 'Action', 'Discount', 'Recoverable value']}
            rows={
              Array.isArray(intelligence.deadStockRescue?.actions)
                ? intelligence.deadStockRescue.actions.slice(0, 8)
                : []
            }
            emptyText="No dead stock rescue actions at the moment."
            renderRow={(row) => (
              <tr key={`${row.productId || row.sku}-${row.warehouseId || row.warehouseCode}`}>
                <td>{row.sku || '-'}</td>
                <td>{row.warehouseCode || '-'}</td>
                <td>{row.recommendedAction || '-'}</td>
                <td>{num(row.suggestedDiscountPct)}%</td>
                <td>{formatFromBaseAmount(row.estimatedRecoverableValue)}</td>
              </tr>
            )}
          />

          <article className="data-card dashboard-detail-card" data-dashboard-category="warehouse">
            <h3>Warehouse Digital Twin</h3>
            <p className="section-note">
              Warehouses: {num(intelligence.digitalTwin?.totals?.warehouses)} | Zones:{' '}
              {num(intelligence.digitalTwin?.totals?.zones)} | Bins:{' '}
              {num(intelligence.digitalTwin?.totals?.bins)} | Utilization:{' '}
              {fmt(intelligence.digitalTwin?.totals?.utilizationPct)}%
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
                        {selectedTwinBin.binCode || 'BIN'} | {selectedTwinBin.warehouseCode || '-'}
                      </h4>
                      <p className="muted">
                        Zone {selectedTwinBin.zoneKey || 'UNSPECIFIED'} |{' '}
                        {selectedTwinBin.binType || 'STORAGE'}
                        {selectedTwinBin.locationHint ? ` | ${selectedTwinBin.locationHint}` : ''}
                      </p>
                      <div className="digital-twin-detail-chips">
                        <span className="digital-twin-chip">
                          On hand {fmt(selectedTwinBin.quantityOnHand)}
                        </span>
                        <span className="digital-twin-chip">
                          Reserved {fmt(selectedTwinBin.quantityReserved)}
                        </span>
                        <span className="digital-twin-chip">
                          Available {fmt(selectedTwinBin.quantityAvailable)}
                        </span>
                        <span className="digital-twin-chip">
                          Capacity{' '}
                          {Number.isFinite(Number(selectedTwinBin.maxCapacityUnits))
                            ? fmt(selectedTwinBin.maxCapacityUnits)
                            : 'n/a'}
                        </span>
                        <span className="digital-twin-chip">
                          Utilization{' '}
                          {Number.isFinite(Number(selectedTwinBin.utilizationPct))
                            ? `${fmt(selectedTwinBin.utilizationPct)}%`
                            : 'n/a'}
                        </span>
                      </div>
                    </div>
                    <button type="button" className="btn-ghost" onClick={() => setSelectedTwinBin(null)}>
                      Clear selection
                    </button>
                  </div>
                ) : null}
                {intelligence.digitalTwin.warehouses.slice(0, 4).map((warehouse) => {
                  const warehouseKey = String(warehouse.warehouseId || warehouse.warehouseCode || '');
                  return (
                    <WarehouseZonePanel
                      key={warehouseKey}
                      warehouse={warehouse}
                      focusedZoneKey={String(focusedZonesByWarehouse[warehouseKey] || '').trim()}
                      onFocusZone={setFocusedZone}
                      selectedTwinBin={selectedTwinBin}
                      onSelectBin={setSelectedTwinBin}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="muted">No bin-level map is available for this scope yet.</p>
            )}
          </article>

          <RankListCard
            category="ai"
            title="AI Demand Anomalies"
            note={`Product: ${
              intelligence.aiReferenceProductId
                ? String(intelligence.topSelling[0]?.sku || 'Top seller')
                : 'n/a'
            }`}
            items={
              Array.isArray(intelligence.aiDemandAnomalies?.anomalies)
                ? intelligence.aiDemandAnomalies.anomalies.slice(0, 8)
                : []
            }
            emptyText="No demand anomalies detected for the selected window."
            renderItem={(anomaly) => (
              <li key={`${anomaly.date}-${anomaly.zScore}`} className="rank-item">
                <p>
                  {anomaly.date} ({anomaly.severity})
                </p>
                <span>z={fmt(anomaly.zScore)}</span>
              </li>
            )}
          />
        </div>

        <div className="dashboard-section-heading dashboard-section-spaced dashboard-activity-heading">
          <div>
            <p className="eyebrow">Live activity</p>
            <h3>Recent workspace events</h3>
          </div>
          <p>Latest inventory, finance, and access updates.</p>
        </div>

        <div className="event-grid" data-tutorial-id="dashboard-streams">
          <EventStreamCard
            title="Inventory stream"
            events={inventoryEvents}
            latest={latestInventory}
            summaryClassName="event-summary-inventory"
          />
          <EventStreamCard
            title="Finance stream"
            events={financeEvents}
            latest={latestFinance}
            summaryClassName="event-summary-finance"
          />
          <EventStreamCard
            title="Auth stream"
            events={authEvents}
            latest={latestAuth}
            summaryClassName="event-summary-auth"
          />
        </div>
        </div>
      </section>

      {selectedTwinBin ? (
        <BinDetailDrawer
          accessToken={accessToken}
          selectedTwinBin={selectedTwinBin}
          twinDrawerTab={twinDrawerTab}
          onSelectTab={setTwinDrawerTab}
          onClose={() => setSelectedTwinBin(null)}
          formatFromBaseAmount={formatFromBaseAmount}
        />
      ) : null}
    </>
  );
};

export default Dashboard;
