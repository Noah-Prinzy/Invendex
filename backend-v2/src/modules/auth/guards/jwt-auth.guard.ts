import { CanActivate, Injectable, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { TokenExpiredError } from 'jsonwebtoken';
import type { Request } from 'express';
import { AppError } from '../../../common/errors/app-error';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { isTestBypassEnabled } from '../../../common/utils/test-bypass';
import type { IUser } from '../../../persistence/schemas/user.schema';
import { ROLES } from '../../rbac/permissions';
import { TokenService } from '../token.service';

/**
 * Verifies the Bearer access token and loads the user, ported from legacy
 * `protect` in `authMiddleware.js` (including the NODE_ENV=test bypass).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    @InjectModel('User') private readonly userModel: Model<IUser>,
    private readonly config: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    if (isTestBypassEnabled()) {
      request.user = {
        _id: '000000000000000000000000',
        email: 'test@invendex.local',
        role: ROLES.ADMIN,
        organization: '000000000000000000000001'
      };
      request.organizationId = request.user.organization ?? undefined;
      return true;
    }

    const header = request.headers.authorization;
    const token =
      header && header.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new AppError('Not authorized, no token provided', 401);
    }

    let decoded: { sub: string };
    try {
      decoded = this.tokenService.verifyAccessToken(token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AppError('Access token expired', 401);
      }
      throw new AppError('Invalid access token', 401);
    }

    const user = await this.userModel
      .findById(decoded.sub)
      .select('-password')
      .setOptions({ tenantBypass: true })
      .lean();

    if (!user) {
      throw new AppError('User no longer exists', 401);
    }
    if (user.isActive === false) {
      throw new AppError(
        'Account is deactivated. Contact an administrator.',
        403
      );
    }
    if (
      this.config.get<string>('REQUIRE_EMAIL_VERIFICATION') === 'true' &&
      user.isVerified !== true
    ) {
      throw new AppError('Email verification required for this account.', 403);
    }

    request.user = {
      _id: String(user._id),
      email: user.email,
      role: user.role,
      organization: user.organization ? String(user.organization) : null
    };
    return true;
  }
}
