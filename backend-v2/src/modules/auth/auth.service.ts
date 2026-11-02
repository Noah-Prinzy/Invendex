import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { TokenExpiredError } from 'jsonwebtoken';
import { AppError } from '../../common/errors/app-error';
import {
  DomainEventTypes,
  type DomainEvent
} from '../../events/domain-event.types';
import {
  DOMAIN_EVENT_BUS,
  type DomainEventBus
} from '../../events/domain-event.bus';
import type { IOrganization } from '../../persistence/schemas/organization.schema';
import type { IUser } from '../../persistence/schemas/user.schema';
import { ROLES } from '../rbac/permissions';
import type { LoginDto, RegisterDto } from './dto/auth.dto';
import { TokenService } from './token.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  _id: string;
  email: string;
  username: string | null;
  mobileNumber: string | null;
  role: string;
  organization: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<IUser>,
    @InjectModel('Organization')
    private readonly organizationModel: Model<IOrganization>,
    private readonly tokenService: TokenService,
    private readonly config: ConfigService,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser } & AuthTokens> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.userModel
      .findOne({ email })
      .setOptions({ tenantBypass: true })
      .lean();
    if (existing) {
      throw new AppError('Email is already registered', 409);
    }

    const organization = await this.organizationModel.create({
      name:
        dto.organizationName?.trim() ||
        `${dto.name?.trim() || email.split('@')[0]}'s Organization`,
      currency: 'UGX',
      locale: this.config.get<string>('DEFAULT_LOCALE') ?? 'en'
    });

    const user = await this.userModel.create({
      email,
      password: dto.password,
      username: dto.name
        ? dto.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '')
            .slice(0, 30) || undefined
        : undefined,
      role: ROLES.OWNER,
      organization: organization._id,
      isActive: true,
      isVerified: true
    });

    await this.organizationModel
      .updateOne({ _id: organization._id }, { owner: user._id })
      .setOptions({ tenantBypass: true });

    const tokens = this.issueTokens(user);
    await this.publish(DomainEventTypes.AUTH_REGISTERED, user, {
      userId: String(user._id),
      email: user.email,
      organizationId: String(organization._id)
    });
    return { user: this.toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser } & AuthTokens> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userModel
      .findOne({ email })
      .select('+password')
      .setOptions({ tenantBypass: true });
    if (!user || !(await user.comparePassword(dto.password))) {
      throw new AppError('Invalid email or password', 401);
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

    const tokens = this.issueTokens(user);
    await this.publish(DomainEventTypes.AUTH_LOGIN, user, {
      userId: String(user._id),
      email: user.email
    });
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let decoded: { sub: string };
    try {
      decoded = this.tokenService.verifyRefreshToken(refreshToken);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AppError('Refresh token expired', 401);
      }
      throw new AppError('Invalid refresh token', 401);
    }
    const user = await this.userModel
      .findById(decoded.sub)
      .setOptions({ tenantBypass: true });
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }
    if (user.isActive === false) {
      throw new AppError(
        'Account is deactivated. Contact an administrator.',
        403
      );
    }
    return this.issueTokens(user);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .setOptions({ tenantBypass: true })
      .lean();
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }
    return this.toPublicUser(user);
  }

  async logout(user: { _id: string } | undefined): Promise<void> {
    if (user) {
      await this.events.publish(
        DomainEventTypes.AUTH_LOGOUT,
        { userId: user._id },
        { organizationId: user._id ? null : null }
      );
    }
  }

  private issueTokens(user: IUser): AuthTokens {
    return {
      accessToken: this.tokenService.signAccessToken({
        id: String(user._id),
        role: user.role,
        organization: user.organization ? String(user.organization) : null
      }),
      refreshToken: this.tokenService.signRefreshToken({ id: String(user._id) })
    };
  }

  private async publish(
    type: string,
    user: IUser,
    payload: Record<string, unknown>
  ): Promise<void> {
    await this.events.publish(type, payload, {
      organizationId: user.organization ? String(user.organization) : null
    });
  }

  private toPublicUser(
    user: Pick<
      IUser,
      | '_id'
      | 'email'
      | 'username'
      | 'mobileNumber'
      | 'role'
      | 'organization'
      | 'isActive'
      | 'isVerified'
      | 'createdAt'
      | 'updatedAt'
    >
  ): PublicUser {
    return {
      _id: String(user._id),
      email: user.email,
      username: user.username ?? null,
      mobileNumber: user.mobileNumber ?? null,
      role: user.role,
      organization: user.organization ? String(user.organization) : null,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

export type { DomainEvent };
