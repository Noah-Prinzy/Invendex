import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getObservabilityPingRequest } from '../../api/client.js';

const formatDateTime = (iso) => {
  if (!iso) return 'n/a';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleString();
};

const copyTextToClipboard = async (text) => {
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

const Settings = ({ accessToken = null }) => {
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [copyTraceState, setCopyTraceState] = useState('idle');

  const observabilityQuery = useQuery({
    queryKey: ['observability:ping:settings', String(accessToken || '')],
    enabled: Boolean(accessToken),
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
    if (observabilityQuery.isLoading || observabilityQuery.isFetching) {
      return 'loading';
    }
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
    const message = String(
      observabilityQuery.error?.message || 'Observability ping failed'
    );
    return traceId === 'n/a' ? message : `${message} (request: ${traceId})`;
  }, [observabilityQuery.error, observabilityQuery.isError]);

  const observabilitySummary = useMemo(() => {
    if (observabilityStatus === 'ok') return 'Healthy';
    if (observabilityStatus === 'error') return 'Issue detected';
    if (observabilityStatus === 'loading') return 'Checking';
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
        setCopyTraceState((current) =>
          current === 'copied' ? 'idle' : current
        );
      }, 2000);
    } catch {
      setCopyTraceState('error');
      setTimeout(() => {
        setCopyTraceState((current) =>
          current === 'error' ? 'idle' : current
        );
      }, 2500);
    }
  }, [
    observabilityQuery.data?.trace?.clientTraceId,
    observabilityQuery.data?.trace?.requestId
  ]);

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>Settings</h2>
          <p>Organization controls, valuation defaults, and notifications.</p>
        </div>
      </header>
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
          <p className="form-error">
            {observabilityError || 'Observability ping failed'}
          </p>
        ) : null}

        <div className="obs-grid">
          <div className="obs-item">
            <p className="metric-label">Status</p>
            <p
              className={`obs-value ${observabilityStatus === 'ok' ? 'ok' : ''}`}
            >
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
              {observabilityQuery.data?.realtime?.enabled
                ? 'Enabled'
                : 'Disabled'}
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
    </section>
  );
};

export default Settings;
