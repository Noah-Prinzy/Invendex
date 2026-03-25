const normalizeValue = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildScaleTicks = (minValue, maxValue) => {
  if (maxValue === minValue) {
    return [maxValue, 0].filter(
      (value, index, values) => values.indexOf(value) === index
    );
  }

  const integerRange = Number.isInteger(minValue) && Number.isInteger(maxValue);
  const spread = Math.abs(maxValue - minValue);
  if (integerRange && spread <= 4) {
    return Array.from({ length: spread + 1 }, (_, index) => maxValue - index);
  }

  const tickCount = 5;
  return Array.from({ length: tickCount }, (_, index) => {
    const ratio = 1 - index / (tickCount - 1);
    const value = minValue + (maxValue - minValue) * ratio;
    return index === tickCount - 1 ? minValue : value;
  });
};

const Chart = ({
  eyebrow = '',
  badge = '',
  title = '',
  subtitle = '',
  data = [],
  className = '',
  ariaLabel = 'Chart',
  emptyTitle = 'No active signal yet',
  emptyMessage = 'No data available.',
  valueFormatter = (value) => String(normalizeValue(value)),
  footer = ''
}) => {
  const normalizedData = Array.isArray(data)
    ? data
        .map((item, index) => ({
          id:
            item?.id ||
            `${String(item?.label || 'item')
              .trim()
              .toLowerCase()}-${index}`,
          label: String(item?.label || '').trim() || `Item ${index + 1}`,
          value: normalizeValue(item?.value),
          note: String(item?.note || '').trim()
        }))
        .filter((item) => item.label)
    : [];

  const maxValue = normalizedData.reduce(
    (highest, item) => Math.max(highest, item.value),
    0
  );
  const minValue = normalizedData.reduce(
    (lowest, item) => Math.min(lowest, item.value),
    0
  );
  const scaleTicks = buildScaleTicks(minValue, maxValue);
  const scaleLayoutStyle = {
    gridTemplateRows: `repeat(${scaleTicks.length}, minmax(0, 1fr))`
  };
  const range = maxValue - minValue || 1;
  const baselineOffset = Math.min(
    100,
    Math.max(0, ((0 - minValue) / range) * 100)
  );
  const totalValue = normalizedData.reduce((sum, item) => sum + item.value, 0);
  const averageValue = normalizedData.length
    ? totalValue / normalizedData.length
    : 0;
  const leadingItem = normalizedData.reduce((best, item) => {
    if (!best) return item;
    return item.value > best.value ? item : best;
  }, null);
  const resolvedBadge =
    String(badge || '').trim() ||
    (normalizedData.length ? `${normalizedData.length} signals` : '');

  return (
    <section className={`mini-chart ${className}`.trim()}>
      {eyebrow || title || subtitle || leadingItem || resolvedBadge ? (
        <header className="mini-chart-head">
          {(eyebrow || resolvedBadge) && (
            <div className="mini-chart-head-top">
              {eyebrow ? (
                <span className="mini-chart-eyebrow">{eyebrow}</span>
              ) : (
                <span />
              )}
              {resolvedBadge ? (
                <span className="mini-chart-badge">{resolvedBadge}</span>
              ) : null}
            </div>
          )}
          <div className="mini-chart-copy">
            {title ? <h4 className="mini-chart-title">{title}</h4> : null}
            {subtitle ? (
              <p className="mini-chart-subtitle">{subtitle}</p>
            ) : null}
          </div>
          {leadingItem ? (
            <dl className="mini-chart-stats">
              <div className="mini-chart-stat">
                <dt className="mini-chart-stat-label">Leader</dt>
                <dd className="mini-chart-stat-value" title={leadingItem.label}>
                  {leadingItem.label}
                </dd>
              </div>
              <div className="mini-chart-stat">
                <dt className="mini-chart-stat-label">Peak</dt>
                <dd className="mini-chart-stat-value">
                  {valueFormatter(maxValue)}
                </dd>
              </div>
              <div className="mini-chart-stat">
                <dt className="mini-chart-stat-label">Average</dt>
                <dd className="mini-chart-stat-value">
                  {valueFormatter(averageValue)}
                </dd>
              </div>
            </dl>
          ) : null}
        </header>
      ) : null}

      {normalizedData.length ? (
        <>
          <div className="mini-chart-plot">
            <div
              className="mini-chart-y-axis"
              aria-hidden="true"
              style={scaleLayoutStyle}
            >
              {scaleTicks.map((tick, index) => (
                <span
                  key={`tick-${index}-${tick}`}
                  className="mini-chart-y-tick"
                >
                  {valueFormatter(tick)}
                </span>
              ))}
            </div>
            <div className="mini-chart-stage">
              <div
                className="mini-chart-grid"
                aria-hidden="true"
                style={scaleLayoutStyle}
              >
                {scaleTicks.map((tick, index) => (
                  <span
                    key={`line-${index}-${tick}`}
                    className={`mini-chart-grid-line ${
                      Math.abs(Number(tick || 0)) < 0.000001 ? 'is-zero' : ''
                    }`}
                  />
                ))}
              </div>
              <div
                className="mini-chart-bars"
                role="img"
                aria-label={ariaLabel}
              >
                {normalizedData.map((item, index) => {
                  const barSize =
                    item.value !== 0
                      ? Math.max(
                          8,
                          Math.round((Math.abs(item.value) / range) * 100)
                        )
                      : 0;
                  const barStyle =
                    item.value >= 0
                      ? {
                          height: `${barSize}%`,
                          bottom: `${baselineOffset}%`
                        }
                      : {
                          height: `${barSize}%`,
                          top: `${100 - baselineOffset}%`
                        };

                  return (
                    <article
                      key={item.id}
                      className="mini-chart-bar-card"
                      title={
                        item.note
                          ? `${item.label}: ${valueFormatter(item.value)} | ${item.note}`
                          : `${item.label}: ${valueFormatter(item.value)}`
                      }
                    >
                      <span className="mini-chart-rank">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="mini-chart-bar-track">
                        <span
                          className="mini-chart-bar-baseline"
                          style={{ bottom: `${baselineOffset}%` }}
                        />
                        <span
                          className={`mini-chart-bar-fill ${
                            item.value < 0 ? 'negative' : ''
                          }`}
                          style={barStyle}
                        />
                      </div>
                      <div className="mini-chart-bar-meta">
                        <span className="mini-chart-value">
                          {valueFormatter(item.value)}
                        </span>
                        <span className="mini-chart-label" title={item.label}>
                          {item.label}
                        </span>
                        {item.note ? (
                          <span className="mini-chart-note">{item.note}</span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
          {footer ? (
            <p className="section-note mini-chart-footer">{footer}</p>
          ) : null}
        </>
      ) : (
        <div className="mini-chart-empty" role="status" aria-live="polite">
          <div className="mini-chart-empty-visual" aria-hidden="true">
            <span className="mini-chart-empty-line mini-chart-empty-line-a" />
            <span className="mini-chart-empty-line mini-chart-empty-line-b" />
            <span className="mini-chart-empty-node mini-chart-empty-node-a" />
            <span className="mini-chart-empty-node mini-chart-empty-node-b" />
            <span className="mini-chart-empty-node mini-chart-empty-node-c" />
          </div>
          <div className="mini-chart-empty-copy">
            <p className="mini-chart-empty-title">{emptyTitle}</p>
            <p className="mini-chart-empty-text">{emptyMessage}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default Chart;
