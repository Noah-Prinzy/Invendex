import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getObservabilityPingRequest } from '../../api/client.js';

const formatWhen = iso => {
  if (!iso) return 'n/a';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = iso => {
  if (!iso) return 'n/a';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleString();
};

const copyTextToClipboard = async text => {
  const value = String(text || '');
  if (!value.trim()) {
    throw new Error('Nothing to copy');
  }

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is not available in this context');
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const didCopy = document.execCommand('copy');
    if (!didCopy) {
      throw new Error('Clipboard write failed');
    }
  } finally {
    document.body.removeChild(textarea);
  }
};

const Dashboard = ({
  accessToken = null,
  warehouseId = null,
  inventoryEvents = [],
  financeEvents = [],
  authEvents = []
}) => {
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [copyTraceState, setCopyTraceState] = useState('idle');

  const observabilityQuery = useQuery({
    queryKey: ['observability:ping', String(accessToken || '')],
    enabled: Boolean(accessToken) && process.env.NODE_ENV !== 'test',
    staleTime: 45 * 1000,
    refetchInterval: 45 * 1000,
    queryFn: async () => {
      const data = await getObservabilityPingRequest(accessToken);
      setLastCheckedAt(new Date().toISOString());
      return data;
    }
  });

  const observabilityStatus = useMemo(() => {
    if (observabilityQuery.isError) return 'error';
    if (observabilityQuery.data) return 'ok';
    if (observabilityQuery.isLoading || observabilityQuery.isFetching) return 'loading';
    return 'idle';
  }, [
    observabilityQuery.data,
    observabilityQuery.isError,
    observabilityQuery.isFetching,
    observabilityQuery.isLoading
  ]);

  const observabilityError = useMemo(() => {
    if (!observabilityQuery.isError) return '';
    const trace = observabilityQuery.error?.payload?.trace || {};
    const traceId = trace.serverRequestId || trace.requestId || 'n/a';
    const message = String(observabilityQuery.error?.message || 'Observability ping failed');
    return traceId === 'n/a' ? message : `${message} (request: ${traceId})`;
  }, [observabilityQuery.error, observabilityQuery.isError]);

  const observabilitySummary = useMemo(() => {
    if (observabilityStatus === 'ok') {
      return 'Healthy';
    }
    if (observabilityStatus === 'error') {
      return 'Issue detected';
    }
    if (observabilityStatus === 'loading') {
      return 'Checking';
    }
    return 'Not checked';
  }, [observabilityStatus]);

  const handleCopyTraceIds = useCallback(async () => {
    const requestId = observabilityQuery.data?.trace?.requestId || '';
    const clientTraceId = observabilityQuery.data?.trace?.clientTraceId || '';
    const payload = `requestId=${requestId || 'n/a'}\nclientTraceId=${clientTraceId || 'n/a'}`;

    try {
      await copyTextToClipboard(payload);
      setCopyTraceState('copied');
      setTimeout(() => {
        setCopyTraceState(current => (current === 'copied' ? 'idle' : current));
      }, 2000);
    } catch {
      setCopyTraceState('error');
      setTimeout(() => {
        setCopyTraceState(current => (current === 'error' ? 'idle' : current));
      }, 2500);
    }
  }, [observabilityQuery.data?.trace?.clientTraceId, observabilityQuery.data?.trace?.requestId]);

  const latestInventory = inventoryEvents[0] || null;
  const latestFinance = financeEvents[0] || null;
  const latestAuth = authEvents[0] || null;

  const metrics = [
    { label: 'Inventory events', value: String(inventoryEvents.length) },
    { label: 'Finance events', value: String(financeEvents.length) },
    { label: 'Auth events', value: String(authEvents.length) },
    { label: 'Warehouse scope', value: warehouseId || 'All warehouses' },
    { label: 'Observability', value: observabilitySummary }
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
          <h3>Observability pipeline</h3>
          <div className="panel-head-row">
            <p className="event-sub">
              Last check: {formatDateTime(lastCheckedAt)}
            </p>
            <div className="obs-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={handleCopyTraceIds}
                disabled={!observabilityQuery.data?.trace?.requestId}
              >
                {copyTraceState === 'copied'
                  ? 'Copied'
                  : copyTraceState === 'error'
                    ? 'Copy failed'
                    : 'Copy trace IDs'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => observabilityQuery.refetch()}
                disabled={observabilityQuery.isFetching || !accessToken}
              >
                {observabilityQuery.isFetching ? 'Checking...' : 'Refresh'}
              </button>
            </div>
          </div>

          {observabilityStatus === 'error' ? (
            <p className="form-error">{observabilityError || 'Observability ping failed'}</p>
          ) : null}

          <div className="obs-grid">
            <div className="obs-item">
              <p className="metric-label">Status</p>
              <p className={`obs-value ${observabilityStatus === 'ok' ? 'ok' : ''}`}>
                {observabilitySummary}
              </p>
            </div>
            <div className="obs-item">
              <p className="metric-label">Request ID</p>
              <p className="obs-value monospace">
                {observabilityQuery.data?.trace?.requestId || 'n/a'}
              </p>
            </div>
            <div className="obs-item">
              <p className="metric-label">Client trace ID</p>
              <p className="obs-value monospace">
                {observabilityQuery.data?.trace?.clientTraceId || 'n/a'}
              </p>
            </div>
            <div className="obs-item">
              <p className="metric-label">Realtime</p>
              <p className="obs-value">
                {observabilityQuery.data?.realtime?.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="obs-item">
              <p className="metric-label">Error tracker</p>
              <p className="obs-value">
                {observabilityQuery.data?.errorTracking?.provider || 'n/a'}
              </p>
            </div>
            <div className="obs-item">
              <p className="metric-label">Uptime</p>
              <p className="obs-value">
                {Number.isFinite(observabilityQuery.data?.uptimeSeconds)
                  ? `${observabilityQuery.data?.uptimeSeconds}s`
                  : 'n/a'}
              </p>
            </div>
          </div>
        </article>

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

        <article className="event-card">
          <h3>Auth stream</h3>
          <ul className="event-list">
            {authEvents.length ? (
              authEvents.slice(0, 6).map(event => (
                <li key={event.id} className="event-item">
                  <div>
                    <p className="event-title">{event.title}</p>
                    <p className="event-sub">{event.subtitle}</p>
                  </div>
                  <span className="event-time">{formatWhen(event.occurredAt)}</span>
                </li>
              ))
            ) : (
              <li className="event-empty">No auth events yet.</li>
            )}
          </ul>
          {latestAuth ? <pre>{JSON.stringify(latestAuth.raw, null, 2)}</pre> : null}
        </article>
      </div>
    </section>
  );
};

export default Dashboard;
