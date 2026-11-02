import type { Model } from 'mongoose';
import type { IRolePermissionPolicy } from '../../persistence/schemas/role-permission-policy.schema';
import { PERMISSIONS, ROLES } from './permissions';
import { PermissionPolicyService } from './permission-policy.service';

const ORG = '665f0f0f0f0f0f0f0f0f0a01';

function makeService(doc: Partial<IRolePermissionPolicy> | null) {
  const findOne = jest.fn(() => ({ lean: jest.fn().mockResolvedValue(doc) }));
  const model = { findOne } as unknown as Model<IRolePermissionPolicy>;
  return { service: new PermissionPolicyService(model), findOne };
}

describe('PermissionPolicyService (org overrides + hierarchy, ported spec)', () => {
  it('falls back to the default matrix when no policy doc exists', async () => {
    const { service } = makeService(null);
    await expect(
      service.hasOrganizationPermission({
        organizationId: ORG,
        role: ROLES.STAFF,
        permission: PERMISSIONS.PRODUCTS_DELETE
      })
    ).resolves.toBe(false);
    await expect(
      service.hasOrganizationPermission({
        organizationId: ORG,
        role: ROLES.ADMIN,
        permission: PERMISSIONS.USERS_MANAGE
      })
    ).resolves.toBe(true);
  });

  it('owner always holds every permission', async () => {
    const { service } = makeService(null);
    await expect(
      service.hasOrganizationPermission({
        organizationId: ORG,
        role: ROLES.OWNER,
        permission: PERMISSIONS.FINANCE_MANAGE
      })
    ).resolves.toBe(true);
  });

  it('applies org overrides and enforces hierarchy (staff ⊆ manager ⊆ admin)', async () => {
    const { service } = makeService({
      matrix: {
        staff: [PERMISSIONS.DASHBOARD_VIEW],
        manager: [PERMISSIONS.REPORTS_VIEW],
        admin: [PERMISSIONS.FINANCE_MANAGE]
      }
    } as Partial<IRolePermissionPolicy>);

    // staff custom list replaces default staff list
    await expect(
      service.hasOrganizationPermission({
        organizationId: ORG,
        role: ROLES.STAFF,
        permission: PERMISSIONS.INVENTORY_VIEW
      })
    ).resolves.toBe(false);
    // hierarchy: manager inherits staff, admin inherits manager
    await expect(
      service.hasOrganizationPermission({
        organizationId: ORG,
        role: ROLES.MANAGER,
        permission: PERMISSIONS.DASHBOARD_VIEW
      })
    ).resolves.toBe(true);
    await expect(
      service.hasOrganizationPermission({
        organizationId: ORG,
        role: ROLES.ADMIN,
        permission: PERMISSIONS.REPORTS_VIEW
      })
    ).resolves.toBe(true);
    await expect(
      service.hasOrganizationPermission({
        organizationId: ORG,
        role: ROLES.ADMIN,
        permission: PERMISSIONS.FINANCE_MANAGE
      })
    ).resolves.toBe(true);
  });

  it('caches the matrix and invalidate() forces a reload', async () => {
    const { service, findOne } = makeService(null);
    await service.getEffectiveMatrix(ORG);
    await service.getEffectiveMatrix(ORG);
    expect(findOne).toHaveBeenCalledTimes(1);
    service.invalidate(ORG);
    await service.getEffectiveMatrix(ORG);
    expect(findOne).toHaveBeenCalledTimes(2);
  });
});
