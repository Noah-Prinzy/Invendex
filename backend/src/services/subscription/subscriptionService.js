import OrganizationSubscription from '../../models/OrganizationSubscription.js';
import SubscriptionPlan from '../../models/SubscriptionPlan.js';

export const DEFAULT_PLAN_CODE = 'FREE';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['TRIALING', 'ACTIVE']);
const SUBSCRIPTION_CACHE_TTL_MS = 60 * 1000;
let organizationSubscriptionIndexReadyPromise = null;
const ORGANIZATION_SUBSCRIPTION_UNIQUE_INDEX =
  'organization_unique_subscription';
const LEGACY_ORGANIZATION_SUBSCRIPTION_INDEX = 'organization_1';

const normalizePlanCode = (value) =>
  String(value || DEFAULT_PLAN_CODE)
    .trim()
    .toUpperCase();

const nowMs = () => Date.now();

const effectiveSubscriptionCache = new Map();

const ensureOrganizationSubscriptionIndexes = async () => {
  if (!organizationSubscriptionIndexReadyPromise) {
    organizationSubscriptionIndexReadyPromise = (async () => {
      try {
        await OrganizationSubscription.createCollection();
      } catch (error) {
        const codeName = String(error?.codeName || '').trim();
        if (codeName !== 'NamespaceExists') {
          throw error;
        }
      }

      const indexes = await OrganizationSubscription.collection.indexes();
      const hasUniqueOrganizationIndex = indexes.some(
        (index) =>
          index?.key?.organization === 1 &&
          index?.unique === true &&
          String(index?.name || '').trim() ===
            ORGANIZATION_SUBSCRIPTION_UNIQUE_INDEX
      );

      if (!hasUniqueOrganizationIndex) {
        const legacyOrganizationIndex = indexes.find(
          (index) =>
            index?.key?.organization === 1 &&
            String(index?.name || '').trim() ===
              LEGACY_ORGANIZATION_SUBSCRIPTION_INDEX &&
            index?.unique !== true
        );

        if (legacyOrganizationIndex) {
          await OrganizationSubscription.collection.dropIndex(
            LEGACY_ORGANIZATION_SUBSCRIPTION_INDEX
          );
        }

        const refreshedIndexes =
          await OrganizationSubscription.collection.indexes();
        const hasAnyUniqueOrganizationIndex = refreshedIndexes.some(
          (index) => index?.key?.organization === 1 && index?.unique === true
        );

        if (!hasAnyUniqueOrganizationIndex) {
          await OrganizationSubscription.collection.createIndex(
            { organization: 1 },
            {
              unique: true,
              background: true,
              name: ORGANIZATION_SUBSCRIPTION_UNIQUE_INDEX
            }
          );
        }
      }
    })().catch((error) => {
      organizationSubscriptionIndexReadyPromise = null;
      throw error;
    });
  }

  return organizationSubscriptionIndexReadyPromise;
};

export const DEFAULT_PLAN_CATALOG = Object.freeze([
  {
    code: 'FREE',
    name: 'Free',
    description: 'Starter plan for small teams',
    monthlyPrice: 0,
    limits: {
      apiRequestsPer15Min: 300,
      maxUsers: 5,
      maxWarehouses: 1
    },
    features: [
      'dashboard_intelligence',
      'forecasting_engine',
      'finance_valuation',
      'compliance_export',
      'realtime_updates'
    ]
  },
  {
    code: 'PRO',
    name: 'Pro',
    description: 'Growth plan for scaling operations',
    monthlyPrice: 49,
    limits: {
      apiRequestsPer15Min: 1000,
      maxUsers: 25,
      maxWarehouses: 10
    },
    features: [
      'dashboard_intelligence',
      'forecasting_engine',
      'finance_valuation',
      'compliance_export',
      'realtime_updates'
    ]
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Enterprise-scale plan with high limits',
    monthlyPrice: 299,
    limits: {
      apiRequestsPer15Min: 5000,
      maxUsers: 500,
      maxWarehouses: 500
    },
    features: [
      'dashboard_intelligence',
      'forecasting_engine',
      'finance_valuation',
      'compliance_export',
      'realtime_updates'
    ]
  }
]);

const cacheKeyForOrganization = (organizationId) =>
  String(organizationId || '').trim();

const readEffectiveCache = (organizationId) => {
  const cacheKey = cacheKeyForOrganization(organizationId);
  if (!cacheKey) return null;
  const cached = effectiveSubscriptionCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= nowMs()) {
    effectiveSubscriptionCache.delete(cacheKey);
    return null;
  }
  return cached.value;
};

const writeEffectiveCache = (organizationId, value) => {
  const cacheKey = cacheKeyForOrganization(organizationId);
  if (!cacheKey) return;
  effectiveSubscriptionCache.set(cacheKey, {
    value,
    expiresAt: nowMs() + SUBSCRIPTION_CACHE_TTL_MS
  });
};

