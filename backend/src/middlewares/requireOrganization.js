import { AppError } from '../errors/AppError.js';
import Organization from '../models/Organization.js';

const isAuthBypassEnabledForTests = () =>
  process.env.NODE_ENV === 'test' &&
  String(process.env.AUTH_TEST_BYPASS || 'true')
    .toLowerCase()
    .trim() === 'true';

const requireOrganization = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization;

    if (!organizationId) {
      return next(new AppError('User is not assigned to an organization', 403));
    }

    req.organizationId = organizationId.toString();

    if (isAuthBypassEnabledForTests()) {
      return next();
    }

    const organization = await Organization.findOne({
      _id: organizationId,
      isActive: true
    })
      .select('_id')
      .lean();

    if (!organization) {
      return next(
        new AppError('Organization is inactive or no longer available', 403)
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export default requireOrganization;
