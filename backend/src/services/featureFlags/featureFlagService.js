import OrganizationFeatureFlag from '../../models/OrganizationFeatureFlag.js';

const FEATURE_FLAG_CACHE_TTL_MS = 60 * 1000;
const featureFlagCache = new Map();
let organizationFeatureFlagIndexReadyPromise = null;
const ORGANIZATION_FEATURE_FLAG_UNIQUE_INDEX =
  'organization_unique_feature_flags';
const LEGACY_ORGANIZATION_FEATURE_FLAG_INDEX = 'organization_1';

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const nowMs = () => Date.now();

const cloneEntry = (entry) => ({
  key: normalizeKey(entry?.key),
  enabled: Boolean(entry?.enabled),
  rolloutPercentage: Math.max(
    0,
    Math.min(100, Number(entry?.rolloutPercentage ?? 100))
  ),
  description: String(entry?.description || '').trim(),
  updatedBy: entry?.updatedBy || null,
  updatedAt: entry?.updatedAt ? new Date(entry.updatedAt) : new Date()
});

const DEFAULT_FEATURE_FLAGS = Object.freeze([
  {
    key: 'dashboard_intelligence',
    enabled: true,
    rolloutPercentage: 100,
    description: 'Enables advanced dashboard intelligence endpoints'
  },
  {
    key: 'forecasting_engine',
    enabled: true,
    rolloutPercentage: 100,
    description: 'Enables forecasting generation and forecast-backed workflows'
  },
  {
    key: 'finance_valuation',
    enabled: true,
    rolloutPercentage: 100,
    description: 'Enables valuation, COGS, and margin APIs'
  },
  {
    key: 'compliance_export',
    enabled: true,
    rolloutPercentage: 100,
    description: 'Enables compliance export endpoints'
  },
  {
    key: 'realtime_updates',
    enabled: true,
    rolloutPercentage: 100,
    description: 'Enables realtime inventory and purchase-order events'
  }
]);

const defaultFlagMap = new Map(
  DEFAULT_FEATURE_FLAGS.map((entry) => [
    normalizeKey(entry.key),
    cloneEntry(entry)
  ])
);

const cacheKeyForOrganization = (organizationId) =>
  String(organizationId || '').trim();

const readCache = (organizationId) => {
  const cacheKey = cacheKeyForOrganization(organizationId);
  if (!cacheKey) return null;

  const cached = featureFlagCache.get(cacheKey);
  if (!cached) return null;

  if (cached.expiresAt <= nowMs()) {
    featureFlagCache.delete(cacheKey);
    return null;
  }

  return cached.flags;
};

const writeCache = (organizationId, flags) => {
  const cacheKey = cacheKeyForOrganization(organizationId);
  if (!cacheKey) return;
  featureFlagCache.set(cacheKey, {
    flags,
    expiresAt: nowMs() + FEATURE_FLAG_CACHE_TTL_MS
  });
};

export const clearFeatureFlagCache = (organizationId = null) => {
  if (organizationId == null) {
    featureFlagCache.clear();
    return;
  }

  const cacheKey = cacheKeyForOrganization(organizationId);
  if (cacheKey) {
    featureFlagCache.delete(cacheKey);
  }
};

const toMapFromArray = (entries = []) => {
  const map = new Map();
  for (const entry of entries) {
    const cloned = cloneEntry(entry);
    if (!cloned.key) continue;
    map.set(cloned.key, cloned);
  }
  return map;
};

const mergeWithDefaults = (entries = []) => {
  const merged = new Map(defaultFlagMap);
  const customMap = toMapFromArray(entries);
  for (const [key, value] of customMap.entries()) {
    merged.set(key, value);
  }
  return merged;
};

const mapToSortedArray = (map) =>
  Array.from(map.values()).sort((a, b) =>
    String(a.key || '').localeCompare(String(b.key || ''))
  );

const ensureOrganizationFeatureFlagIndexes = async () => {
  if (!organizationFeatureFlagIndexReadyPromise) {
    organizationFeatureFlagIndexReadyPromise = (async () => {
      try {
        await OrganizationFeatureFlag.createCollection();
      } catch (error) {
        const codeName = String(error?.codeName || '').trim();
        if (codeName !== 'NamespaceExists') {
          throw error;
        }
      }

      const indexes = await OrganizationFeatureFlag.collection.indexes();
      const hasUniqueOrganizationIndex = indexes.some(
        (index) =>
          index?.key?.organization === 1 &&
          index?.unique === true &&
          String(index?.name || '').trim() ===
            ORGANIZATION_FEATURE_FLAG_UNIQUE_INDEX
      );

      if (!hasUniqueOrganizationIndex) {
        const legacyOrganizationIndex = indexes.find(
          (index) =>
            index?.key?.organization === 1 &&
            String(index?.name || '').trim() ===
              LEGACY_ORGANIZATION_FEATURE_FLAG_INDEX &&
            index?.unique !== true
        );

        if (legacyOrganizationIndex) {
          await OrganizationFeatureFlag.collection.dropIndex(
            LEGACY_ORGANIZATION_FEATURE_FLAG_INDEX
          );
        }

        const refreshedIndexes =
          await OrganizationFeatureFlag.collection.indexes();
        const hasAnyUniqueOrganizationIndex = refreshedIndexes.some(
          (index) => index?.key?.organization === 1 && index?.unique === true
        );

        if (!hasAnyUniqueOrganizationIndex) {
          await OrganizationFeatureFlag.collection.createIndex(
            { organization: 1 },
            {
              unique: true,
              background: true,
              name: ORGANIZATION_FEATURE_FLAG_UNIQUE_INDEX
            }
          );
        }
      }
    })().catch((error) => {
      organizationFeatureFlagIndexReadyPromise = null;
      throw error;
    });
  }

  return organizationFeatureFlagIndexReadyPromise;
};

