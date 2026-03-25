import Chart from '../components/Chart.js';

const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const SalesChart = ({
  rows = [],
  eyebrow = 'Sales Signal',
  badge = '',
  title = 'Top Seller Distribution',
  subtitle = 'Units sold by item in the current sales window',
  maxItems = 6,
  emptyTitle = 'No sales movement yet',
  footer = 'Higher bars indicate faster-moving products in the selected scope.',
  valueFormatter = (value) => String(Math.round(toNumber(value)))
}) => {
  const data = (Array.isArray(rows) ? rows : [])
    .slice(0, maxItems)
    .map((row, index) => ({
      id: row?.productId || row?.sku || row?.name || `sales-${index + 1}`,
      label: row?.sku || row?.name || `Item ${index + 1}`,
      value: toNumber(row?.quantitySold ?? row?.value),
      note:
        row?.name && row?.sku && row.name !== row.sku ? String(row.name) : ''
    }));
  const resolvedBadge =
    String(badge || '').trim() ||
    (data.length ? `${data.length} movers tracked` : 'Awaiting sales feed');

  return (
    <Chart
      eyebrow={eyebrow}
      badge={resolvedBadge}
      title={title}
      subtitle={subtitle}
      className="mini-chart-sales"
      ariaLabel={title || 'Sales chart'}
      data={data}
      valueFormatter={valueFormatter}
      emptyTitle={emptyTitle}
      emptyMessage="No sales data for this period."
      footer={footer}
    />
  );
};

export default SalesChart;