export const clearSubscriptionCache = (organizationId = null) => {
  if (organizationId == null) {
    effectiveSubscriptionCache.clear();
    return;
  }
  const cacheKey = cacheKeyForOrganization(organizationId);
  if (cacheKey) {
    effectiveSubscriptionCache.delete(cacheKey);
  }
};

export const ensureDefaultPlanCatalog = async () => {
  const operations = DEFAULT_PLAN_CATALOG.map((plan) => ({
    updateOne: {
      filter: { code: plan.code },
      update: {
        $set: {
          name: plan.name,
          description: plan.description,
          monthlyPrice: plan.monthlyPrice,
          limits: plan.limits,
          features: plan.features.map((feature) =>
            String(feature || '')
              .trim()
              .toLowerCase()
          ),
          isActive: true
        }
      },
      upsert: true
    }
  }));

  if (operations.length) {
    await SubscriptionPlan.bulkWrite(operations, { ordered: false });
  }
};

export const getPlanByCode = async (planCode) => {
  await ensureDefaultPlanCatalog();

  const normalizedPlanCode = normalizePlanCode(planCode);
  const plan = await SubscriptionPlan.findOne({
    code: normalizedPlanCode,
    isActive: true
  });

  if (plan) return plan;

  return SubscriptionPlan.findOne({
    code: DEFAULT_PLAN_CODE,
    isActive: true
  });
};

export const getOrCreateOrganizationSubscription = async (organizationId) => {
  await ensureOrganizationSubscriptionIndexes();
  const now = new Date();
  return OrganizationSubscription.findOneAndUpdate(
    {
      organization: organizationId
    },
    {
      $setOnInsert: {
        organization: organizationId,
        planCode: DEFAULT_PLAN_CODE,
        status: 'ACTIVE',
        currentPeriodStart: now
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
};

export const getEffectiveSubscription = async (organizationId) => {
  const cached = readEffectiveCache(organizationId);
  if (cached) {
    return cached;
  }

  const subscription =
    await getOrCreateOrganizationSubscription(organizationId);
  const plan = await getPlanByCode(subscription?.planCode || DEFAULT_PLAN_CODE);

  const safePlan = plan || (await getPlanByCode(DEFAULT_PLAN_CODE));

  const payload = {
    subscription,
    plan: safePlan,
    isActiveStatus: ACTIVE_SUBSCRIPTION_STATUSES.has(
      String(subscription?.status || '').toUpperCase()
    )
  };

  writeEffectiveCache(organizationId, payload);
  return payload;
};

export const updateOrganizationSubscriptionPlan = async ({
  organizationId,
  planCode,
  status = null,
  updatedBy = null
}) => {
  const normalizedPlanCode = normalizePlanCode(planCode);
  const plan = await getPlanByCode(normalizedPlanCode);
  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  const subscription =
    await getOrCreateOrganizationSubscription(organizationId);
  subscription.planCode = plan.code;
  if (status) {
    subscription.status = String(status).trim().toUpperCase();
  }
  subscription.updatedBy = updatedBy || null;
  await subscription.save();

  clearSubscriptionCache(organizationId);

  const effective = await getEffectiveSubscription(organizationId);
  return {
    subscription: effective.subscription,
    plan: effective.plan
  };
};

export const isPlanFeatureEnabled = async ({ organizationId, featureKey }) => {
  const normalizedFeatureKey = String(featureKey || '')
    .trim()
    .toLowerCase();
  if (!normalizedFeatureKey) return false;

  const { plan, isActiveStatus } =
    await getEffectiveSubscription(organizationId);
  if (!isActiveStatus) return false;

  const features = Array.isArray(plan?.features) ? plan.features : [];
  return features.includes(normalizedFeatureKey);
};

export const getApiRateLimitForOrganization = async ({
  organizationId,
  fallbackLimit = 300
}) => {
  const { plan, isActiveStatus } =
    await getEffectiveSubscription(organizationId);
  if (!isActiveStatus) {
    return Math.max(10, Math.floor(fallbackLimit / 2));
  }

  const rawLimit = Number(plan?.limits?.apiRequestsPer15Min);
  if (!Number.isFinite(rawLimit) || rawLimit < 10) {
    return fallbackLimit;
  }
  return Math.floor(rawLimit);
};

export default {
  DEFAULT_PLAN_CATALOG,
  DEFAULT_PLAN_CODE,
  clearSubscriptionCache,
  ensureDefaultPlanCatalog,
  getApiRateLimitForOrganization,
  getEffectiveSubscription,
  getOrCreateOrganizationSubscription,
  getPlanByCode,
  isPlanFeatureEnabled,
  updateOrganizationSubscriptionPlan
};
