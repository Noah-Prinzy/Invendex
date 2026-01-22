import AuditLog from '../models/AuditLog.js';

/**
 * 🔐 Central audit logger (A25)
 */
export const logAudit = async ({
  req = null,
  action,
  entity,
  entityId = null,
  before = null,
  after = null,
  success = true,
  source = 'api',
  meta = {}
}) => {
  try {
    await AuditLog.create({
      user: req?.user?._id || null,
      action,
      entity,
      entityId,

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
    });
  } catch (err) {
    // ❗ Never crash the app because of audit logging
    console.error('❌ Audit log failed:', err.message);
  }
};