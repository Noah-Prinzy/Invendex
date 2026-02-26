import { successResponse } from '../utils/response.js';
import {
  applyOfflineMutations,
  getSyncBootstrap
} from '../services/mobile/mobileSyncService.js';

export const getMobileSyncBootstrap = async (req, res, next) => {
  try {
    const result = await getSyncBootstrap({
      organizationId: req.organizationId,
      since: req.query.since || null,
      limit: req.query.limit || 200,
      warehouseId: req.query.warehouseId || null
    });

    return successResponse(res, result, 'Mobile sync bootstrap retrieved');
  } catch (err) {
    next(err);
  }
};

export const applyMobileMutations = async (req, res, next) => {
  try {
    const result = await applyOfflineMutations({
      organizationId: req.organizationId,
      deviceId: req.body.deviceId,
      mutations: req.body.mutations || [],
      actorUserId: req.user?._id || null,
      actorRole: req.user?.role || null
    });

    return successResponse(res, result, 'Mobile mutations processed');
  } catch (err) {
    next(err);
  }
};

export default {
  getMobileSyncBootstrap,
  applyMobileMutations
};
