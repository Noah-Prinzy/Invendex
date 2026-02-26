export const ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff'
});

export const PERMISSIONS = Object.freeze({
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
});

const ROLE_PRIORITY = Object.freeze({
  [ROLES.STAFF]: 10,
  [ROLES.MANAGER]: 20,
  [ROLES.ADMIN]: 30,
  [ROLES.OWNER]: 40
});

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const STAFF_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.INVENTORY_ADJUST,
  PERMISSIONS.OBSERVABILITY_VIEW,
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.PRODUCTS_EDIT,
  PERMISSIONS.WMS_VIEW
];

const MANAGER_ONLY_PERMISSIONS = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FORECAST_VIEW,
  PERMISSIONS.OBSERVABILITY_VIEW,
  PERMISSIONS.PURCHASE_ORDERS_VIEW,
  PERMISSIONS.REORDER_MANAGE,
  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.WMS_MANAGE
];

const ADMIN_ONLY_PERMISSIONS = [
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

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.STAFF]: new Set(STAFF_PERMISSIONS),
  [ROLES.MANAGER]: new Set([...STAFF_PERMISSIONS, ...MANAGER_ONLY_PERMISSIONS]),
  [ROLES.ADMIN]: new Set([
    ...STAFF_PERMISSIONS,
    ...MANAGER_ONLY_PERMISSIONS,
    ...ADMIN_ONLY_PERMISSIONS
  ]),
  [ROLES.OWNER]: new Set(ALL_PERMISSIONS)
});

export const normalizeRole = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const normalizePermission = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

export const isRoleAllowed = (userRole, allowedRoles = []) => {
  const normalizedUserRole = normalizeRole(userRole);
  if (!normalizedUserRole) return false;

  const normalizedAllowed = Array.isArray(allowedRoles)
    ? allowedRoles.map(normalizeRole).filter(Boolean)
    : [];
  if (!normalizedAllowed.length) return false;

  if (normalizedAllowed.includes(normalizedUserRole)) {
    return true;
  }

  const userPriority = ROLE_PRIORITY[normalizedUserRole];
  if (!userPriority) {
    return false;
  }

  return normalizedAllowed.some((allowedRole) => {
    const allowedPriority = ROLE_PRIORITY[allowedRole];
    return Number.isFinite(allowedPriority) && userPriority > allowedPriority;
  });
};

export const hasPermission = (role, permission) => {
  const normalizedRole = normalizeRole(role);
  const normalizedPermission = normalizePermission(permission);

  if (!normalizedRole || !normalizedPermission) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[normalizedRole];
  if (!permissions) {
    return false;
  }

  return permissions.has(normalizedPermission);
};
