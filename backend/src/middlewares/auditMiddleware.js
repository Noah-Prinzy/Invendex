import { logAudit } from '../utils/auditLogger.js';

/**
 * 🧾 Audit Middleware (A25.2)
 * Logs authenticated actions automatically
 */
export const auditMiddleware = (action, options = {}) => {
  return async (req, res, next) => {
    const {
      resource = null,
      resourceIdFrom = null // e.g. 'params.id'
    } = options;

    // Capture response success/failure
    let success = true;

    res.on('finish', async () => {
      try {
        if (res.statusCode >= 400) {
          success = false;
        }

        // Resolve resourceId dynamically
        let resourceId = null;
        if (resourceIdFrom) {
          resourceId = resourceIdFrom
            .split('.')
            .reduce((obj, key) => obj?.[key], req);
        }

        await logAudit({
          req,
          action,
          resource,
          resourceId,
          success
        });
      } catch (err) {
        console.error('Audit middleware error:', err.message);
      }
    });

    next();
  };
};
