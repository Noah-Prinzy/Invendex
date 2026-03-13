const TRACE_STORAGE_KEY = 'invendex_client_trace_id';

const sanitize = (value) => String(value || '').trim();

const randomSegment = () => Math.random().toString(36).slice(2, 10);

const generateId = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${randomSegment()}-${randomSegment()}`;
};

let inMemoryClientTraceId = '';

export const getClientTraceId = () => {
  if (inMemoryClientTraceId) return inMemoryClientTraceId;

  if (typeof window === 'undefined') {
    inMemoryClientTraceId = generateId();
    return inMemoryClientTraceId;
  }

  try {
    const stored = sanitize(window.sessionStorage?.getItem(TRACE_STORAGE_KEY));
    if (stored) {
      inMemoryClientTraceId = stored;
      return inMemoryClientTraceId;
    }

    inMemoryClientTraceId = generateId();
    window.sessionStorage?.setItem(TRACE_STORAGE_KEY, inMemoryClientTraceId);
    return inMemoryClientTraceId;
  } catch {
    inMemoryClientTraceId = generateId();
    return inMemoryClientTraceId;
  }
};

export const createRequestTrace = ({ method = 'GET', path = '' } = {}) => ({
  requestId: generateId(),
  clientTraceId: getClientTraceId(),
  method: String(method || 'GET').toUpperCase(),
  path: String(path || '')
});

export default {
  getClientTraceId,
  createRequestTrace
};
