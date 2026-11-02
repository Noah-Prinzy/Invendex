import jwt from 'jsonwebtoken';

import { getRuntimeConfig } from '../config/envConfig.js';

const asString = (value) => String(value || '').trim();

const parseSecretChain = (primarySecret, previousSecretsRaw) => {
  const primary = asString(primarySecret);
  const previous = asString(previousSecretsRaw)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!primary && previous.length === 0) {
    return [];
  }

  const all = primary ? [primary, ...previous] : [...previous];
  return [...new Set(all)];
};

const verifyJwtWithSecretChain = (token, secretChain) => {
  if (!token) {
    throw new Error('Token is required');
  }

  if (!Array.isArray(secretChain) || secretChain.length === 0) {
    throw new Error('No JWT verification secrets configured');
  }

  let lastError = null;
  for (const secret of secretChain) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      if (error?.name === 'TokenExpiredError') {
        throw error;
      }
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Unable to verify token');
};

const getRequiredSecret = (value, configKey) => {
  const secret = asString(value);
  if (!secret) {
    throw new Error(`${configKey} is required`);
  }
  return secret;
};

export const getAccessTokenSigningSecret = () =>
  getRequiredSecret(
    getRuntimeConfig().auth.accessTokenSecret,
    'JWT_ACCESS_SECRET'
  );

export const getRefreshTokenSigningSecret = () =>
  getRequiredSecret(
    getRuntimeConfig().auth.refreshTokenSecret,
    'JWT_REFRESH_SECRET'
  );

export const getAccessTokenVerificationSecrets = () => {
  const auth = getRuntimeConfig().auth;
  return parseSecretChain(
    auth.accessTokenSecret,
    auth.accessTokenPreviousSecrets.join(',')
  );
};

export const getRefreshTokenVerificationSecrets = () => {
  const auth = getRuntimeConfig().auth;
  return parseSecretChain(
    auth.refreshTokenSecret,
    auth.refreshTokenPreviousSecrets.join(',')
  );
};

export const verifyAccessToken = (token) =>
  verifyJwtWithSecretChain(token, getAccessTokenVerificationSecrets());

export const verifyRefreshToken = (token) =>
  verifyJwtWithSecretChain(token, getRefreshTokenVerificationSecrets());

/**
 * Generate Access Token
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      organization: user.organization || null
    },
    getAccessTokenSigningSecret(),
    {
      expiresIn: getRuntimeConfig().auth.accessTokenExpiresIn
    }
  );
};

/**
 * Generate Refresh Token (ROTATABLE)
 */
export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      tokenVersion: Date.now() // helps uniqueness
    },
    getRefreshTokenSigningSecret(),
    {
      expiresIn: getRuntimeConfig().auth.refreshTokenExpiresIn
    }
  );
};
