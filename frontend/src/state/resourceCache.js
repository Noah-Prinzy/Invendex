const GLOBAL_CACHE = new Map();

const normalizeKey = key => String(key || '').trim();
const isTestEnv = () => process.env.NODE_ENV === 'test';

export const getCachedResource = (key, maxAgeMs = 0) => {
  if (isTestEnv()) return null;

  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return null;

  const entry = GLOBAL_CACHE.get(normalizedKey);
  if (!entry) return null;

  const age = Date.now() - Number(entry.updatedAt || 0);
  if (maxAgeMs > 0 && age > maxAgeMs) {
    return null;
  }

  return entry.value;
};

export const setCachedResource = (key, value) => {
  if (isTestEnv()) return;

  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return;

  GLOBAL_CACHE.set(normalizedKey, {
    value,
    updatedAt: Date.now()
  });
};

export const removeCachedResource = key => {
  if (isTestEnv()) return;

  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return;
  GLOBAL_CACHE.delete(normalizedKey);
};

export const clearResourceCache = () => {
  if (isTestEnv()) return;
  GLOBAL_CACHE.clear();
};

export default {
  getCachedResource,
  setCachedResource,
  removeCachedResource,
  clearResourceCache
};
