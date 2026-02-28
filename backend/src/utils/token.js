import jwt from 'jsonwebtoken';

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

const getRequiredSecret = (envKey) => {
  const value = asString(process.env[envKey]);
  if (!value) {
    throw new Error(`${envKey} is required`);
  }
  return value;
};

export const getAccessTokenSigningSecret = () =>
  getRequiredSecret('JWT_ACCESS_SECRET');

export const getRefreshTokenSigningSecret = () =>
  getRequiredSecret('JWT_REFRESH_SECRET');

export const getAccessTokenVerificationSecrets = () =>
  parseSecretChain(
    process.env.JWT_ACCESS_SECRET,
    process.env.JWT_ACCESS_SECRET_PREVIOUS
  );

export const getRefreshTokenVerificationSecrets = () =>
  parseSecretChain(
    process.env.JWT_REFRESH_SECRET,
    process.env.JWT_REFRESH_SECRET_PREVIOUS
  );

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
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
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
      expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
    }
  );
};
