import { CanActivate, Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { Request } from 'express';
import { AppError } from '../../../common/errors/app-error';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { isTestBypassEnabled } from '../../../common/utils/test-bypass';
import type { IOrganization } from '../../../persistence/schemas/organization.schema';
import { TenantContext } from '../../../tenant/tenant-context';

/**
 * Ported from legacy `requireOrganization.js`: the authenticated user must
 * belong to an active organization; that organization becomes the request's
 * tenant id.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel('Organization')
    private readonly organizationModel: Model<IOrganization>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const organizationId = request.user?.organization;

    if (!organizationId) {
      throw new AppError('User is not assigned to an organization', 403);
    }

    request.organizationId = String(organizationId);

    if (isTestBypassEnabled()) {
      return true;
    }

    const active = await TenantContext.run(
      { organizationId: request.organizationId },
      async () => {
        const organization = await this.organizationModel
          .findOne({ _id: organizationId, isActive: true })
          .setOptions({ tenantBypass: true })
          .select('_id')
          .lean();
        return organization !== null;
      }
    );

    if (!active) {
      throw new AppError(
        'Organization is inactive or no longer available',
        403
      );
    }

    return true;
  }
}
