import { logAudit } from '../utils/auditLogger.js';

/**
 * 🧾 Audit Middleware (A25.2)
 * Logs authenticated actions automatically
 */
export const auditMiddleware = (actionOrConfig, options = {}) => {
  return async (req, res, next) => {
    const normalizedConfig =
      typeof actionOrConfig === 'object' && actionOrConfig !== null
        ? actionOrConfig
        : {
            action: actionOrConfig,
            ...options
          };

    const {
      action,
      resource = null,
      resourceIdFrom = null // e.g. 'params.id'
    } = normalizedConfig;

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
          organizationId: req.organizationId || req.user?.organization || null,
          success
        });
      } catch (err) {
        console.error('Audit middleware error:', err.message);
      }
    });

    next();
  };
};
