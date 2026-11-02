import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  organization: string | null;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenType: 'refresh';
}

const asString = (value: unknown): string => String(value ?? '').trim();

const parseSecretChain = (
  primary: unknown,
  previousSecretsRaw: unknown
): string[] => {
  const primarySecret = asString(primary);
  const previous = asString(previousSecretsRaw)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const all = primarySecret ? [primarySecret, ...previous] : [...previous];
  const chain = [...new Set(all)];
  if (!chain.length) {
    throw new Error('No JWT verification secrets configured');
  }
  return chain;
};

/**
 * JWT access/refresh tokens with rotation-friendly secret chains, ported
 * from legacy `backend/src/utils/token.js`.
 */
@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService) {}

  private accessSecrets(): string[] {
    return parseSecretChain(
      this.config.get('JWT_ACCESS_SECRET'),
      this.config.get('JWT_ACCESS_PREVIOUS_SECRETS')
    );
  }

  private refreshSecrets(): string[] {
    return parseSecretChain(
      this.config.get('JWT_REFRESH_SECRET'),
      this.config.get('JWT_REFRESH_PREVIOUS_SECRETS')
    );
  }

  private expiresIn(key: string): jwt.SignOptions['expiresIn'] {
    return this.config.get<string>(
      key
    ) as unknown as jwt.SignOptions['expiresIn'];
  }

  signAccessToken(user: {
    id: string;
    role: string;
    organization: string | null;
  }): string {
    return jwt.sign(
      { sub: user.id, role: user.role, organization: user.organization },
      this.accessSecrets()[0],
      { expiresIn: this.expiresIn('JWT_ACCESS_EXPIRES_IN') }
    );
  }

  signRefreshToken(user: { id: string }): string {
    return jwt.sign(
      { sub: user.id, tokenType: 'refresh' },
      this.refreshSecrets()[0],
      {
        expiresIn: this.expiresIn('JWT_REFRESH_EXPIRES_IN')
      }
    );
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.verifyWithChain<AccessTokenPayload>(
      token,
      this.accessSecrets()
    );
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return this.verifyWithChain<RefreshTokenPayload>(
      token,
      this.refreshSecrets()
    );
  }

  private verifyWithChain<T extends object>(
    token: string,
    secrets: string[]
  ): T {
    if (!token) throw new Error('Token is required');
    let lastError: unknown = null;
    for (const secret of secrets) {
      try {
        return jwt.verify(token, secret) as T;
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) throw error;
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('Unable to verify token');
  }
}
