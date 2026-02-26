const OFFLINE_QUEUE_KEY = 'ledgerly_offline_mutations_v1';
const OFFLINE_DEVICE_ID_KEY = 'ledgerly_offline_device_id_v1';

const sanitizeBaseUrl = (value) =>
  String(value || '')
    .trim()
    .replace(/\/+$/, '');

const getDefaultBaseUrl = () => {
  const envBase = sanitizeBaseUrl(process.env.REACT_APP_API_BASE_URL);
  if (envBase) return envBase;

  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  if (window.location.port === '3000') {
    return 'http://localhost:4000';
  }

  return sanitizeBaseUrl(window.location.origin);
};

const readQueue = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

const writeQueue = (items) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
};

const buildMutationId = () =>
  `mutation_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const getOfflineQueueSize = () => readQueue().length;

export const getOfflineDeviceId = () => {
  if (typeof window === 'undefined') return 'device_server';
  const existing = String(
    window.localStorage.getItem(OFFLINE_DEVICE_ID_KEY) || ''
  ).trim();
  if (existing) return existing;

  const generated = `device_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  window.localStorage.setItem(OFFLINE_DEVICE_ID_KEY, generated);
  return generated;
};

export const enqueueOfflineMutation = ({
  type,
  payload,
  mutationId = null
}) => {
  const queue = readQueue();
  const entry = {
    mutationId: String(mutationId || buildMutationId()),
    type: String(type || '').trim(),
    payload: payload || {},
    createdAt: new Date().toISOString()
  };

  if (!entry.type) {
    throw new Error('Offline mutation type is required');
  }

  queue.push(entry);
  writeQueue(queue);
  return {
    ...entry,
    queueSize: queue.length
  };
};

const removeMutationIds = (mutationIds = []) => {
  const removeSet = new Set(mutationIds.map((id) => String(id)));
  const next = readQueue().filter(
    (item) => !removeSet.has(String(item.mutationId || ''))
  );
  writeQueue(next);
  return next;
};

export const flushOfflineMutations = async ({
  accessToken,
  baseUrl = getDefaultBaseUrl()
}) => {
  const queue = readQueue();
  if (!queue.length) {
    return {
      attempted: 0,
      applied: 0,
      failed: 0,
      remaining: 0
    };
  }

  if (!accessToken) {
    return {
      attempted: 0,
      applied: 0,
      failed: queue.length,
      remaining: queue.length,
      reason: 'missing_access_token'
    };
  }

  let response;
  try {
    response = await fetch(
      `${sanitizeBaseUrl(baseUrl)}/api/mobile-sync/mutations`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          deviceId: getOfflineDeviceId(),
          mutations: queue.map((entry) => ({
            mutationId: entry.mutationId,
            type: entry.type,
            payload: entry.payload
          }))
        })
      }
    );
  } catch {
    return {
      attempted: queue.length,
      applied: 0,
      failed: queue.length,
      remaining: queue.length,
      reason: 'network_error'
    };
  }

  if (!response.ok) {
    return {
      attempted: queue.length,
      applied: 0,
      failed: queue.length,
      remaining: queue.length,
      reason: `http_${response.status}`
    };
  }

  const payload = await response.json();
  const resultRows = Array.isArray(payload?.data?.results)
    ? payload.data.results
    : [];
  const appliedMutationIds = resultRows
    .filter((row) => row.status === 'APPLIED')
    .map((row) => row.mutationId);

  const remaining = removeMutationIds(appliedMutationIds);

  return {
    attempted: queue.length,
    applied: appliedMutationIds.length,
    failed: resultRows.filter((row) => row.status === 'FAILED').length,
    remaining: remaining.length
  };
};

export default {
  getOfflineQueueSize,
  enqueueOfflineMutation,
  flushOfflineMutations,
  getOfflineDeviceId
};
