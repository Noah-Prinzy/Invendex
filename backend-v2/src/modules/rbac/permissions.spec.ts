import {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  isRoleAllowed
} from './permissions';

describe('rbac permissions (ported from legacy permissions.js)', () => {
  it('staff cannot delete products but can view inventory', () => {
    expect(hasPermission(ROLES.STAFF, PERMISSIONS.PRODUCTS_DELETE)).toBe(false);
    expect(hasPermission(ROLES.STAFF, PERMISSIONS.INVENTORY_VIEW)).toBe(true);
    expect(hasPermission(ROLES.STAFF, PERMISSIONS.INVENTORY_ADJUST)).toBe(true);
  });

  it('manager sees finance but cannot manage it', () => {
    expect(hasPermission(ROLES.MANAGER, PERMISSIONS.FINANCE_VIEW)).toBe(true);
    expect(hasPermission(ROLES.MANAGER, PERMISSIONS.FINANCE_MANAGE)).toBe(
      false
    );
    expect(hasPermission(ROLES.MANAGER, PERMISSIONS.PURCHASE_ORDERS_VIEW)).toBe(
      true
    );
    expect(
      hasPermission(ROLES.MANAGER, PERMISSIONS.PURCHASE_ORDERS_MANAGE)
    ).toBe(false);
  });

  it('admin manages but staff perms remain; owner has everything', () => {
    expect(hasPermission(ROLES.ADMIN, PERMISSIONS.USERS_MANAGE)).toBe(true);
    expect(hasPermission(ROLES.ADMIN, PERMISSIONS.PRODUCTS_DELETE)).toBe(true);
    expect(hasPermission(ROLES.ADMIN, PERMISSIONS.INVENTORY_VIEW)).toBe(true);
    for (const permission of Object.values(PERMISSIONS)) {
      expect(hasPermission(ROLES.OWNER, permission)).toBe(true);
    }
  });

  it('enforces role hierarchy containment', () => {
    for (const permission of ROLE_PERMISSIONS[ROLES.STAFF]) {
      expect(ROLE_PERMISSIONS[ROLES.MANAGER].has(permission)).toBe(true);
      expect(ROLE_PERMISSIONS[ROLES.ADMIN].has(permission)).toBe(true);
    }
    for (const permission of ROLE_PERMISSIONS[ROLES.MANAGER]) {
      expect(ROLE_PERMISSIONS[ROLES.ADMIN].has(permission)).toBe(true);
    }
  });

  it('isRoleAllowed honors priority (admin > staff, owner > admin)', () => {
    expect(isRoleAllowed('admin', ['staff'])).toBe(true);
    expect(isRoleAllowed('owner', ['admin'])).toBe(true);
    expect(isRoleAllowed('staff', ['admin'])).toBe(false);
    expect(isRoleAllowed('manager', ['staff', 'manager'])).toBe(true);
    expect(isRoleAllowed('unknown-role', ['admin'])).toBe(false);
    expect(isRoleAllowed('admin', [])).toBe(false);
    expect(isRoleAllowed('', ['admin'])).toBe(false);
  });

  it('normalizes casing/whitespace and rejects empty values', () => {
    expect(hasPermission(' ADMIN ', ' users:MANAGE ')).toBe(true);
    expect(hasPermission(null, 'users:manage')).toBe(false);
    expect(hasPermission('admin', '')).toBe(false);
    expect(hasPermission('admin', 'not-a-permission')).toBe(false);
  });
});
