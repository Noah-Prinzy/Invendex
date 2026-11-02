import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { TenantContext } from './tenant-context';

/**
 * Runs the whole downstream pipeline (remaining guards' async work aside, the
 * controller and everything it awaits) inside the ALS tenant context, so the
 * mongoose tenant plugin can enforce the organization filter.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    const request = context.switchToHttp().getRequest<Request>();
    const organizationId = request.organizationId ?? request.user?.organization;

    if (isPublic || !organizationId) {
      return next.handle();
    }

    request.organizationId = String(organizationId);

    return new Observable((subscriber) => {
      TenantContext.run({ organizationId: String(organizationId) }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
