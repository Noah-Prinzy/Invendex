/**
 * Ported verbatim from legacy `backend/src/authorization/permissions.js` —
 * the legacy Jest suites treat this module as the executable spec.
 */

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff'
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  AUDIT_LOGS_VIEW: 'audit_logs:view',
  DASHBOARD_VIEW: 'dashboard:view',
  FINANCE_MANAGE: 'finance:manage',
  FINANCE_VIEW: 'finance:view',
  FORECAST_MANAGE: 'forecast:manage',
  FORECAST_VIEW: 'forecast:view',
  INVENTORY_ADJUST: 'inventory:adjust',
  INVENTORY_MANAGE: 'inventory:manage',
  INVENTORY_VIEW: 'inventory:view',
  OBSERVABILITY_VIEW: 'observability:view',
  PRODUCTS_DELETE: 'products:delete',
  PRODUCTS_EDIT: 'products:edit',
  PRODUCTS_MANAGE: 'products:manage',
  PRODUCTS_VIEW: 'products:view',
  PURCHASE_ORDERS_MANAGE: 'purchase_orders:manage',
  PURCHASE_ORDERS_VIEW: 'purchase_orders:view',
  REPORTS_VIEW: 'reports:view',
  REORDER_MANAGE: 'reorder:manage',
  SUPPLIER_PRODUCTS_MANAGE: 'supplier_products:manage',
  SUPPLIERS_MANAGE: 'suppliers:manage',
  USERS_MANAGE: 'users:manage',
  WMS_MANAGE: 'wms:manage',
  WMS_VIEW: 'wms:view'
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PRIORITY: Record<Role, number> = {
  [ROLES.STAFF]: 10,
  [ROLES.MANAGER]: 20,
  [ROLES.ADMIN]: 30,
  [ROLES.OWNER]: 40
};

const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

const STAFF_PERMISSIONS: Permission[] = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.INVENTORY_ADJUST,
  PERMISSIONS.OBSERVABILITY_VIEW,
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.PRODUCTS_EDIT,
  PERMISSIONS.WMS_VIEW
];

const MANAGER_ONLY_PERMISSIONS: Permission[] = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FORECAST_VIEW,
  PERMISSIONS.OBSERVABILITY_VIEW,
  PERMISSIONS.PURCHASE_ORDERS_VIEW,
  PERMISSIONS.REORDER_MANAGE,
  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.WMS_MANAGE
];

const ADMIN_ONLY_PERMISSIONS: Permission[] = [
  PERMISSIONS.AUDIT_LOGS_VIEW,
  PERMISSIONS.FINANCE_MANAGE,
  PERMISSIONS.FORECAST_MANAGE,
  PERMISSIONS.INVENTORY_MANAGE,
  PERMISSIONS.PRODUCTS_DELETE,
  PERMISSIONS.PRODUCTS_MANAGE,
  PERMISSIONS.PURCHASE_ORDERS_MANAGE,
  PERMISSIONS.SUPPLIER_PRODUCTS_MANAGE,
  PERMISSIONS.SUPPLIERS_MANAGE,
  PERMISSIONS.USERS_MANAGE
];

export const ROLE_PERMISSIONS: Readonly<Record<Role, ReadonlySet<Permission>>> =
  {
    [ROLES.STAFF]: new Set(STAFF_PERMISSIONS),
    [ROLES.MANAGER]: new Set([...STAFF_PERMISSIONS, ...MANAGER_ONLY_PERMISSIONS]),
    [ROLES.ADMIN]: new Set([
      ...STAFF_PERMISSIONS,
      ...MANAGER_ONLY_PERMISSIONS,
      ...ADMIN_ONLY_PERMISSIONS
    ]),
    [ROLES.OWNER]: new Set(ALL_PERMISSIONS)
  };

export const normalizeRole = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const normalizePermission = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase();

export const isRoleAllowed = (
  userRole: unknown,
  allowedRoles: unknown[] = []
): boolean => {
  const normalizedUserRole = normalizeRole(userRole);
  if (!normalizedUserRole) return false;

  const normalizedAllowed = (
    Array.isArray(allowedRoles) ? allowedRoles : []
  )
    .map(normalizeRole)
    .filter(Boolean);
  if (!normalizedAllowed.length) return false;

  if (normalizedAllowed.includes(normalizedUserRole)) {
    return true;
  }

  const userPriority = ROLE_PRIORITY[normalizedUserRole as Role];
  if (!userPriority) {
    return false;
  }

  return normalizedAllowed.some((allowedRole) => {
    const allowedPriority = ROLE_PRIORITY[allowedRole as Role];
    return Number.isFinite(allowedPriority) && userPriority > allowedPriority;
  });
};

export const hasPermission = (role: unknown, permission: unknown): boolean => {
  const normalizedRole = normalizeRole(role);
  const normalizedPermission = normalizePermission(permission);

  if (!normalizedRole || !normalizedPermission) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[normalizedRole as Role];
  if (!permissions) {
    return false;
  }

  return permissions.has(normalizedPermission as Permission);
};
