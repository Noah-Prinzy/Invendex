import { CanActivate, Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from '../../common/errors/app-error';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { REQUIRE_PERMISSION_KEY } from '../../common/decorators/require-permission.decorator';
import { isTestBypassEnabled } from '../../common/utils/test-bypass';
import { TenantContext } from '../../tenant/tenant-context';
import { hasPermission } from './permissions';
import { PermissionPolicyService } from './permission-policy.service';

/**
 * Enforces `@RequirePermission(...)`: the user's role must hold the permission
 * under the organization's effective policy matrix (falling back to the
 * default role map when the user has no organization).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyService: PermissionPolicyService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (isTestBypassEnabled()) {
      if (!request.user.role) request.user.role = 'admin';
      return true;
    }

    const organizationId = request.organizationId ?? request.user.organization;

    const allowed = organizationId
      ? await TenantContext.run(
          { organizationId: String(organizationId) },
          () =>
            this.policyService.hasOrganizationPermission({
              organizationId: String(organizationId),
              role: request.user?.role ?? '',
              permission: required[0]
            })
        )
      : hasPermission(request.user.role, required[0]);

    if (!allowed) {
      throw new AppError('Access denied: insufficient permissions', 403);
    }
    return true;
  }
}
