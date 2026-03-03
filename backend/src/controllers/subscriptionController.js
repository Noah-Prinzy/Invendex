import { successResponse } from '../utils/response.js';
import {
  getEffectiveSubscription,
  updateOrganizationSubscriptionPlan
} from '../services/subscription/subscriptionService.js';

export const getCurrentOrganizationSubscription = async (req, res, next) => {
  try {
    const payload = await getEffectiveSubscription(req.organizationId);
    return successResponse(
      res,
      {
        subscription: payload.subscription,
        plan: payload.plan,
        isActiveStatus: payload.isActiveStatus
      },
      'Subscription retrieved'
    );
  } catch (error) {
    return next(error);
  }
};

export const patchCurrentOrganizationSubscription = async (req, res, next) => {
  try {
    const payload = await updateOrganizationSubscriptionPlan({
      organizationId: req.organizationId,
      planCode: req.body.planCode,
      status: req.body.status,
      updatedBy: req.user?._id || null
    });

    return successResponse(res, payload, 'Organization subscription updated');
  } catch (error) {
    return next(error);
  }
};

export default {
  getCurrentOrganizationSubscription,
  patchCurrentOrganizationSubscription
};
