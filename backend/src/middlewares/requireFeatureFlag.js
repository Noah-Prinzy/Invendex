import { AppError } from '../errors/AppError.js';
import { isFeatureFlagEnabled } from '../services/featureFlags/featureFlagService.js';

const normalizeFeatureKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const requireFeatureFlag =
  (featureKey, { allowOwnerBypass = false } = {}) =>
  async (req, res, next) => {
    try {
      const normalizedKey = normalizeFeatureKey(featureKey);
      if (!normalizedKey) {
        return next(new AppError('Feature flag key is required', 500));
      }

      if (allowOwnerBypass && String(req.user?.role || '') === 'owner') {
        return next();
      }

      const organizationId = req.organizationId || req.user?.organization;
      if (!organizationId) {
        return next(
          new AppError(
            'Organization context is required for feature checks',
            403
          )
        );
      }

      const enabled = await isFeatureFlagEnabled({
        organizationId,
        flagKey: normalizedKey,
        userId: req.user?._id || null
      });

      if (!enabled) {
        return next(
          new AppError(
            `Feature "${normalizedKey}" is not enabled for this organization`,
            403
          )
        );
      }

      req.featureFlags = {
        ...(req.featureFlags || {}),
        [normalizedKey]: true
      };

      return next();
    } catch (error) {
      return next(error);
    }
  };

export default requireFeatureFlag;
