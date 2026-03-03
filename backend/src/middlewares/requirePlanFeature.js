import { AppError } from '../errors/AppError.js';
import { isPlanFeatureEnabled } from '../services/subscription/subscriptionService.js';

const normalizeFeatureKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const requirePlanFeature = (featureKey) => async (req, res, next) => {
  try {
    const normalizedFeatureKey = normalizeFeatureKey(featureKey);
    if (!normalizedFeatureKey) {
      return next(new AppError('Plan feature key is required', 500));
    }

    const organizationId = req.organizationId || req.user?.organization;
    if (!organizationId) {
      return next(
        new AppError('Organization context is required for plan checks', 403)
      );
    }

    const enabled = await isPlanFeatureEnabled({
      organizationId,
      featureKey: normalizedFeatureKey
    });

    if (!enabled) {
      return next(
        new AppError(
          `Current subscription plan does not allow feature "${normalizedFeatureKey}"`,
          402
        )
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export default requirePlanFeature;
