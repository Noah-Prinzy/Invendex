import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveInventoryStocktakeSessionRequest,
  createInventoryStocktakeSessionRequest,
  getInventoryStocktakeSessionRequest,
  listInventoryStocktakesRequest,
  scanInventoryStocktakeImageRequest,
  submitInventoryStocktakeCountsRequest
} from '../../api/client.js';
import { readCachedData, writeCachedData } from '../../offline/dataCache.js';
import Modal from '../../ui/Modal.js';

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

const normalizeScanToken = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

const toCompactScanToken = (value) =>
  normalizeScanToken(value).replace(/[^A-Z0-9]/g, '');

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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('');
  const [scannerError, setScannerError] = useState('');
  const [scannerTallies, setScannerTallies] = useState({});
  const [visionModalOpen, setVisionModalOpen] = useState(false);
  const [visionStatus, setVisionStatus] = useState('');
  const [visionError, setVisionError] = useState('');
  const [visionImageDataUrl, setVisionImageDataUrl] = useState('');
  const [visionResult, setVisionResult] = useState(null);
  const scannerVideoRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scannerFrameRef = useRef(null);
  const lastScanRef = useRef({ value: '', at: 0 });
  const visionVideoRef = useRef(null);
  const visionStreamRef = useRef(null);
  const supportsCameraScan = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      'BarcodeDetector' in window &&
      Boolean(navigator?.mediaDevices?.getUserMedia)
    );
  }, []);
  const supportsVisionCamera = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(navigator?.mediaDevices?.getUserMedia);
  }, []);

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
    queryFn: async () => {
      const cacheKey = `stocktakes:list:${String(filterWarehouseId || '')
        .trim()
        .toLowerCase()}:${String(statusFilter || '')
        .trim()
        .toUpperCase()}`;
      try {
        const rows = await listInventoryStocktakesRequest({
          accessToken,
          warehouseId: String(filterWarehouseId || '').trim() || null,
          status: statusFilter || '',
          limit: 100
        });
        writeCachedData(cacheKey, rows);
        return rows;
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
    queryFn: async () => {
      const cacheKey = `stocktakes:session:${String(selectedSessionId || '')
        .trim()
        .toLowerCase()}`;
      try {
        const session = await getInventoryStocktakeSessionRequest({
          accessToken,
          sessionId: selectedSessionId
        });
        writeCachedData(cacheKey, session);
        return session;
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

  const visionScanMutation = useMutation({
    mutationFn: ({ imageDataUrl }) =>
      scanInventoryStocktakeImageRequest({
        accessToken,
        sessionId: selectedSessionId,
        imageDataUrl,
        maxDetections: Math.max(1, Math.min(lineRows.length || 50, 200)),
        confidenceThreshold: 0.35
      }),
    onSuccess: (result) => {
      setVisionResult(result || null);
      setVisionStatus(
        `Vision scan completed. Eligible: ${Number(result?.autoApplySummary?.eligibleCount || 0)}, review required: ${Number(result?.autoApplySummary?.reviewRequiredCount || 0)}.`
      );
      setVisionError('');
    },
    onError: (error) => {
      setVisionResult(null);
      setVisionError(String(error?.message || 'Unable to analyze shelf image'));
      setVisionStatus('');
    }
  });

  const lineRows = useMemo(
    () => (Array.isArray(selectedSession?.lines) ? selectedSession.lines : []),
    [selectedSession]
  );
  const lineLookupByScanToken = useMemo(() => {
    const lookup = new Map();
    for (const line of lineRows) {
      const productId = toProductId(line);
      const sku = String(line?.sku || '').trim();
      if (!productId || !sku) continue;
      const exact = normalizeScanToken(sku);
      const compact = toCompactScanToken(sku);
      const entry = { productId, sku };
      lookup.set(exact, entry);
      if (compact && compact !== exact) {
        lookup.set(compact, entry);
      }
    }
    return lookup;
  }, [lineRows]);

  const canSubmitCounts = Boolean(
    selectedSession &&
    ['OPEN', 'IN_REVIEW'].includes(String(selectedSession.status || ''))
  );
  const canApprove = Boolean(
    selectedSession && String(selectedSession.status || '') !== 'APPROVED'
  );

  const stopScanner = useCallback(() => {
    if (scannerFrameRef.current) {
      window.cancelAnimationFrame(scannerFrameRef.current);
      scannerFrameRef.current = null;
    }

    if (scannerStreamRef.current) {
      for (const track of scannerStreamRef.current.getTracks()) {
        track.stop();
      }
      scannerStreamRef.current = null;
    }

    if (scannerVideoRef.current) {
      scannerVideoRef.current.srcObject = null;
    }
  }, []);

  const closeScanner = useCallback(() => {
    stopScanner();
    setScannerOpen(false);
    setScannerStatus('');
  }, [stopScanner]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  useEffect(() => {
    if (!scannerOpen) {
      stopScanner();
      return undefined;
    }

    if (!supportsCameraScan) {
      setScannerError(
        'Camera scan is not supported in this browser. Enter counts manually.'
      );
      return undefined;
    }

    let isCancelled = false;
    let detector = null;

    const startScanner = async () => {
      try {
        setScannerError('');
        setScannerStatus('Starting camera...');

        const BarcodeDetectorCtor = window.BarcodeDetector;
        const supportedFormats =
          await BarcodeDetectorCtor.getSupportedFormats();
        const preferredFormats = supportedFormats.filter((format) =>
          ['ean_13', 'upc_a', 'upc_e', 'code_128', 'qr_code'].includes(format)
        );
        detector = new BarcodeDetectorCtor(
          preferredFormats.length ? { formats: preferredFormats } : {}
        );

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' }
          },
          audio: false
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        scannerStreamRef.current = stream;
        if (scannerVideoRef.current) {
          scannerVideoRef.current.srcObject = stream;
          await scannerVideoRef.current.play();
        }

        setScannerStatus('Point camera at an SKU barcode/QR label.');

        const scanFrame = async () => {
          if (isCancelled || !scannerVideoRef.current) return;

          try {
            const detections = await detector.detect(scannerVideoRef.current);
            if (Array.isArray(detections) && detections.length > 0) {
              const rawValue = String(detections[0]?.rawValue || '').trim();
              if (rawValue) {
                const now = Date.now();
                const normalizedRaw = normalizeScanToken(rawValue);
                if (
                  lastScanRef.current.value === normalizedRaw &&
                  now - Number(lastScanRef.current.at || 0) < 1200
                ) {
                  // Ignore duplicate frame detections for the same code.
                } else {
                  lastScanRef.current = { value: normalizedRaw, at: now };
                  const compactRaw = toCompactScanToken(rawValue);
                  const matchedLine =
                    lineLookupByScanToken.get(normalizedRaw) ||
                    lineLookupByScanToken.get(compactRaw);

                  if (matchedLine?.productId) {
                    const line = lineRows.find(
                      (row) =>
                        toProductId(row) === String(matchedLine.productId)
                    );
                    setCountsDraft((current) => {
                      const currentValue =
                        current?.[matchedLine.productId] ??
                        (line?.countedQuantity != null
                          ? String(line.countedQuantity)
                          : '');
                      const parsedValue = Number(currentValue);
                      const nextCount =
                        Number.isFinite(parsedValue) && parsedValue >= 0
                          ? parsedValue + 1
                          : 1;
                      return {
                        ...current,
                        [matchedLine.productId]: String(nextCount)
                      };
                    });
                    setScannerTallies((current) => ({
                      ...current,
                      [matchedLine.sku]:
                        Number(current?.[matchedLine.sku] || 0) + 1
                    }));
                    setScannerStatus(`Captured ${matchedLine.sku} (+1).`);
                  } else {
                    setScannerStatus(
                      `Scanned ${rawValue}, but no matching SKU in this stocktake session.`
                    );
                  }
                }
              }
            }
          } catch (scanError) {
            if (!isCancelled) {
              setScannerError(
                String(scanError?.message || 'Unable to detect barcode')
              );
            }
          }

          if (!isCancelled) {
            scannerFrameRef.current = window.requestAnimationFrame(() => {
              void scanFrame();
            });
          }
        };

        scannerFrameRef.current = window.requestAnimationFrame(() => {
          void scanFrame();
        });
      } catch (scannerStartError) {
        if (isCancelled) return;
        setScannerError(
          String(
            scannerStartError?.message || 'Unable to access camera for scanning'
          )
        );
      }
    };

    void startScanner();

    return () => {
      isCancelled = true;
      stopScanner();
    };
  }, [
    lineLookupByScanToken,
    lineRows,
    scannerOpen,
    stopScanner,
    supportsCameraScan
  ]);

  const stopVisionCamera = useCallback(() => {
    if (visionStreamRef.current) {
      for (const track of visionStreamRef.current.getTracks()) {
        track.stop();
      }
      visionStreamRef.current = null;
    }
    if (visionVideoRef.current) {
      visionVideoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => () => stopVisionCamera(), [stopVisionCamera]);

  const closeVisionModal = useCallback(() => {
    stopVisionCamera();
    setVisionModalOpen(false);
    setVisionStatus('');
  }, [stopVisionCamera]);

  const startVisionCamera = async () => {
    if (!supportsVisionCamera) {
      setVisionError('Camera capture is not supported in this browser.');
      return;
    }

    setVisionError('');
    setVisionStatus('Starting shelf camera...');
    try {
      stopVisionCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        },
        audio: false
      });
      visionStreamRef.current = stream;
      if (visionVideoRef.current) {
        visionVideoRef.current.srcObject = stream;
        await visionVideoRef.current.play();
      }
      setVisionStatus(
        'Camera ready. Capture a shelf frame, then run analysis.'
      );
    } catch (error) {
      setVisionError(
        String(error?.message || 'Unable to start shelf camera capture')
      );
      setVisionStatus('');
    }
  };

  const captureVisionFrame = () => {
    const video = visionVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setVisionError('Camera frame unavailable. Start camera before capture.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setVisionError('Unable to capture frame from camera.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setVisionImageDataUrl(dataUrl);
    setVisionStatus('Shelf frame captured. Run analysis to estimate counts.');
    setVisionError('');
  };

  const handleVisionFileSelected = (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '').trim();
      if (!result) {
        setVisionError('Selected file could not be read.');
        return;
      }
      setVisionImageDataUrl(result);
      setVisionStatus('Shelf image loaded. Run analysis to estimate counts.');
      setVisionError('');
    };
    reader.onerror = () => {
      setVisionError('Unable to read selected file.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

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

  const handleOpenScanner = () => {
    if (!lineRows.length) {
      setCountsNotice('No stocktake lines available to count.');
      return;
    }

    if (!canSubmitCounts) {
      setCountsNotice('Session must be OPEN or IN_REVIEW for camera counting.');
      return;
    }

    setCountsNotice('');
    setScannerError('');
    setScannerStatus('');
    setScannerTallies({});
    lastScanRef.current = { value: '', at: 0 };
    setScannerOpen(true);
  };

  const handleOpenVisionModal = () => {
    if (!selectedSessionId || !lineRows.length) {
      setCountsNotice('Select a stocktake session first.');
      return;
    }
    if (!canSubmitCounts) {
      setCountsNotice(
        'Session must be OPEN or IN_REVIEW before running shelf image scan.'
      );
      return;
    }
    setCountsNotice('');
    setVisionModalOpen(true);
    setVisionResult(null);
    setVisionImageDataUrl('');
    setVisionStatus('');
    setVisionError('');
  };

  const handleAnalyzeVisionImage = async () => {
    if (!visionImageDataUrl) {
      setVisionError(
        'Capture a camera frame or upload an image before running analysis.'
      );
      return;
    }

    setVisionError('');
    setVisionStatus('Running shelf image analysis...');
    await visionScanMutation.mutateAsync({
      imageDataUrl: visionImageDataUrl
    });
  };

  const handleApplyVisionCounts = () => {
    const detections = Array.isArray(visionResult?.eligibleCounts)
      ? visionResult.eligibleCounts
      : [];
    if (!detections.length) {
      setVisionError(
        'No policy-eligible detections to apply automatically. Enter those counts manually after review.'
      );
      return;
    }

    setCountsDraft((current) => {
      const next = { ...current };
      for (const row of detections) {
        const productId = String(row?.productId || '').trim();
        if (!productId) continue;
        const estimatedQuantity = Math.max(
          0,
          Number(row?.estimatedQuantity || 0)
        );
        next[productId] = String(Math.round(estimatedQuantity));
      }
      return next;
    });

    setCountsNotice(
      `Applied ${detections.length} policy-eligible vision estimates to the draft.`
    );
    setVisionStatus(
      `${detections.length} eligible estimate(s) applied. Review-required rows were left unchanged.`
    );
    setVisionError('');
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
                onClick={handleOpenScanner}
                disabled={
                  !canSubmitCounts ||
                  submitCountsMutation.isPending ||
                  !supportsCameraScan
                }
              >
                Camera quick count
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleOpenVisionModal}
                disabled={!canSubmitCounts || submitCountsMutation.isPending}
              >
                Shelf image count
              </button>
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
            {!supportsCameraScan ? (
              <p className="section-note">
                Camera scan is unavailable in this browser. Manual count entry
                remains available.
              </p>
            ) : null}
          </>
        )}
      </article>
      <Modal
        isOpen={scannerOpen}
        title="Stocktake camera quick count"
        onClose={closeScanner}
      >
        <div className="panel-head-row">
          <h3>Camera quick count</h3>
          <button type="button" className="btn-ghost" onClick={closeScanner}>
            Close
          </button>
        </div>
        <p className="event-sub">
          {scannerStatus || 'Align a SKU barcode/QR within the frame.'}
        </p>
        <video
          ref={scannerVideoRef}
          className="scanner-video"
          autoPlay
          muted
          playsInline
        />
        {scannerError ? <p className="form-error">{scannerError}</p> : null}
        {Object.keys(scannerTallies).length ? (
          <div className="table-wrap" style={{ marginTop: '0.65rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Scans</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(scannerTallies).map(([sku, count]) => (
                  <tr key={sku}>
                    <td>{sku}</td>
                    <td>{Number(count || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Modal>
      <Modal
        isOpen={visionModalOpen}
        title="Stocktake shelf image count"
        onClose={closeVisionModal}
      >
        <div className="panel-head-row">
          <h3>Shelf image count</h3>
          <button
            type="button"
            className="btn-ghost"
            onClick={closeVisionModal}
          >
            Close
          </button>
        </div>
        <p className="event-sub">
          Capture or upload a shelf image to estimate SKU counts, then apply to
          the draft.
        </p>
        <div className="action-row" style={{ marginBottom: '0.6rem' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={startVisionCamera}
            disabled={visionScanMutation.isPending || !supportsVisionCamera}
          >
            Start camera
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={captureVisionFrame}
            disabled={visionScanMutation.isPending}
          >
            Capture frame
          </button>
          <label className="btn-ghost" style={{ display: 'inline-flex' }}>
            Upload image
            <input
              type="file"
              accept="image/*"
              onChange={handleVisionFileSelected}
              style={{ display: 'none' }}
              disabled={visionScanMutation.isPending}
            />
          </label>
        </div>
        <video
          ref={visionVideoRef}
          className="scanner-video"
          autoPlay
          muted
          playsInline
        />
        {visionImageDataUrl ? (
          <>
            <p className="section-note" style={{ marginTop: '0.6rem' }}>
              Captured/selected image preview
            </p>
            <img
              src={visionImageDataUrl}
              alt="Stocktake shelf capture"
              className="scanner-video"
            />
          </>
        ) : null}
        <div className="action-row" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleAnalyzeVisionImage}
            disabled={visionScanMutation.isPending || !visionImageDataUrl}
          >
            {visionScanMutation.isPending ? 'Analyzing...' : 'Run analysis'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleApplyVisionCounts}
            disabled={
              visionScanMutation.isPending ||
              !Array.isArray(visionResult?.eligibleCounts) ||
              !visionResult.eligibleCounts.length
            }
          >
            Apply estimates
          </button>
        </div>
        {visionStatus ? <p className="section-note">{visionStatus}</p> : null}
        {visionError ? <p className="form-error">{visionError}</p> : null}
        {visionResult?.policy ? (
          <p className="section-note">
            Policy: min confidence{' '}
            {Number(visionResult.policy.minConfidenceToAutoApply || 0).toFixed(
              2
            )}
            , max variance ratio{' '}
            {Number(
              visionResult.policy.maxVarianceRatioToAutoApply || 0
            ).toFixed(2)}
            , max absolute variance{' '}
            {Number(visionResult.policy.maxAbsoluteVarianceToAutoApply || 0)}.
          </p>
        ) : null}
        {Array.isArray(visionResult?.warnings) &&
        visionResult.warnings.length ? (
          <div>
            {visionResult.warnings.map((warning, index) => (
              <p key={`${warning}-${index}`} className="section-note">
                {String(warning)}
              </p>
            ))}
          </div>
        ) : null}
        {Array.isArray(visionResult?.counts) && visionResult.counts.length ? (
          <div className="table-wrap" style={{ marginTop: '0.6rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Expected</th>
                  <th>Estimated</th>
                  <th>Confidence</th>
                  <th>Auto apply</th>
                  <th>Review reasons</th>
                </tr>
              </thead>
              <tbody>
                {visionResult.counts.map((row) => (
                  <tr
                    key={`${String(row.productId || '')}:${String(
                      row.sku || ''
                    )}`}
                  >
                    <td>{row.sku || '-'}</td>
                    <td>{Number(row.expectedQuantity || 0)}</td>
                    <td>{Number(row.estimatedQuantity || 0)}</td>
                    <td>{Number(row.confidence || 0).toFixed(2)}</td>
                    <td>{row.autoApplyEligible ? 'Yes' : 'No'}</td>
                    <td>
                      {Array.isArray(row.reviewReasons) &&
                      row.reviewReasons.length
                        ? row.reviewReasons.join(', ')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Modal>
    </section>
  );
};

export default StocktakesPage;
