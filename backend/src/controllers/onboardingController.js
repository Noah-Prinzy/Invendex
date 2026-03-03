import { successResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';
import {
  createOrganizationOnboardingWarehouse,
  getOrganizationOnboardingStatus,
  seedOrganizationSampleData
} from '../services/onboarding/onboardingService.js';

export const getOnboardingStatus = async (req, res, next) => {
  try {
    const data = await getOrganizationOnboardingStatus({
      organizationId: req.organizationId
    });

    return successResponse(res, data, 'Onboarding status fetched');
  } catch (error) {
    next(error);
  }
};

export const createOnboardingWarehouse = async (req, res, next) => {
  try {
    const warehouse = await createOrganizationOnboardingWarehouse({
      organizationId: req.organizationId,
      name: req.body?.name,
      code: req.body?.code || '',
      region: req.body?.region || '',
      address: req.body?.address || null,
      managerUserId: req.body?.managerUserId || null
    });

    await logAudit({
      req,
      action: 'CREATE_ONBOARDING_WAREHOUSE',
      resource: 'WAREHOUSE',
      resourceId: warehouse._id,
      organizationId: req.organizationId,
      meta: {
        name: warehouse.name,
        code: warehouse.code
      }
    });

    return successResponse(
      res,
      {
        _id: warehouse._id,
        name: warehouse.name,
        code: warehouse.code,
        region: warehouse.region || null,
        address: warehouse.address || null
      },
      'Onboarding warehouse created',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const seedSampleData = async (req, res, next) => {
  try {
    const force =
      String(req.body?.force || '')
        .trim()
        .toLowerCase() === 'true' || req.body?.force === true;

    const result = await seedOrganizationSampleData({
      organizationId: req.organizationId,
      force
    });

    await logAudit({
      req,
      action: 'SEED_ORGANIZATION_SAMPLE_DATA',
      resource: 'ONBOARDING',
      resourceId: req.organizationId,
      organizationId: req.organizationId,
      meta: {
        force,
        skipped: result.skipped,
        summary: result.summary || null
      }
    });

    return successResponse(
      res,
      result,
      result.skipped ? 'Sample data already seeded' : 'Sample data seeded',
      result.skipped ? 200 : 201
    );
  } catch (error) {
    next(error);
  }
};

export default {
  getOnboardingStatus,
  createOnboardingWarehouse,
  seedSampleData
};
