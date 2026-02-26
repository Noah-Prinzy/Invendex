import AuditLog from '../models/AuditLog.js';

/**
 * 🔐 Central audit logger (A25)
 */
export const logAudit = async ({
  req = null,
  action,
  entity,
  resource,
  entityId = null,
  resourceId = null,
  before = null,
  after = null,
  success = true,
  source = 'api',
  organizationId = null,
  meta = {},
  session = null,
  silent = true
}) => {
  try {
    const resolvedOrganizationId =
      organizationId || req?.organizationId || req?.user?.organization || null;
    const resolvedEntity = entity || resource || 'UNKNOWN';
    const resolvedEntityId = entityId || resourceId || null;

    const payload = {
      organization: resolvedOrganizationId,
      user: req?.user?._id || null,
      action,
      entity: resolvedEntity,
      entityId: resolvedEntityId,

      before,
      after,

      method: req?.method || null,
      path: req?.originalUrl || null,

      ip: req?.ip
        ? req.ip.includes('::ffff:')
          ? req.ip.replace('::ffff:', '')
          : req.ip
        : null,

      userAgent: req?.headers?.['user-agent'] || null,

      source,
      success,
      meta
    };

    if (session) {
      await AuditLog.create([payload], { session });
    } else {
      await AuditLog.create(payload);
    }
  } catch (err) {
    if (silent) {
      // Never crash app for best-effort audit logging by default.
      console.error('❌ Audit log failed:', err.message);
      return;
    }
    throw err;
  }
};
