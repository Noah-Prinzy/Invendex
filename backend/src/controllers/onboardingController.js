import { successResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';
import { seedOrganizationSampleData } from '../services/onboarding/onboardingService.js';

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
  seedSampleData
};
