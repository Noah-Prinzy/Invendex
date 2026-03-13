const CACHE_NAMESPACE = 'invendex_offline_read_cache_v1';

const buildStorageKey = (key) =>
  `${CACHE_NAMESPACE}:${String(key || '')
    .trim()
    .toLowerCase()}`;

export const writeCachedData = (key, data) => {
  if (typeof window === 'undefined') return;
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return;

  try {
    window.localStorage.setItem(
      buildStorageKey(normalizedKey),
      JSON.stringify({
        storedAt: Date.now(),
        data
      })
    );
  } catch {
    // Ignore cache storage failures.
  }
};

export const readCachedData = (key, { maxAgeMs = 15 * 60 * 1000 } = {}) => {
  if (typeof window === 'undefined') return null;
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return null;

  try {
    const raw = window.localStorage.getItem(buildStorageKey(normalizedKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const storedAt = Number(parsed?.storedAt || 0);
    if (!Number.isFinite(storedAt) || storedAt <= 0) return null;

    if (Number.isFinite(Number(maxAgeMs)) && maxAgeMs > 0) {
      if (Date.now() - storedAt > Number(maxAgeMs)) {
        return null;
      }
    }

    return parsed?.data ?? null;
  } catch {
    return null;
  }
};

export default {
  writeCachedData,
  readCachedData
};
