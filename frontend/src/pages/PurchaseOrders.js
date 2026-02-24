import React from 'react';

const formatWhen = iso => {
  if (!iso) return 'n/a';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const PurchaseOrders = ({ poEvents = [] }) => {
  const createdCount = poEvents.filter(event => event.kind === 'created').length;
  const receivedCount = poEvents.filter(event => event.kind === 'received').length;
  const updatedCount = poEvents.filter(event => event.kind === 'updated').length;
  const latestPoEvent = poEvents[0] || null;

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>Purchase Order Feed</h2>
          <p>Live PO events are grouped and summarized for quick action.</p>
        </div>
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
      </div>

      <div className="event-grid one-col">
        <article className="event-card">
          <h3>Latest PO timeline</h3>
          <ul className="event-list">
            {poEvents.length ? (
              poEvents.slice(0, 10).map(event => (
                <li key={event.id} className="event-item">
                  <div>
                    <p className="event-title">{event.title}</p>
                    <p className="event-sub">{event.subtitle}</p>
                  </div>
                  <span className={`event-pill ${event.kind}`}>{event.kind}</span>
                </li>
              ))
            ) : (
              <li className="event-empty">No purchase order events received yet.</li>
            )}
          </ul>
          {latestPoEvent ? (
            <>
              <p className="event-sub">Most recent: {formatWhen(latestPoEvent.occurredAt)}</p>
              <pre>{JSON.stringify(latestPoEvent.raw, null, 2)}</pre>
            </>
          ) : null}
        </article>
      </div>
    </section>
  );
};

export default PurchaseOrders;
