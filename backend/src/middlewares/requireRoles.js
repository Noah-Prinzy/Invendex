import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * 🛡️ Role-based Authorization Middleware
 */
const requireRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    // 🚫 Not authenticated
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    // 🚫 Insufficient role
    if (!allowedRoles.includes(req.user.role)) {
      // 🧾 Audit denied access
      await logAudit({
        req,
        action: 'ACCESS_DENIED',
        resource: req.baseUrl.replace('/', '').toUpperCase(),
        resourceId: req.params?.id || null,
        success: false,
        meta: {
          requiredRoles: allowedRoles,
          userRole: req.user.role
        }
      });

      return next(
        new AppError('Access denied: insufficient permissions', 403)
      );
    }

    next();
  };
};

export default requireRoles;