const ensureDocument = async (organizationId) => {
  await ensureOrganizationFeatureFlagIndexes();
  const defaultEntries = DEFAULT_FEATURE_FLAGS.map((entry) =>
    cloneEntry(entry)
  );

  const doc = await OrganizationFeatureFlag.findOneAndUpdate(
    {
      organization: organizationId
    },
    {
      $setOnInsert: {
        organization: organizationId,
        flags: defaultEntries
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  const merged = mergeWithDefaults(doc.flags || []);
  const normalizedExisting = mapToSortedArray(toMapFromArray(doc.flags || []));
  const normalizedMerged = mapToSortedArray(merged);

  if (JSON.stringify(normalizedExisting) !== JSON.stringify(normalizedMerged)) {
    doc.flags = normalizedMerged;
    await doc.save();
  }

  return doc;
};

const fnv1aHash = (value) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash =
      (hash +
        (hash << 1) +
        (hash << 4) +
        (hash << 7) +
        (hash << 8) +
        (hash << 24)) >>>
      0;
  }
  return hash >>> 0;
};

const resolveRolloutGate = ({
  organizationId,
  userId,
  flagKey,
  percentage
}) => {
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;

  const seed = `${organizationId}:${String(userId || '')}:${flagKey}`;
  const bucket = fnv1aHash(seed) % 100;
  return bucket < percentage;
};

export const listOrganizationFeatureFlags = async (organizationId) => {
  const cached = readCache(organizationId);
  if (cached) {
    return mapToSortedArray(cached);
  }

  const doc = await ensureDocument(organizationId);
  const mergedMap = mergeWithDefaults(doc.flags || []);
  writeCache(organizationId, mergedMap);
  return mapToSortedArray(mergedMap);
};

export const setOrganizationFeatureFlag = async ({
  organizationId,
  flagKey,
  enabled,
  rolloutPercentage,
  description,
  updatedBy = null
}) => {
  const normalizedFlagKey = normalizeKey(flagKey);
  if (!normalizedFlagKey) {
    throw new Error('flagKey is required');
  }

  const doc = await ensureDocument(organizationId);
  const mergedMap = mergeWithDefaults(doc.flags || []);
  const current = mergedMap.get(normalizedFlagKey) || {
    key: normalizedFlagKey,
    enabled: false,
    rolloutPercentage: 100,
    description: ''
  };

  if (typeof enabled === 'boolean') {
    current.enabled = enabled;
  }
  if (rolloutPercentage != null) {
    const numericRollout = Number(rolloutPercentage);
    if (!Number.isFinite(numericRollout)) {
      throw new Error('rolloutPercentage must be a valid number');
    }
    current.rolloutPercentage = Math.max(0, Math.min(100, numericRollout));
  }
  if (description != null) {
    current.description = String(description || '').trim();
  }

  current.updatedBy = updatedBy || null;
  current.updatedAt = new Date();
  mergedMap.set(normalizedFlagKey, current);

  doc.flags = mapToSortedArray(mergedMap);
  await doc.save();

  clearFeatureFlagCache(organizationId);

  return cloneEntry(current);
};

export const isFeatureFlagEnabled = async ({
  organizationId,
  flagKey,
  userId = null,
  defaultValue = false
}) => {
  const normalizedFlagKey = normalizeKey(flagKey);
  if (!normalizedFlagKey || !organizationId) {
    return Boolean(defaultValue);
  }

  const flags = await listOrganizationFeatureFlags(organizationId);
  const matching = flags.find((entry) => entry.key === normalizedFlagKey);

  if (!matching) {
    return Boolean(defaultValue);
  }
  if (!matching.enabled) {
    return false;
  }

  return resolveRolloutGate({
    organizationId,
    userId,
    flagKey: normalizedFlagKey,
    percentage: Number(matching.rolloutPercentage || 0)
  });
};

export const getFeatureFlagByKey = async ({ organizationId, flagKey }) => {
  const normalizedFlagKey = normalizeKey(flagKey);
  const flags = await listOrganizationFeatureFlags(organizationId);
  return flags.find((entry) => entry.key === normalizedFlagKey) || null;
};

export const FEATURE_FLAGS = Object.freeze(
  DEFAULT_FEATURE_FLAGS.reduce((acc, entry) => {
    const key = normalizeKey(entry.key);
    acc[key.toUpperCase()] = key;
    return acc;
  }, {})
);

export default {
  FEATURE_FLAGS,
  clearFeatureFlagCache,
  getFeatureFlagByKey,
  isFeatureFlagEnabled,
  listOrganizationFeatureFlags,
  setOrganizationFeatureFlag
};
