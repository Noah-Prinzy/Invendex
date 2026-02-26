import crypto from 'node:crypto';
import { AppError } from '../errors/AppError.js';
import { successResponse } from '../utils/response.js';
import { getCsrfCookieOptions } from '../config/envConfig.js';

const CSRF_COOKIE_NAME = 'ledgerly_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

const isCsrfEnabled = () =>
  String(process.env.CSRF_ENABLED || 'true')
    .toLowerCase()
    .trim() === 'true';

const isCsrfBypassed = () =>
  process.env.NODE_ENV === 'test' || !isCsrfEnabled();

const getHeaderToken = (req) =>
  String(
    req.headers?.[CSRF_HEADER_NAME] || req.headers?.['X-CSRF-Token'] || ''
  ).trim();

const generateCsrfToken = () => crypto.randomBytes(24).toString('hex');

const ensureCsrfCookie = (req, res) => {
  const existing = String(req.cookies?.[CSRF_COOKIE_NAME] || '').trim();
  if (existing) return existing;

  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  return token;
};

export const issueCsrfToken = (req, res) => {
  if (isCsrfBypassed()) {
    return successResponse(
      res,
      {
        csrfEnabled: false,
        headerName: CSRF_HEADER_NAME
      },
      'CSRF protection disabled for current environment'
    );
  }

  const token = ensureCsrfCookie(req, res);
  return successResponse(
    res,
    {
      csrfEnabled: true,
      csrfToken: token,
      headerName: CSRF_HEADER_NAME
    },
    'CSRF token issued'
  );
};

export const requireCsrf = (req, res, next) => {
  if (isCsrfBypassed()) return next();

  const hasBearerToken = String(req.headers?.authorization || '').startsWith(
    'Bearer '
  );
  if (hasBearerToken) return next();

  const cookieToken = String(req.cookies?.[CSRF_COOKIE_NAME] || '').trim();
  const headerToken = getHeaderToken(req);

  if (!cookieToken || !headerToken) {
    return next(new AppError('CSRF token required', 403));
  }

  if (cookieToken !== headerToken) {
    return next(new AppError('Invalid CSRF token', 403));
  }

  return next();
};

export default {
  issueCsrfToken,
  requireCsrf
};
