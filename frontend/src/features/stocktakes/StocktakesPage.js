import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveInventoryStocktakeSessionRequest,
  createInventoryStocktakeSessionRequest,
  getInventoryStocktakeSessionRequest,
  listInventoryStocktakesRequest,
  submitInventoryStocktakeCountsRequest
} from '../../api/client.js';

const STOCKTAKE_STATUSES = ['', 'OPEN', 'IN_REVIEW', 'APPROVED', 'CANCELLED'];

const toSessionId = (session) =>
  String(session?.id || session?._id || '').trim();

const toProductId = (line) =>
  String(line?.product?.id || line?.product?._id || line?.product || '').trim();

const formatDateTime = (value) => {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'n/a';
  return parsed.toLocaleString();
};

const StocktakesPage = ({ accessToken, warehouseId = null }) => {
  const queryClient = useQueryClient();
  const [filterWarehouseId, setFilterWarehouseId] = useState(
    String(warehouseId || '').trim()
  );
  const [statusFilter, setStatusFilter] = useState('');
  const [createWarehouseId, setCreateWarehouseId] = useState(
    String(warehouseId || '').trim()
  );
  const [createTitle, setCreateTitle] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createNotice, setCreateNotice] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [countsDraft, setCountsDraft] = useState({});
  const [countsNotice, setCountsNotice] = useState('');

  useEffect(() => {
    const normalized = String(warehouseId || '').trim();
    if (normalized && !filterWarehouseId) {
      setFilterWarehouseId(normalized);
    }
    if (normalized && !createWarehouseId) {
      setCreateWarehouseId(normalized);
    }
  }, [warehouseId, filterWarehouseId, createWarehouseId]);

  const sessionsQuery = useQuery({
    queryKey: [
      'stocktakes:list',
      String(accessToken || ''),
      String(filterWarehouseId || ''),
      String(statusFilter || '')
    ],
    enabled: Boolean(accessToken),
    queryFn: () =>
      listInventoryStocktakesRequest({
        accessToken,
        warehouseId: String(filterWarehouseId || '').trim() || null,
        status: statusFilter || '',
        limit: 100
      })
  });

  const sessions = useMemo(
    () => (Array.isArray(sessionsQuery.data) ? sessionsQuery.data : []),
    [sessionsQuery.data]
  );

  useEffect(() => {
    if (!sessions.length) {
      setSelectedSessionId('');
      return;
    }

    const currentExists = sessions.some(
      (session) => toSessionId(session) === selectedSessionId
    );
    if (!currentExists) {
      setSelectedSessionId(toSessionId(sessions[0]));
    }
  }, [sessions, selectedSessionId]);

  const selectedSessionQuery = useQuery({
    queryKey: [
      'stocktakes:session',
      String(accessToken || ''),
      selectedSessionId
    ],
    enabled: Boolean(accessToken && selectedSessionId),
    queryFn: () =>
      getInventoryStocktakeSessionRequest({
        accessToken,
        sessionId: selectedSessionId
      })
  });

  const selectedSession = selectedSessionQuery.data || null;

  useEffect(() => {
    if (!selectedSession) {
      setCountsDraft({});
      return;
    }

    const nextDraft = {};
    const lines = Array.isArray(selectedSession.lines)
      ? selectedSession.lines
      : [];
    for (const line of lines) {
      const productId = toProductId(line);
      if (!productId) continue;
      if (Number.isFinite(Number(line.countedQuantity))) {
        nextDraft[productId] = String(Number(line.countedQuantity));
      } else {
        nextDraft[productId] = '';
      }
    }
    setCountsDraft(nextDraft);
  }, [selectedSession]);

  const createMutation = useMutation({
    mutationFn: ({ warehouseId: nextWarehouseId, title, notes }) =>
      createInventoryStocktakeSessionRequest({
        accessToken,
        warehouseId: nextWarehouseId,
        title,
        notes
      }),
    onSuccess: (session) => {
      const sessionId = toSessionId(session);
      setCreateNotice('Stocktake session created.');
      setCreateTitle('');
      setCreateNotes('');
      setSelectedSessionId(sessionId);
      queryClient.invalidateQueries({ queryKey: ['stocktakes:list'] });
      queryClient.invalidateQueries({ queryKey: ['stocktakes:session'] });
    },
    onError: (error) => {
      setCreateNotice(String(error?.message || 'Unable to create stocktake'));
    }
  });

  const submitCountsMutation = useMutation({
    mutationFn: ({ sessionId, counts }) =>
      submitInventoryStocktakeCountsRequest({
        accessToken,
        sessionId,
        counts
      }),
    onSuccess: () => {
      setCountsNotice('Counts submitted. Session moved to review.');
      queryClient.invalidateQueries({ queryKey: ['stocktakes:list'] });
      queryClient.invalidateQueries({ queryKey: ['stocktakes:session'] });
    },
    onError: (error) => {
      setCountsNotice(String(error?.message || 'Unable to submit counts'));
    }
  });

  const approveMutation = useMutation({
    mutationFn: (sessionId) =>
      approveInventoryStocktakeSessionRequest({
        accessToken,
        sessionId
      }),
    onSuccess: () => {
      setCountsNotice('Stocktake approved and adjustments applied.');
      queryClient.invalidateQueries({ queryKey: ['stocktakes:list'] });
      queryClient.invalidateQueries({ queryKey: ['stocktakes:session'] });
    },
    onError: (error) => {
      setCountsNotice(String(error?.message || 'Unable to approve stocktake'));
    }
  });

  const lineRows = useMemo(
    () => (Array.isArray(selectedSession?.lines) ? selectedSession.lines : []),
    [selectedSession]
  );

  const canSubmitCounts = Boolean(
    selectedSession &&
    ['OPEN', 'IN_REVIEW'].includes(String(selectedSession.status || ''))
  );
  const canApprove = Boolean(
    selectedSession && String(selectedSession.status || '') !== 'APPROVED'
  );

  const handleCreateSession = async (event) => {
    event.preventDefault();
    setCreateNotice('');
    const normalizedWarehouseId = String(createWarehouseId || '').trim();
    if (!normalizedWarehouseId) {
      setCreateNotice(
        'Warehouse ID is required to create a stocktake session.'
      );
      return;
    }

    await createMutation.mutateAsync({
      warehouseId: normalizedWarehouseId,
      title: createTitle,
      notes: createNotes
    });
  };

  const handleSubmitCounts = async () => {
    if (!selectedSessionId || !lineRows.length) {
      setCountsNotice('Select a stocktake session first.');
      return;
    }

    const counts = [];
    for (const line of lineRows) {
      const productId = toProductId(line);
      const raw = String(countsDraft[productId] ?? '').trim();
      if (!productId || raw === '') continue;
      const countedQuantity = Number(raw);
      if (!Number.isInteger(countedQuantity) || countedQuantity < 0) {
        setCountsNotice(
          `Invalid counted quantity for SKU ${line.sku || productId}.`
        );
        return;
      }
      counts.push({ productId, countedQuantity });
    }

    if (!counts.length) {
      setCountsNotice('Enter at least one counted quantity before submitting.');
      return;
    }

    setCountsNotice('');
    await submitCountsMutation.mutateAsync({
      sessionId: selectedSessionId,
      counts
    });
  };

  const handleApprove = async () => {
    if (!selectedSessionId) {
      setCountsNotice('Select a stocktake session first.');
      return;
    }
    setCountsNotice('');
    await approveMutation.mutateAsync(selectedSessionId);
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Stocktakes</h2>
          <p>
            Create cycle-count sessions, submit counted quantities, and approve
            variances.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => sessionsQuery.refetch()}
          disabled={sessionsQuery.isFetching}
        >
          {sessionsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      <article className="data-card">
        <h3>Create stocktake session</h3>
        <form className="control-row" onSubmit={handleCreateSession}>
          <label className="control-field">
            <span>Warehouse ID</span>
            <input
              type="text"
              value={createWarehouseId}
              onChange={(event) => setCreateWarehouseId(event.target.value)}
              placeholder="Required warehouse id"
            />
          </label>
          <label className="control-field">
            <span>Title (optional)</span>
            <input
              type="text"
              value={createTitle}
              onChange={(event) => setCreateTitle(event.target.value)}
              placeholder="Stocktake title"
            />
          </label>
          <label className="control-field">
            <span>Notes (optional)</span>
            <input
              type="text"
              value={createNotes}
              onChange={(event) => setCreateNotes(event.target.value)}
              placeholder="Context for the team"
            />
          </label>
          <button
            type="submit"
            className="btn-ghost"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create session'}
          </button>
        </form>
        {createNotice ? <p className="section-note">{createNotice}</p> : null}
      </article>

      <article className="data-card">
        <h3>Session list</h3>
        <div className="control-row compact">
          <label className="control-field">
            <span>Warehouse filter</span>
            <input
              type="text"
              value={filterWarehouseId}
              onChange={(event) => setFilterWarehouseId(event.target.value)}
              placeholder="Optional warehouse id"
            />
          </label>
          <label className="control-field">
            <span>Status filter</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">ALL</option>
              {STOCKTAKE_STATUSES.filter(Boolean).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => sessionsQuery.refetch()}
            disabled={sessionsQuery.isFetching}
          >
            Apply filters
          </button>
        </div>
        {sessionsQuery.error ? (
          <p className="form-error">
            {String(
              sessionsQuery.error?.message || 'Unable to fetch stocktakes'
            )}
          </p>
        ) : null}
        {sessions.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Warehouse</th>
                  <th>Lines</th>
                  <th>Variance lines</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const sessionId = toSessionId(session);
                  const isSelected = sessionId === selectedSessionId;
                  return (
                    <tr
                      key={sessionId}
                      onClick={() => setSelectedSessionId(sessionId)}
                      style={{
                        cursor: 'pointer',
                        opacity: isSelected ? 1 : 0.92
                      }}
                    >
                      <td>{session.title || '-'}</td>
                      <td>{session.status || '-'}</td>
                      <td>
                        {session?.warehouse?.name ||
                          session?.warehouse?.code ||
                          '-'}
                      </td>
                      <td>
                        {Number(session.countedLines || 0)}/
                        {Number(session.totalLines || 0)}
                      </td>
                      <td>{Number(session.varianceLines || 0)}</td>
                      <td>{formatDateTime(session.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No stocktake sessions found for this scope.</p>
        )}
      </article>

      <article className="data-card">
        <h3>Session details</h3>
        {selectedSessionQuery.isLoading ? (
          <p className="muted">Loading session...</p>
        ) : null}
        {selectedSessionQuery.error ? (
          <p className="form-error">
            {String(
              selectedSessionQuery.error?.message || 'Unable to load session'
            )}
          </p>
        ) : null}
        {!selectedSession ? (
          <p className="muted">Select a stocktake session to continue.</p>
        ) : (
          <>
            <p className="section-note">
              Status {selectedSession.status} | Created{' '}
              {formatDateTime(selectedSession.createdAt)}
              {selectedSession?.approvedAt
                ? ` | Approved ${formatDateTime(selectedSession.approvedAt)}`
                : ''}
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Expected</th>
                    <th>Counted</th>
                    <th>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {lineRows.map((line) => {
                    const productId = toProductId(line);
                    const countedValue = countsDraft[productId] ?? '';
                    const expectedQuantity = Number(line.expectedQuantity || 0);
                    const parsedCount = Number(countedValue);
                    const hasCount =
                      countedValue !== '' && Number.isFinite(parsedCount);
                    const variance = hasCount
                      ? parsedCount - expectedQuantity
                      : Number(line.variance || 0);
                    return (
                      <tr key={`${productId}:${line.sku}`}>
                        <td>{line.sku || '-'}</td>
                        <td>{line.productName || '-'}</td>
                        <td>{expectedQuantity}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={countedValue}
                            disabled={
                              !canSubmitCounts || submitCountsMutation.isPending
                            }
                            onChange={(event) => {
                              const value = event.target.value;
                              setCountsDraft((current) => ({
                                ...current,
                                [productId]: value
                              }));
                            }}
                            style={{ width: '92px' }}
                          />
                        </td>
                        <td>{Number.isFinite(variance) ? variance : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="action-row" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleSubmitCounts}
                disabled={!canSubmitCounts || submitCountsMutation.isPending}
              >
                {submitCountsMutation.isPending
                  ? 'Submitting...'
                  : 'Submit counts'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleApprove}
                disabled={!canApprove || approveMutation.isPending}
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve session'}
              </button>
            </div>
            {countsNotice ? (
              <p className="section-note">{countsNotice}</p>
            ) : null}
          </>
        )}
      </article>
    </section>
  );
};

export default StocktakesPage;
