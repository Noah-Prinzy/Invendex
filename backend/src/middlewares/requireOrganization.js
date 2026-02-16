import { AppError } from '../errors/AppError.js';

const requireOrganization = (req, res, next) => {
  const organizationId = req.user?.organization;

  if (!organizationId) {
    return next(
      new AppError('User is not assigned to an organization', 403)
    );
  }

  req.organizationId = organizationId.toString();
  return next();
};

export default requireOrganization;
