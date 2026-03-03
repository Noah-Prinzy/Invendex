const DEFAULT_TTL_MS = 60 * 1000;
const cacheStore = new Map();

const asString = (value) => String(value || '').trim();

const isCacheEnabled = () =>
  !['false', '0', 'off', 'no'].includes(
    asString(process.env.API_QUERY_CACHE_ENABLED || 'true').toLowerCase()
  );

const nowMs = () => Date.now();

const normalizePath = (value = '') => {
  const raw = asString(value).replace(/\\/g, '/');
  if (!raw) return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
};

const stableSerialize = (value) => {
  if (value == null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  const sortedEntries = Object.entries(value)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  return `{${sortedEntries
    .map(
      ([entryKey, entryValue]) => `"${entryKey}":${stableSerialize(entryValue)}`
    )
    .join(',')}}`;
};

export const buildQueryCacheKey = ({
  namespace = 'global',
  organizationId = 'global',
  path = '/',
  query = {},
  extra = {}
}) => {
  const normalizedNamespace = asString(namespace || 'global').toLowerCase();
  const normalizedOrgId = asString(organizationId || 'global').toLowerCase();
  const normalizedPath = normalizePath(path);
  const serializedQuery = stableSerialize(query || {});
  const serializedExtra = stableSerialize(extra || {});

  return `${normalizedNamespace}|org:${normalizedOrgId}|path:${normalizedPath}|query:${serializedQuery}|extra:${serializedExtra}`;
};

const isExpired = (entry) => !entry || entry.expiresAt <= nowMs();

export const getCachedQueryResponse = (cacheKey) => {
  if (!isCacheEnabled()) return null;
  const entry = cacheStore.get(cacheKey);
  if (!entry) return null;

  if (isExpired(entry)) {
    cacheStore.delete(cacheKey);
    return null;
  }

  return entry.payload;
};

export const setCachedQueryResponse = ({
  cacheKey,
  payload,
  ttlMs = DEFAULT_TTL_MS,
  tags = []
}) => {
  if (!isCacheEnabled()) return;
  const normalizedTtlMs = Number(ttlMs);
  const ttl =
    Number.isFinite(normalizedTtlMs) && normalizedTtlMs > 0
      ? normalizedTtlMs
      : DEFAULT_TTL_MS;

  cacheStore.set(cacheKey, {
    payload,
    tags: Array.isArray(tags)
      ? tags.map((tag) => asString(tag)).filter(Boolean)
      : [],
    createdAt: nowMs(),
    expiresAt: nowMs() + ttl
  });
};

const removeMatchingEntries = (predicate) => {
  let removedCount = 0;
  for (const [key, entry] of cacheStore.entries()) {
    if (isExpired(entry) || predicate(key, entry)) {
      cacheStore.delete(key);
      removedCount += 1;
    }
  }
  return removedCount;
};

export const invalidateQueryCacheByTag = (tag) => {
  const normalizedTag = asString(tag);
  if (!normalizedTag) return 0;
  return removeMatchingEntries(
    (_, entry) =>
      Array.isArray(entry.tags) && entry.tags.includes(normalizedTag)
  );
};

export const invalidateQueryCacheByOrganization = (organizationId) => {
  const normalizedOrgId = asString(organizationId).toLowerCase();
  if (!normalizedOrgId) return 0;
  const marker = `|org:${normalizedOrgId}|`;
  return removeMatchingEntries((key) => key.includes(marker));
};

export const invalidateAllQueryCache = () => {
  const count = cacheStore.size;
  cacheStore.clear();
  return count;
};

export const getQueryCacheStats = () => {
  const now = nowMs();
  let active = 0;
  let expired = 0;

  for (const entry of cacheStore.values()) {
    if (entry.expiresAt > now) {
      active += 1;
    } else {
      expired += 1;
    }
  }

  return {
    enabled: isCacheEnabled(),
    totalEntries: cacheStore.size,
    activeEntries: active,
    expiredEntries: expired
  };
};

export default {
  buildQueryCacheKey,
  getCachedQueryResponse,
  getQueryCacheStats,
  invalidateAllQueryCache,
  invalidateQueryCacheByOrganization,
  invalidateQueryCacheByTag,
  setCachedQueryResponse
};
