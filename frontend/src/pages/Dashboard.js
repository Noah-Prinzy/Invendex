import React from 'react';

const formatWhen = iso => {
  if (!iso) return 'n/a';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Dashboard = ({ warehouseId = null, inventoryEvents = [], financeEvents = [] }) => {
  const latestInventory = inventoryEvents[0] || null;
  const latestFinance = financeEvents[0] || null;

  const metrics = [
    { label: 'Inventory events', value: String(inventoryEvents.length) },
    { label: 'Finance events', value: String(financeEvents.length) },
    { label: 'Warehouse scope', value: warehouseId || 'All warehouses' }
  ];

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>Operations Dashboard</h2>
          <p>Live inventory and finance feeds powered by Socket.IO.</p>
        </div>
      </header>

      <div className="metric-grid">
        {metrics.map(metric => (
          <article key={metric.label} className="metric-card">
            <p className="metric-label">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
          </article>
        ))}
      </div>

      <div className="event-grid">
        <article className="event-card">
          <h3>Inventory stream</h3>
          <ul className="event-list">
            {inventoryEvents.length ? (
              inventoryEvents.slice(0, 6).map(event => (
                <li key={event.id} className="event-item">
                  <div>
                    <p className="event-title">{event.title}</p>
                    <p className="event-sub">{event.subtitle}</p>
                  </div>
                  <span className="event-time">{formatWhen(event.occurredAt)}</span>
                </li>
              ))
            ) : (
              <li className="event-empty">No inventory events yet.</li>
            )}
          </ul>
          {latestInventory ? (
            <pre>{JSON.stringify(latestInventory.raw, null, 2)}</pre>
          ) : null}
        </article>

        <article className="event-card">
          <h3>Finance stream</h3>
          <ul className="event-list">
            {financeEvents.length ? (
              financeEvents.slice(0, 6).map(event => (
                <li key={event.id} className="event-item">
                  <div>
                    <p className="event-title">{event.title}</p>
                    <p className="event-sub">{event.subtitle}</p>
                  </div>
                  <span className="event-time">{formatWhen(event.occurredAt)}</span>
                </li>
              ))
            ) : (
              <li className="event-empty">No finance events yet.</li>
            )}
          </ul>
          {latestFinance ? <pre>{JSON.stringify(latestFinance.raw, null, 2)}</pre> : null}
        </article>
      </div>
    </section>
  );
};

export default Dashboard;
