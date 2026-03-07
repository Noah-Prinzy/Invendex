import AuditLog from '../models/AuditLog.js';

const toObjectIdOrNull = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  try {
    return normalized.match(/^[a-fA-F0-9]{24}$/) ? normalized : null;
  } catch {
    return null;
  }
};

const resolveWarehouseId = ({
  req = null,
  warehouseId = null,
  meta = {},
  before = null,
  after = null
}) => {
  const candidates = [
    warehouseId,
    req?.body?.warehouseId,
    req?.body?.warehouse,
    req?.query?.warehouseId,
    req?.params?.warehouseId,
    meta?.warehouseId,
    meta?.warehouse,
    meta?.warehouse?._id,
    meta?.warehouse?.id,
    after?.warehouseId,
    after?.warehouse,
    before?.warehouseId,
    before?.warehouse
  ];

  for (const candidate of candidates) {
    const normalized = toObjectIdOrNull(candidate);
    if (normalized) return normalized;
  }

  return null;
};

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
  warehouseId = null,
  meta = {},
  session = null,
  silent = true
}) => {
  try {
    const resolvedOrganizationId =
      organizationId || req?.organizationId || req?.user?.organization || null;
    const resolvedEntity = entity || resource || 'UNKNOWN';
    const resolvedEntityId = entityId || resourceId || null;
    const resolvedWarehouseId = resolveWarehouseId({
      req,
      warehouseId,
      meta,
      before,
      after
    });

    const payload = {
      organization: resolvedOrganizationId,
      user: req?.user?._id || null,
      action,
      entity: resolvedEntity,
      entityId: resolvedEntityId,
      warehouse: resolvedWarehouseId,

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
