import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveInventoryStocktakeSessionRequest,
  createInventoryStocktakeSessionRequest,
  getInventoryStocktakeSessionRequest,
  listInventoryStocktakesRequest,
  submitInventoryStocktakeCountsRequest
} from '../../../api/client.js';
import { SectionHint } from '../../../components/PageGuide.js';

const normalizeText = (value) => String(value || '').trim();

const resolveSessionId = (session) =>
  String(session?.id || session?._id || '').trim();

const resolveProductId = (line) =>
  String(line?.product?.id || line?.product?._id || line?.product || '').trim();

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const WarehouseStocktakePanel = ({
  accessToken = null,
  warehouseId = null,
  activeWarehouseLabel = 'Selected warehouse'
}) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [countsDraft, setCountsDraft] = useState({});

  const scopedWarehouseId = normalizeText(warehouseId);

  const stocktakesQuery = useQuery({
    queryKey: [
      'warehouse:stocktakes',
      String(accessToken || ''),
      scopedWarehouseId,
      String(statusFilter || '')
    ],
    enabled: Boolean(accessToken) && Boolean(scopedWarehouseId),
    staleTime: 20 * 1000,
    queryFn: () =>
      listInventoryStocktakesRequest({
        accessToken,
        warehouseId: scopedWarehouseId,
        status: statusFilter || '',
        limit: 8
      })
  });

  const createStocktakeMutation = useMutation({
    mutationFn: () =>
      createInventoryStocktakeSessionRequest({
        accessToken,
        warehouseId: scopedWarehouseId,
        title: normalizeText(title),
        notes: normalizeText(notes)
      }),
    onSuccess: async (session) => {
      setNotice('Stocktake session created for the selected warehouse.');
      setTitle('');
      setNotes('');
      setSelectedSessionId(resolveSessionId(session));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['warehouse:stocktakes'] }),
        queryClient.invalidateQueries({ queryKey: ['stocktakes:list'] }),
        queryClient.invalidateQueries({
          queryKey: ['warehouse:stocktake-session']
        })
      ]);
    },
    onError: (error) => {
      setNotice(String(error?.message || 'Unable to create stocktake session'));
    }
  });

  const stocktakeRows = useMemo(
    () => (Array.isArray(stocktakesQuery.data) ? stocktakesQuery.data : []),
    [stocktakesQuery.data]
  );

  useEffect(() => {
    if (!stocktakeRows.length) {
      setSelectedSessionId('');
      return;
    }

    const hasSelected = stocktakeRows.some(
      (row) => resolveSessionId(row) === normalizeText(selectedSessionId)
    );

    if (!hasSelected) {
      setSelectedSessionId(resolveSessionId(stocktakeRows[0]));
    }
  }, [selectedSessionId, stocktakeRows]);

  const selectedSessionQuery = useQuery({
    queryKey: [
      'warehouse:stocktake-session',
      String(accessToken || ''),
      scopedWarehouseId,
      String(selectedSessionId || '')
    ],
    enabled:
      Boolean(accessToken) &&
      Boolean(scopedWarehouseId) &&
      Boolean(normalizeText(selectedSessionId)),
    queryFn: () =>
      getInventoryStocktakeSessionRequest({
        accessToken,
        sessionId: normalizeText(selectedSessionId)
      })
  });

  const selectedSession = selectedSessionQuery.data || null;
  const selectedSessionStatus = String(
    selectedSession?.status || ''
  ).toUpperCase();
  const lineRows = useMemo(
    () => (Array.isArray(selectedSession?.lines) ? selectedSession.lines : []),
    [selectedSession]
  );

  useEffect(() => {
    if (!selectedSession) {
      setCountsDraft({});
      return;
    }

    const nextDraft = {};
    for (const line of lineRows) {
      const productId = resolveProductId(line);
      if (!productId) continue;
      if (Number.isFinite(Number(line?.countedQuantity))) {
        nextDraft[productId] = String(Number(line.countedQuantity));
      } else {
        nextDraft[productId] = '';
      }
    }
    setCountsDraft(nextDraft);
  }, [lineRows, selectedSession]);

  const submitCountsMutation = useMutation({
    mutationFn: (counts) =>
      submitInventoryStocktakeCountsRequest({
        accessToken,
        sessionId: normalizeText(selectedSessionId),
        counts
      }),
    onSuccess: async () => {
      setNotice('Counts submitted. Session moved to review.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['warehouse:stocktakes'] }),
        queryClient.invalidateQueries({
          queryKey: ['warehouse:stocktake-session']
        }),
        queryClient.invalidateQueries({ queryKey: ['stocktakes:list'] }),
        queryClient.invalidateQueries({ queryKey: ['stocktakes:session'] })
      ]);
    },
    onError: (error) => {
      setNotice(String(error?.message || 'Unable to submit stocktake counts'));
    }
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      approveInventoryStocktakeSessionRequest({
        accessToken,
        sessionId: normalizeText(selectedSessionId)
      }),
    onSuccess: async () => {
      setNotice('Stocktake approved and warehouse adjustments applied.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['warehouse:stocktakes'] }),
        queryClient.invalidateQueries({
          queryKey: ['warehouse:stocktake-session']
        }),
        queryClient.invalidateQueries({ queryKey: ['stocktakes:list'] }),
        queryClient.invalidateQueries({ queryKey: ['stocktakes:session'] }),
        queryClient.invalidateQueries({ queryKey: ['products:index'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard:intelligence'] })
      ]);
    },
    onError: (error) => {
      setNotice(
        String(error?.message || 'Unable to approve stocktake session')
      );
    }
  });

  const stocktakeSummary = useMemo(
    () =>
      stocktakeRows.reduce(
        (summary, row) => {
          const status = String(row?.status || '').toUpperCase();
          summary.total += 1;
          if (status === 'OPEN') summary.open += 1;
          if (status === 'IN_REVIEW') summary.review += 1;
          if (status === 'APPROVED') summary.approved += 1;
          return summary;
        },
        {
          total: 0,
          open: 0,
          review: 0,
          approved: 0
        }
      ),
    [stocktakeRows]
  );

  const canSubmitCounts = Boolean(
    selectedSession &&
    ['OPEN', 'IN_REVIEW'].includes(selectedSessionStatus) &&
    lineRows.length
  );
  const canApprove = Boolean(
    selectedSession &&
    !['APPROVED', 'CANCELLED'].includes(selectedSessionStatus) &&
    lineRows.length
  );

  const handleCreateStocktake = (event) => {
    event.preventDefault();

    if (!scopedWarehouseId) {
      setNotice(
        'Select a warehouse in the header before creating a stocktake.'
      );
      return;
    }

    createStocktakeMutation.mutate();
  };

  const handleSubmitCounts = () => {
    if (!selectedSessionId || !lineRows.length) {
      setNotice('Select a stocktake session with count lines first.');
      return;
    }

    const counts = [];
    for (const line of lineRows) {
      const productId = resolveProductId(line);
      const rawValue = String(countsDraft?.[productId] ?? '').trim();
      if (!productId || rawValue === '') continue;

      const countedQuantity = Number(rawValue);
      if (!Number.isInteger(countedQuantity) || countedQuantity < 0) {
        setNotice(`Invalid counted quantity for ${line?.sku || productId}.`);
        return;
      }

      counts.push({
        productId,
        countedQuantity
      });
    }

    if (!counts.length) {
      setNotice('Enter at least one counted quantity before submitting.');
      return;
    }

    setNotice('');
    submitCountsMutation.mutate(counts);
  };

  const handleApprove = () => {
    if (!selectedSessionId) {
      setNotice('Select a stocktake session before approving it.');
      return;
    }

    setNotice('');
    approveMutation.mutate();
  };

  if (!scopedWarehouseId) {
    return (
      <article className="data-card">
        <h3>Warehouse stocktakes</h3>
        <SectionHint>
          Select a specific warehouse in the header to create or review recent
          stocktake sessions for that location.
        </SectionHint>
      </article>
    );
  }

  return (
    <article className="data-card">
      <h3>Warehouse stocktakes</h3>
      <SectionHint>
        Create quick cycle-count sessions for{' '}
        <strong>{activeWarehouseLabel || 'the selected warehouse'}</strong> and
        keep an eye on recent session status without leaving this workspace.
      </SectionHint>

      <form className="control-row" onSubmit={handleCreateStocktake}>
        <label className="control-field">
          <span>Title (optional)</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event?.target?.value || '')}
            placeholder="Cycle count - fast movers"
            disabled={createStocktakeMutation.isPending}
          />
        </label>
        <label className="control-field">
          <span>Notes (optional)</span>
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event?.target?.value || '')}
            placeholder="Run before afternoon dispatch"
            disabled={createStocktakeMutation.isPending}
          />
        </label>
        <button
          type="submit"
          className="btn-ghost"
          disabled={createStocktakeMutation.isPending}
        >
          {createStocktakeMutation.isPending
            ? 'Creating...'
            : 'Create stocktake'}
        </button>
      </form>

      <div className="control-row compact">
        <label className="control-field">
          <span>Status filter</span>
          <select
            aria-label="Stocktake status filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event?.target?.value || '')}
          >
            <option value="">All statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </label>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => stocktakesQuery.refetch()}
          disabled={stocktakesQuery.isFetching}
        >
          {stocktakesQuery.isFetching ? 'Refreshing...' : 'Refresh stocktakes'}
        </button>
      </div>

      <p className="muted">
        Loaded {stocktakeSummary.total} session(s): {stocktakeSummary.open}{' '}
        open, {stocktakeSummary.review} in review, {stocktakeSummary.approved}{' '}
        approved.
      </p>
      {notice ? <p className="section-note">{notice}</p> : null}
      {stocktakesQuery.error ? (
        <p className="form-error">
          {String(
            stocktakesQuery.error?.message ||
              'Unable to load warehouse stocktakes'
          )}
        </p>
      ) : null}

      {stocktakeRows.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Variance lines</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {stocktakeRows.map((row) => {
                const sessionId = resolveSessionId(row);
                const isSelected =
                  normalizeText(selectedSessionId) === normalizeText(sessionId);

                return (
                  <tr
                    key={sessionId}
                    className={`table-row-interactive${isSelected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedSessionId(sessionId)}
                  >
                    <td>{row?.title || '-'}</td>
                    <td>{row?.status || '-'}</td>
                    <td>
                      {Number(row?.countedLines || 0)}/
                      {Number(row?.totalLines || 0)}
                    </td>
                    <td>{Number(row?.varianceLines || 0)}</td>
                    <td>{formatDateTime(row?.updatedAt || row?.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">
          No stocktake sessions have been created for this warehouse yet.
        </p>
      )}

      <SectionHint>
        Select a recent session to enter quick counts or approve it after
        review. Use the full Stocktakes tab for camera-assisted counting and
        larger review sessions.
      </SectionHint>
      {selectedSessionQuery.isLoading ? (
        <p className="muted">Loading selected session...</p>
      ) : null}
      {selectedSessionQuery.error ? (
        <p className="form-error">
          {String(
            selectedSessionQuery.error?.message ||
              'Unable to load the selected stocktake session'
          )}
        </p>
      ) : null}
      {!selectedSession ? (
        <p className="muted">Select a recent session to continue.</p>
      ) : (
        <>
          <p className="section-note">
            Status {selectedSession?.status || '-'} | Created{' '}
            {formatDateTime(selectedSession?.createdAt)}
            {selectedSession?.approvedAt
              ? ` | Approved ${formatDateTime(selectedSession?.approvedAt)}`
              : ''}
          </p>
          {lineRows.length ? (
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
                    const productId = resolveProductId(line);
                    const countedValue = String(countsDraft?.[productId] ?? '');
                    const expectedQuantity = Number(
                      line?.expectedQuantity || 0
                    );
                    const parsedCount = Number(countedValue);
                    const variance =
                      countedValue !== '' && Number.isFinite(parsedCount)
                        ? parsedCount - expectedQuantity
                        : Number(line?.variance || 0);

                    return (
                      <tr key={`${productId}:${normalizeText(line?.sku)}`}>
                        <td>{line?.sku || '-'}</td>
                        <td>{line?.productName || '-'}</td>
                        <td>{expectedQuantity}</td>
                        <td>
                          <input
                            className="table-count-input"
                            aria-label={`Counted ${line?.sku || productId}`}
                            type="number"
                            min="0"
                            step="1"
                            value={countedValue}
                            disabled={
                              !canSubmitCounts || submitCountsMutation.isPending
                            }
                            onChange={(event) => {
                              const nextValue = event?.target?.value || '';
                              setCountsDraft((current) => ({
                                ...current,
                                [productId]: nextValue
                              }));
                              setNotice('');
                            }}
                          />
                        </td>
                        <td>{Number.isFinite(variance) ? variance : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              This session has no stocktake lines yet. Open the main Stocktakes
              tab to review the full session state.
            </p>
          )}

          <div className="action-row">
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
        </>
      )}
    </article>
  );
};

export default WarehouseStocktakePanel;
