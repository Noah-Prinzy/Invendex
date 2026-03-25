import Chart from '../components/Chart.js';

const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolveLabel = (row, index) =>
  String(
    row?.label || row?.status || row?.sku || row?.name || `Item ${index + 1}`
  ).trim();

const resolveValue = (row) =>
  toNumber(row?.value ?? row?.quantity ?? row?.count ?? row?.total);

const StockLevelChart = ({
  rows = [],
  eyebrow = 'Stock Signal',
  badge = '',
  title = 'Stock Level Snapshot',
  subtitle = 'Current quantity distribution across the selected dataset',
  maxItems = 6,
  emptyTitle = 'No stock signal yet',
  footer = '',
  valueFormatter = (value) => String(Math.round(toNumber(value))),
  noteBuilder = (row) => {
    if (Number.isFinite(Number(row?.skuCount))) {
      return `${Number(row.skuCount)} SKUs`;
    }
    return String(row?.note || '').trim();
  }
}) => {
  const data = (Array.isArray(rows) ? rows : [])
    .slice(0, maxItems)
    .map((row, index) => ({
      id: row?.id || row?._id || `${resolveLabel(row, index)}-${index}`,
      label: resolveLabel(row, index),
      value: resolveValue(row),
      note: noteBuilder(row)
    }));
  const resolvedBadge =
    String(badge || '').trim() ||
    (data.length ? `${data.length} rows in view` : 'Awaiting stock data');

  return (
    <Chart
      eyebrow={eyebrow}
      badge={resolvedBadge}
      title={title}
      subtitle={subtitle}
      className="mini-chart-stock"
      ariaLabel={title || 'Stock level chart'}
      data={data}
      valueFormatter={valueFormatter}
      emptyTitle={emptyTitle}
      emptyMessage="No stock-level data available."
      footer={footer}
    />
  );
};

export default StockLevelChart;
