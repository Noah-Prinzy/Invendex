import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** The active tenant (organization) id, set by the tenant guard/interceptor. */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.organizationId ?? request.user?.organization ?? undefined;
  }
);
