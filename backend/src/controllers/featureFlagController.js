import { successResponse } from '../utils/response.js';
import {
  getFeatureFlagByKey,
  listOrganizationFeatureFlags,
  setOrganizationFeatureFlag
} from '../services/featureFlags/featureFlagService.js';

export const getOrganizationFeatureFlags = async (req, res, next) => {
  try {
    const flags = await listOrganizationFeatureFlags(req.organizationId);
    return successResponse(res, flags, 'Feature flags retrieved');
  } catch (error) {
    return next(error);
  }
};

export const patchOrganizationFeatureFlag = async (req, res, next) => {
  try {
    const updated = await setOrganizationFeatureFlag({
      organizationId: req.organizationId,
      flagKey: req.params.flagKey,
      enabled: req.body.enabled,
      rolloutPercentage: req.body.rolloutPercentage,
      description: req.body.description,
      updatedBy: req.user?._id || null
    });

    return successResponse(res, updated, 'Feature flag updated');
  } catch (error) {
    return next(error);
  }
};

export const getOrganizationFeatureFlagByKey = async (req, res, next) => {
  try {
    const flag = await getFeatureFlagByKey({
      organizationId: req.organizationId,
      flagKey: req.params.flagKey
    });
    return successResponse(
      res,
      flag,
      flag ? 'Feature flag retrieved' : 'Feature flag not configured'
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  getOrganizationFeatureFlagByKey,
  getOrganizationFeatureFlags,
  patchOrganizationFeatureFlag
};
