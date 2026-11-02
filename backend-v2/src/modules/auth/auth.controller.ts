import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { AuthService } from './auth.service';
import {
  LoginDtoClass,
  RefreshDtoClass,
  RegisterDtoClass,
  loginSchema,
  refreshSchema,
  registerSchema,
  type LoginDto,
  type RefreshDto,
  type RegisterDto
} from './dto/auth.dto';

const REFRESH_COOKIE = 'refreshToken';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new organization owner account' })
  @ApiBody({ type: RegisterDtoClass })
  async register(
    @ZodBody(registerSchema) dto: RegisterDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      data: { user: result.user, accessToken: result.accessToken },
      message: 'Registration successful'
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiBody({ type: LoginDtoClass })
  async login(
    @ZodBody(loginSchema) dto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      data: { user: result.user, accessToken: result.accessToken },
      message: 'Login successful'
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token and get a new access token' })
  @ApiBody({ type: RefreshDtoClass })
  async refresh(
    @ZodBody(refreshSchema) dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE
    ];
    const token = dto.refreshToken ?? cookieToken;
    if (!token) {
      return { data: null, message: 'No refresh token provided' };
    }
    const tokens = await this.authService.refresh(token);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { data: { accessToken: tokens.accessToken }, message: 'Token refreshed' };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out and clear the refresh cookie' })
  async logout(
    @CurrentUser() user: AuthUser | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.authService.logout(user);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    return { data: null, message: 'Logged out' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user' })
  async me(@CurrentUser() user: AuthUser) {
    const profile = await this.authService.me(user._id);
    return { data: { user: profile }, message: 'Success' };
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('COOKIE_SECURE') === 'true',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000
    };
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, this.cookieOptions());
  }
}
