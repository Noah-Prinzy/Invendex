import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { IRolePermissionPolicy } from '../../persistence/schemas/role-permission-policy.schema';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  normalizeRole
} from './permissions';

const DEFAULT_CACHE_TTL_MS = 60 * 1000;
const ALL_PERMISSIONS = Object.values(PERMISSIONS);

type PermissionMatrix = Record<string, string[]>;

const normalizePermissionList = (permissions: unknown): string[] => {
  const source = Array.isArray(permissions) ? permissions : [];
  const normalized = new Set<string>();
  for (const permission of source) {
    const value = String(permission ?? '')
      .trim()
      .toLowerCase();
    if ((ALL_PERMISSIONS as string[]).includes(value)) {
      normalized.add(value);
    }
  }
  return [...normalized];
};

/**
 * Organization-level RBAC policy overrides on top of the default role matrix,
 * ported from legacy `permissionPolicyService.js`. Hierarchy is enforced:
 * manager ⊇ staff, admin ⊇ manager, owner = all permissions.
 */
@Injectable()
export class PermissionPolicyService {
  private readonly cache = new Map<
    string,
    { matrix: PermissionMatrix; expiresAt: number }
  >();

  constructor(
    @InjectModel('RolePermissionPolicy')
    private readonly policyModel: Model<IRolePermissionPolicy>
  ) {}

  private buildDefaultMatrix(): PermissionMatrix {
    const matrix: PermissionMatrix = {};
    for (const role of Object.values(ROLES)) {
      matrix[role] = [...(ROLE_PERMISSIONS[role] ?? new Set<string>())].sort();
    }
    return matrix;
  }

  private enforceHierarchy(matrix: Partial<PermissionMatrix>): PermissionMatrix {
    const staff = new Set(normalizePermissionList(matrix[ROLES.STAFF]));
    const manager = new Set([
      ...normalizePermissionList(matrix[ROLES.MANAGER]),
      ...staff
    ]);
    const admin = new Set([
      ...normalizePermissionList(matrix[ROLES.ADMIN]),
      ...manager
    ]);
    return {
      [ROLES.STAFF]: [...staff].sort(),
      [ROLES.MANAGER]: [...manager].sort(),
      [ROLES.ADMIN]: [...admin].sort(),
      [ROLES.OWNER]: [...ALL_PERMISSIONS].sort()
    };
  }

  private buildEffectiveMatrix(
    policyDoc: {
      matrix?: {
        staff?: string[];
        manager?: string[];
        admin?: string[];
      };
    } | null
  ): PermissionMatrix {
    const defaults = this.buildDefaultMatrix();
    const custom = policyDoc?.matrix;
    if (!custom) return defaults;
    return this.enforceHierarchy({
      [ROLES.STAFF]: custom.staff?.length ? custom.staff : defaults[ROLES.STAFF],
      [ROLES.MANAGER]: custom.manager?.length
        ? custom.manager
        : defaults[ROLES.MANAGER],
      [ROLES.ADMIN]: custom.admin?.length ? custom.admin : defaults[ROLES.ADMIN]
    });
  }

  async getEffectiveMatrix(organizationId: string): Promise<PermissionMatrix> {
    const key = String(organizationId ?? '').trim();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.matrix;
    }
    const doc = await this.policyModel
      .findOne({ organization: organizationId })
      .lean();
    const matrix = this.buildEffectiveMatrix(doc);
    this.cache.set(key, {
      matrix,
      expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS
    });
    return matrix;
  }

  async hasOrganizationPermission(input: {
    organizationId: string;
    role: string;
    permission: string;
  }): Promise<boolean> {
    const matrix = await this.getEffectiveMatrix(input.organizationId);
    const role = normalizeRole(input.role);
    const permission = String(input.permission ?? '')
      .trim()
      .toLowerCase();
    return (matrix[role] ?? []).includes(permission);
  }

  invalidate(organizationId: string): void {
    this.cache.delete(String(organizationId ?? '').trim());
  }
}
