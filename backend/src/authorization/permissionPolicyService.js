import mongoose from 'mongoose';
import RolePermissionPolicy from '../models/RolePermissionPolicy.js';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from './permissions.js';

const DEFAULT_CACHE_TTL_MS = 60 * 1000;
const ALL_PERMISSIONS = Object.values(PERMISSIONS);
const MANAGED_ROLES = [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN];

const permissionCache = new Map();

const normalizeString = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const normalizePermission = (value) => normalizeString(value);

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(String(value));
};

const buildDefaultMatrix = () => {
  const matrix = {};
  for (const role of Object.values(ROLES)) {
    const rolePermissions = ROLE_PERMISSIONS[role] || new Set();
    matrix[role] = [...rolePermissions].sort();
  }
  return matrix;
};

const getCacheKey = (organizationId) => String(organizationId || '').trim();

const normalizePermissionList = (permissions = []) => {
  const normalized = new Set();
  const source = Array.isArray(permissions) ? permissions : [];
  for (const permission of source) {
    const normalizedPermission = normalizePermission(permission);
    if (ALL_PERMISSIONS.includes(normalizedPermission)) {
      normalized.add(normalizedPermission);
    }
  }
  return [...normalized];
};

const enforceHierarchy = (matrix) => {
  const staff = new Set(normalizePermissionList(matrix?.[ROLES.STAFF]));

  const manager = new Set([
    ...normalizePermissionList(matrix?.[ROLES.MANAGER]),
    ...staff
  ]);

  const admin = new Set([
    ...normalizePermissionList(matrix?.[ROLES.ADMIN]),
    ...manager
  ]);

  return {
    [ROLES.STAFF]: [...staff].sort(),
    [ROLES.MANAGER]: [...manager].sort(),
    [ROLES.ADMIN]: [...admin].sort(),
    [ROLES.OWNER]: [...ALL_PERMISSIONS].sort()
  };
};

const buildEffectiveMatrix = (policyDoc = null) => {
  const defaults = buildDefaultMatrix();
  if (!policyDoc?.matrix) {
    return defaults;
  }

  return enforceHierarchy({
    [ROLES.STAFF]:
      policyDoc?.matrix?.staff?.length > 0
        ? policyDoc.matrix.staff
        : defaults[ROLES.STAFF],
    [ROLES.MANAGER]:
      policyDoc?.matrix?.manager?.length > 0
        ? policyDoc.matrix.manager
        : defaults[ROLES.MANAGER],
    [ROLES.ADMIN]:
      policyDoc?.matrix?.admin?.length > 0
        ? policyDoc.matrix.admin
        : defaults[ROLES.ADMIN]
  });
};

const writeCache = (organizationId, matrix) => {
  const cacheKey = getCacheKey(organizationId);
  if (!cacheKey) return;
  permissionCache.set(cacheKey, {
    matrix,
    expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS
  });
};

export const clearPermissionPolicyCache = (organizationId = null) => {
  if (!organizationId) {
    permissionCache.clear();
    return;
  }

  permissionCache.delete(getCacheKey(organizationId));
};

export const getRolePermissionMatrixForOrganization = async (
  organizationId
) => {
  const cacheKey = getCacheKey(organizationId);
  if (cacheKey) {
    const cached = permissionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.matrix;
    }
  }

  const policyDoc = await RolePermissionPolicy.findOne({
    organization: organizationId
  })
    .select('matrix')
    .lean();

  const effectiveMatrix = buildEffectiveMatrix(policyDoc);
  writeCache(organizationId, effectiveMatrix);
  return effectiveMatrix;
};

export const getRolePermissionsForOrganization = async ({
  organizationId,
  role
}) => {
  const normalizedRole = normalizeString(role);
  const effectiveMatrix =
    await getRolePermissionMatrixForOrganization(organizationId);

  return Array.isArray(effectiveMatrix?.[normalizedRole])
    ? effectiveMatrix[normalizedRole]
    : [];
};

export const hasOrganizationPermission = async ({
  organizationId,
  role,
  permission
}) => {
  const normalizedPermission = normalizePermission(permission);
  if (!normalizedPermission) return false;

  const rolePermissions = await getRolePermissionsForOrganization({
    organizationId,
    role
  });
  return rolePermissions.includes(normalizedPermission);
};

export const updateRolePermissionsForOrganization = async ({
  organizationId,
  role,
  permissions,
  updatedBy = null
}) => {
  const normalizedRole = normalizeString(role);
  if (!MANAGED_ROLES.includes(normalizedRole)) {
    throw new Error('Only staff, manager, or admin permissions can be updated');
  }

  const normalizedPermissions = normalizePermissionList(permissions);

  const existingPolicy = await RolePermissionPolicy.findOne({
    organization: organizationId
  });
  const currentMatrix =
    await getRolePermissionMatrixForOrganization(organizationId);

  const basePolicy = existingPolicy || new RolePermissionPolicy();
  basePolicy.organization = toObjectId(organizationId);
  basePolicy.updatedBy = updatedBy ? toObjectId(updatedBy) : null;

  basePolicy.matrix = {
    staff: normalizePermissionList(currentMatrix?.staff || []),
    manager: normalizePermissionList(currentMatrix?.manager || []),
    admin: normalizePermissionList(currentMatrix?.admin || []),
    [normalizedRole]: normalizedPermissions
  };

  await basePolicy.save();
  clearPermissionPolicyCache(organizationId);

  return getRolePermissionMatrixForOrganization(organizationId);
};

export const getPermissionCatalog = () => [...ALL_PERMISSIONS].sort();

export default {
  getPermissionCatalog,
  clearPermissionPolicyCache,
  getRolePermissionMatrixForOrganization,
  getRolePermissionsForOrganization,
  hasOrganizationPermission,
  updateRolePermissionsForOrganization
};
