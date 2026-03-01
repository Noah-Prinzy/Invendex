import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import Organization from '../models/Organization.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import User from '../models/User.js';
import EmployeeInvite from '../models/EmployeeInvite.js';
import bcrypt from 'bcryptjs';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getAccessTokenSigningSecret
} from '../utils/token.js';
import { logAudit } from '../utils/auditLogger.js';
import { logger } from '../observability/logger.js';
import { publishEmployeeSignedIn } from '../realtime/publisher.js';
import { createInAppNotification } from '../services/notifications/inAppNotificationService.js';
import {
  getRefreshCookieOptions,
  getClearRefreshCookieOptions
} from '../config/envConfig.js';
import {
  buildOtpAuthUri,
  generateBase32Secret,
  generateRecoveryCodes,
  hashRecoveryCode,
  matchesRecoveryCodeHash,
  normalizeRecoveryCodeInput,
  verifyTotp
} from '../utils/totp.js';

const MAX_SESSIONS = 5;
const SESSION_ID_PREFIX = 'sess';
const MAX_SESSION_DEVICE_ID_LENGTH = 120;
const MAX_SESSION_USER_AGENT_LENGTH = 255;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const ADMIN_ROLES = new Set(['owner', 'admin']);
const ALLOWED_UI_THEMES = new Set([
  'ledgerly-classic',
  'glacier-blue',
  'emerald-shift',
  'graphite-noir',
  'sunset-ember',
  'royal-violet',
  'sand-dune',
  'neon-grid'
]);
const DEFAULT_UI_THEME = 'ledgerly-classic';
const TWO_FACTOR_CHALLENGE_TTL_SECONDS = (() => {
  const raw = Number(process.env.AUTH_2FA_CHALLENGE_TTL_SECONDS || 600);
  if (!Number.isFinite(raw) || raw < 60 || raw > 3600) {
    return 600;
  }
  return Math.floor(raw);
})();
const TWO_FACTOR_ISSUER = String(process.env.AUTH_2FA_ISSUER || 'Ledgerly')
  .trim()
  .slice(0, 80);
const TWO_FACTOR_RECOVERY_CODES_COUNT = 10;

const getTwoFactorChallengeSecret = () => {
  const explicitSecret = String(
    process.env.AUTH_2FA_CHALLENGE_SECRET || ''
  ).trim();
  if (explicitSecret) return explicitSecret;
  return getAccessTokenSigningSecret();
};

const signTwoFactorChallenge = (payload) =>
  jwt.sign(payload, getTwoFactorChallengeSecret(), {
    expiresIn: TWO_FACTOR_CHALLENGE_TTL_SECONDS
  });

const verifyTwoFactorChallenge = (token) =>
  jwt.verify(String(token || ''), getTwoFactorChallengeSecret());

const isTwoFactorEnabled = (user) => Boolean(user?.twoFactor?.enabled);

const requireCurrentPasswordMatch = async ({ user, password }) => {
  const normalizedPassword = String(password || '').trim();
  if (!normalizedPassword) {
    throw new AppError('currentPassword is required', 400);
  }

  const isMatch = await bcrypt.compare(normalizedPassword, user.password);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401);
  }
};

const consumeRecoveryCodeIfValid = ({ user, recoveryCode }) => {
  const normalizedCode = normalizeRecoveryCodeInput(recoveryCode);
  if (!normalizedCode) return false;

  if (!Array.isArray(user?.twoFactor?.recoveryCodes)) {
    return false;
  }

  for (const entry of user.twoFactor.recoveryCodes) {
    if (!entry || entry.usedAt) continue;
    if (
      matchesRecoveryCodeHash({
        recoveryCode: normalizedCode,
        hash: entry.codeHash
      })
    ) {
      entry.usedAt = new Date();
      return true;
    }
  }

  return false;
};

const assertTwoFactorProof = ({ user, code, recoveryCode }) => {
  const hasCode = String(code || '').trim().length > 0;
  const hasRecoveryCode = normalizeRecoveryCodeInput(recoveryCode).length > 0;

  if (!hasCode && !hasRecoveryCode) {
    throw new AppError('Provide either code or recoveryCode', 400);
  }

  if (!isTwoFactorEnabled(user)) {
    throw new AppError('Two-factor authentication is not enabled', 409);
  }

  if (hasCode) {
    const isValidCode = verifyTotp({
      base32Secret: user.twoFactor.secret,
      code
    });
    if (isValidCode) {
      return;
    }
  }

  if (hasRecoveryCode) {
    const recoveryMatched = consumeRecoveryCodeIfValid({
      user,
      recoveryCode
    });
    if (recoveryMatched) {
      return;
    }
  }

  throw new AppError('Invalid two-factor code', 401);
};

const buildRecoveryCodeRecords = (plainCodes = []) =>
  plainCodes.map((code) => ({
    codeHash: hashRecoveryCode(code),
    createdAt: new Date(),
    usedAt: null
  }));

const buildTwoFactorStatusPayload = (user) => {
  const recoveryCodes = Array.isArray(user?.twoFactor?.recoveryCodes)
    ? user.twoFactor.recoveryCodes
    : [];

  const remainingRecoveryCodes = recoveryCodes.filter(
    (entry) => !entry?.usedAt
  ).length;

  return {
    enabled: Boolean(user?.twoFactor?.enabled),
    pendingSetup: Boolean(user?.twoFactor?.pendingSecret),
    enabledAt: toIsoTimestamp(user?.twoFactor?.enabledAt),
    lastVerifiedAt: toIsoTimestamp(user?.twoFactor?.lastVerifiedAt),
    remainingRecoveryCodes
  };
};

const isEmailVerificationRequired = () =>
  String(process.env.AUTH_REQUIRE_EMAIL_VERIFICATION || 'false')
    .toLowerCase()
    .trim() === 'true';

const normalizeEmailInput = (value) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();

const normalizeOrganizationNameInput = (value) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

const escapeRegex = (value) =>
  String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hashToken = (token) =>
  crypto
    .createHash('sha256')
    .update(String(token || ''))
    .digest('hex');

const generateRawToken = () => crypto.randomBytes(24).toString('hex');

const buildOrganizationCode = (organizationName, attempt = 0) => {
  const base = String(organizationName || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

  const normalizedBase = base || 'ORG';
  const entropy = `${Date.now().toString().slice(-6)}${Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, '0')}`;

  if (attempt <= 0) {
    return `${normalizedBase}-${entropy}`;
  }

  return `${normalizedBase}-${entropy}-${attempt}`;
};

const generateSessionId = () =>
  `${SESSION_ID_PREFIX}_${crypto.randomBytes(12).toString('hex')}`;

const sanitizeSessionField = (value, maxLength) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (!Number.isFinite(Number(maxLength)) || maxLength <= 0) {
    return normalized;
  }
  return normalized.slice(0, maxLength);
};

const getRequestIpAddress = (req) => {
  const forwardedFor = String(req.headers?.['x-forwarded-for'] || '').trim();
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const directIp = String(req.ip || req.socket?.remoteAddress || '').trim();
  return directIp || null;
};

const buildSessionMetadata = (req, overrides = {}) => {
  const normalizedSessionId = sanitizeSessionField(
    overrides?.sessionId,
    MAX_SESSION_DEVICE_ID_LENGTH
  );
  const headerDeviceId = sanitizeSessionField(
    req.headers?.['x-device-id'],
    MAX_SESSION_DEVICE_ID_LENGTH
  );
  const providedDeviceId = sanitizeSessionField(
    overrides?.deviceId,
    MAX_SESSION_DEVICE_ID_LENGTH
  );

  return {
    sessionId: normalizedSessionId || generateSessionId(),
    deviceId: providedDeviceId || headerDeviceId || null,
    userAgent: sanitizeSessionField(
      req.headers?.['user-agent'],
      MAX_SESSION_USER_AGENT_LENGTH
    ),
    ipAddress: sanitizeSessionField(
      overrides?.ipAddress || getRequestIpAddress(req),
      MAX_SESSION_USER_AGENT_LENGTH
    ),
    lastUsedAt: new Date()
  };
};

const appendRefreshToken = (user, sessionMetadata = {}) => {
  const refreshToken = generateRefreshToken(user);
  const now = new Date();
  user.refreshTokens.push({
    token: refreshToken,
    sessionId: sanitizeSessionField(
      sessionMetadata?.sessionId,
      MAX_SESSION_DEVICE_ID_LENGTH
    ),
    deviceId: sanitizeSessionField(
      sessionMetadata?.deviceId,
      MAX_SESSION_DEVICE_ID_LENGTH
    ),
    userAgent: sanitizeSessionField(
      sessionMetadata?.userAgent,
      MAX_SESSION_USER_AGENT_LENGTH
    ),
    ipAddress: sanitizeSessionField(
      sessionMetadata?.ipAddress,
      MAX_SESSION_USER_AGENT_LENGTH
    ),
    lastUsedAt: sessionMetadata?.lastUsedAt || now,
    createdAt: now
  });
  if (user.refreshTokens.length > MAX_SESSIONS) {
    user.refreshTokens = user.refreshTokens
      .sort(
        (a, b) =>
          new Date(a?.createdAt || 0).getTime() -
          new Date(b?.createdAt || 0).getTime()
      )
      .slice(-MAX_SESSIONS);
  }

  return {
    refreshToken,
    sessionId:
      user.refreshTokens[user.refreshTokens.length - 1]?.sessionId || null
  };
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', getClearRefreshCookieOptions());
};

const toIsoTimestamp = (value) => {
  if (!value) return null;
  const candidate = new Date(value);
  if (!Number.isFinite(candidate.getTime())) return null;
  return candidate.toISOString();
};

const ensureRefreshTokenSessionShape = (user) => {
  if (!user || !Array.isArray(user.refreshTokens)) return false;
  let changed = false;

  for (const tokenEntry of user.refreshTokens) {
    if (!tokenEntry.sessionId) {
      tokenEntry.sessionId = generateSessionId();
      changed = true;
    }

    if (!tokenEntry.createdAt) {
      tokenEntry.createdAt = new Date();
      changed = true;
    }

    if (!tokenEntry.lastUsedAt) {
      tokenEntry.lastUsedAt = tokenEntry.createdAt || new Date();
      changed = true;
    }
  }

  return changed;
};

const mapRefreshTokenSessions = ({ user, currentToken = '' }) => {
  const sessions = (user.refreshTokens || []).map((entry) => ({
    sessionId: String(entry?.sessionId || ''),
    createdAt: toIsoTimestamp(entry?.createdAt),
    lastUsedAt: toIsoTimestamp(entry?.lastUsedAt || entry?.createdAt),
    deviceId: sanitizeSessionField(
      entry?.deviceId,
      MAX_SESSION_DEVICE_ID_LENGTH
    ),
    userAgent: sanitizeSessionField(
      entry?.userAgent,
      MAX_SESSION_USER_AGENT_LENGTH
    ),
    ipAddress: sanitizeSessionField(
      entry?.ipAddress,
      MAX_SESSION_USER_AGENT_LENGTH
    ),
    current:
      Boolean(currentToken) && String(entry?.token) === String(currentToken)
  }));

  return sessions.sort(
    (a, b) =>
      new Date(b.lastUsedAt || b.createdAt || 0).getTime() -
      new Date(a.lastUsedAt || a.createdAt || 0).getTime()
  );
};

const buildOrganizationPayload = (organization) => {
  if (!organization) return null;
  return {
    _id: organization._id,
    name: organization.name || null,
    code: organization.code || null
  };
};

const resolveOrganizationPayloadById = async (organizationId) => {
  if (!organizationId) return null;
  const organization = await Organization.findById(organizationId)
    .select('_id name code')
    .lean();
  return buildOrganizationPayload(organization);
};

const buildAuthUser = (user, organization = null) => ({
  _id: user._id,
  email: user.email,
  role: user.role,
  twoFactorEnabled: Boolean(user?.twoFactor?.enabled),
  uiTheme: ALLOWED_UI_THEMES.has(String(user.uiTheme || '').trim())
    ? String(user.uiTheme || '').trim()
    : DEFAULT_UI_THEME,
  organization: user.organization || organization?._id || null,
  organizationName: organization?.name || null,
  isVerified: Boolean(user.isVerified),
  isActive: user.isActive !== false
});

const buildTokenDebugData = (rawToken) => {
  if (process.env.NODE_ENV === 'production') {
    return {};
  }

  return { debugToken: rawToken };
};

const resolveOrganizationByName = async (companyName) => {
  const normalizedCompanyName = normalizeOrganizationNameInput(companyName);
  if (!normalizedCompanyName) return null;

  return Organization.findOne({
    name: new RegExp(`^${escapeRegex(normalizedCompanyName)}$`, 'i'),
    isActive: true
  });
};

const verifyLoginCredentials = async ({
  user,
  normalizedEmail,
  normalizedPassword
}) => {
  if (!user) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('auth_login_user_not_found', {
        email: normalizedEmail,
        emailLength: normalizedEmail.length
      });
    }
    throw new AppError('Invalid credentials', 401);
  }

  if (user.isActive === false) {
    throw new AppError(
      'Account is deactivated. Contact an administrator.',
      403
    );
  }

  if (isEmailVerificationRequired() && !user.isVerified) {
    throw new AppError(
      'Email verification required. Please verify your account first.',
      403
    );
  }

  const isMatch = await bcrypt.compare(normalizedPassword, user.password);
  if (!isMatch) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('auth_login_password_mismatch', {
        email: normalizedEmail,
        userId: user._id
      });
    }
    throw new AppError('Invalid credentials', 401);
  }
};

const buildTwoFactorChallengePayload = ({
  req,
  user,
  portal = 'generic',
  context = {}
}) => {
  const tokenPayload = {
    type: 'two_factor_login',
    userId: String(user._id),
    organizationId: user.organization ? String(user.organization) : null,
    portal: String(portal || 'generic'),
    sessionMetadata: buildSessionMetadata(req),
    context:
      context && typeof context === 'object' && !Array.isArray(context)
        ? context
        : {}
  };

  return {
    requiresTwoFactor: true,
    twoFactorToken: signTwoFactorChallenge(tokenPayload),
    expiresInSeconds: TWO_FACTOR_CHALLENGE_TTL_SECONDS,
    portal: tokenPayload.portal
  };
};

const finalizeLogin = async ({
  req,
  res,
  user,
  action,
  meta = null,
  sessionMetadata = null
}) => {
  const accessToken = generateAccessToken(user);
  const { refreshToken, sessionId } = appendRefreshToken(
    user,
    sessionMetadata || buildSessionMetadata(req)
  );
  const organization = await resolveOrganizationPayloadById(user.organization);

  await user.save();
  setRefreshCookie(res, refreshToken);

  await logAudit({
    req,
    action,
    resource: 'AUTH',
    resourceId: user._id,
    organizationId: user.organization || null,
    meta
  });

  return {
    accessToken,
    sessionId,
    user: buildAuthUser(user, organization),
    organization
  };
};

export const login = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const normalizedPassword = String(req.body?.password || '').trim();

    if (!normalizedEmail || !normalizedPassword) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password'
    );
    await verifyLoginCredentials({
      user,
      normalizedEmail,
      normalizedPassword
    });

    if (isTwoFactorEnabled(user)) {
      return successResponse(
        res,
        buildTwoFactorChallengePayload({
          req,
          user,
          portal: 'generic'
        }),
        'Two-factor authentication required'
      );
    }

    const data = await finalizeLogin({
      req,
      res,
      user,
      action: 'LOGIN',
      meta: {
        portal: 'generic'
      }
    });

    return successResponse(res, data, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const adminLogin = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const normalizedPassword = String(req.body?.password || '').trim();

    if (!normalizedEmail || !normalizedPassword) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password'
    );
    await verifyLoginCredentials({
      user,
      normalizedEmail,
      normalizedPassword
    });

    if (!ADMIN_ROLES.has(String(user.role || '').toLowerCase())) {
      throw new AppError('Use the employee portal for this account', 403);
    }

    if (isTwoFactorEnabled(user)) {
      return successResponse(
        res,
        buildTwoFactorChallengePayload({
          req,
          user,
          portal: 'admin'
        }),
        'Two-factor authentication required'
      );
    }

    const data = await finalizeLogin({
      req,
      res,
      user,
      action: 'ADMIN_LOGIN',
      meta: {
        portal: 'admin'
      }
    });

    return successResponse(res, data, 'Admin login successful');
  } catch (err) {
    next(err);
  }
};

export const employeeLogin = async (req, res, next) => {
  try {
    const normalizedCompanyName = normalizeOrganizationNameInput(
      req.body?.companyName || req.body?.organizationName
    );
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const normalizedPassword = String(req.body?.password || '').trim();
    const inviteCode = String(req.body?.inviteCode || '').trim();

    if (!normalizedCompanyName || !normalizedEmail || !normalizedPassword) {
      throw new AppError('companyName, email, and password are required', 400);
    }

    const organization = await resolveOrganizationByName(normalizedCompanyName);
    if (!organization) {
      throw new AppError('Invalid credentials', 401);
    }

    let user = await User.findOne({ email: normalizedEmail }).select(
      '+password'
    );
    const isNewEmployee = !user;
    const now = new Date();
    let consumedInvite = null;

    if (user && String(user.organization || '') !== String(organization._id)) {
      throw new AppError('Invalid credentials', 401);
    }

    if (user && ADMIN_ROLES.has(String(user.role || '').toLowerCase())) {
      throw new AppError('Use the admin portal for this account', 403);
    }

    if (!user) {
      if (!inviteCode) {
        throw new AppError(
          'Invite code required for first-time employee login',
          403
        );
      }

      consumedInvite = await EmployeeInvite.findOne({
        organization: organization._id,
        codeHash: hashToken(inviteCode),
        status: 'ACTIVE',
        expiresAt: { $gt: now }
      }).select('+codeHash');

      if (!consumedInvite) {
        throw new AppError('Invalid or expired invite code', 403);
      }

      if (
        consumedInvite.email &&
        String(consumedInvite.email).toLowerCase() !== normalizedEmail
      ) {
        throw new AppError('Invite code does not match this email', 403);
      }

      const organizationSettings = await OrganizationSettings.findOne({
        organization: organization._id
      })
        .select('userAccess.defaultEmployeeRole')
        .lean();

      const defaultEmployeeRole =
        organizationSettings?.userAccess?.defaultEmployeeRole === 'manager'
          ? 'manager'
          : 'staff';

      user = await User.create({
        email: normalizedEmail,
        password: normalizedPassword,
        role: defaultEmployeeRole,
        organization: organization._id,
        isVerified: true,
        isActive: true
      });
      user = await User.findById(user._id).select('+password');
    }

    if (!isNewEmployee) {
      await verifyLoginCredentials({
        user,
        normalizedEmail,
        normalizedPassword
      });
    } else if (user?.isActive === false) {
      throw new AppError(
        'Account is deactivated. Contact an administrator.',
        403
      );
    }

    if (consumedInvite) {
      consumedInvite.status = 'USED';
      consumedInvite.usedBy = user._id;
      consumedInvite.usedAt = now;
      await consumedInvite.save();
    }

    if (isTwoFactorEnabled(user)) {
      return successResponse(
        res,
        buildTwoFactorChallengePayload({
          req,
          user,
          portal: 'employee',
          context: {
            organizationName: organization.name,
            autoCreated: isNewEmployee
          }
        }),
        'Two-factor authentication required'
      );
    }

    const data = await finalizeLogin({
      req,
      res,
      user,
      action: 'EMPLOYEE_LOGIN',
      meta: {
        portal: 'employee',
        companyName: organization.name,
        autoCreated: isNewEmployee,
        inviteId: consumedInvite?._id || null
      }
    });

    publishEmployeeSignedIn({
      organizationId: organization._id,
      actorUserId: user._id,
      employee: {
        _id: user._id,
        email: user.email,
        role: user.role,
        organization: organization._id,
        organizationName: organization.name
      }
    });

    await createInAppNotification({
      organizationId: organization._id,
      actorUserId: user._id,
      type: 'employee_signin',
      title: 'Employee signed in',
      message: `${user.email} signed in to ${organization.name}.`,
      severity: 'info',
      entityType: 'USER',
      entityId: user._id,
      metadata: {
        email: user.email,
        role: user.role,
        organizationName: organization.name,
        firstLogin: isNewEmployee
      }
    });

    return successResponse(
      res,
      {
        ...data,
        organization: {
          _id: organization._id,
          name: organization.name,
          code: organization.code
        }
      },
      'Employee login successful'
    );
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    if (!req.user?.email) {
      return successResponse(res, req.user, 'User profile fetched');
    }

    const organization = await resolveOrganizationPayloadById(
      req.user?.organization
    );
    const userPayload = buildAuthUser(req.user, organization);
    return successResponse(
      res,
      {
        ...userPayload,
        organization
      },
      'User profile fetched'
    );
  } catch (err) {
    next(err);
  }
};

export const updateMePreferences = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const requestedTheme = String(req.body?.uiTheme || '').trim();
    if (!ALLOWED_UI_THEMES.has(requestedTheme)) {
      throw new AppError('Unsupported uiTheme value', 400);
    }

    req.user.uiTheme = requestedTheme;
    await req.user.save();

    const organization = await resolveOrganizationPayloadById(
      req.user.organization
    );
    const userPayload = buildAuthUser(req.user, organization);

    await logAudit({
      req,
      action: 'UPDATE_USER_PREFERENCES',
      resource: 'AUTH',
      resourceId: req.user._id,
      organizationId: req.user.organization || null,
      meta: {
        uiTheme: requestedTheme
      }
    });

    return successResponse(
      res,
      {
        ...userPayload,
        organization
      },
      'User preferences updated'
    );
  } catch (err) {
    next(err);
  }
};

const TWO_FACTOR_PRIVATE_SELECT = [
  '+twoFactor.secret',
  '+twoFactor.pendingSecret',
  '+twoFactor.recoveryCodes',
  '+twoFactor.recoveryCodes.codeHash',
  '+twoFactor.pendingRecoveryCodeHashes'
].join(' ');

const findUserForTwoFactor = async ({ userId, includePassword = false }) => {
  const selection = includePassword
    ? `+password ${TWO_FACTOR_PRIVATE_SELECT}`
    : TWO_FACTOR_PRIVATE_SELECT;
  return User.findById(userId).select(selection);
};

export const getTwoFactorStatus = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await findUserForTwoFactor({ userId: req.user._id });
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    return successResponse(
      res,
      buildTwoFactorStatusPayload(user),
      'Two-factor status fetched'
    );
  } catch (error) {
    return next(error);
  }
};

export const setupTwoFactor = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await findUserForTwoFactor({
      userId: req.user._id,
      includePassword: true
    });
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    await requireCurrentPasswordMatch({
      user,
      password: req.body?.currentPassword
    });

    const base32Secret = generateBase32Secret();
    const recoveryCodes = generateRecoveryCodes(
      TWO_FACTOR_RECOVERY_CODES_COUNT
    );
    const recoveryCodeHashes = recoveryCodes.map((entry) =>
      hashRecoveryCode(entry)
    );

    user.twoFactor = user.twoFactor || {};
    user.twoFactor.pendingSecret = base32Secret;
    user.twoFactor.pendingRecoveryCodeHashes = recoveryCodeHashes;
    await user.save();

    const organization = await resolveOrganizationPayloadById(
      user.organization
    );
    const otpAuthUrl = buildOtpAuthUri({
      issuer: TWO_FACTOR_ISSUER || 'Ledgerly',
      accountName: user.email,
      base32Secret
    });

    await logAudit({
      req,
      action: 'SETUP_TWO_FACTOR',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: user.organization || null,
      meta: {
        issuer: TWO_FACTOR_ISSUER || 'Ledgerly',
        organizationId: organization?._id || null
      }
    });

    return successResponse(
      res,
      {
        secret: base32Secret,
        otpAuthUrl,
        recoveryCodes,
        status: buildTwoFactorStatusPayload(user)
      },
      'Two-factor setup initialized'
    );
  } catch (error) {
    return next(error);
  }
};

export const enableTwoFactor = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await findUserForTwoFactor({
      userId: req.user._id,
      includePassword: true
    });
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    await requireCurrentPasswordMatch({
      user,
      password: req.body?.currentPassword
    });

    const pendingSecret = String(user?.twoFactor?.pendingSecret || '').trim();
    if (!pendingSecret) {
      throw new AppError('No pending two-factor setup. Run setup first.', 409);
    }

    const isValidTotp = verifyTotp({
      base32Secret: pendingSecret,
      code: req.body?.code
    });
    if (!isValidTotp) {
      throw new AppError('Invalid two-factor code', 401);
    }

    const pendingRecoveryHashes = Array.isArray(
      user?.twoFactor?.pendingRecoveryCodeHashes
    )
      ? user.twoFactor.pendingRecoveryCodeHashes
      : [];

    user.twoFactor.enabled = true;
    user.twoFactor.secret = pendingSecret;
    user.twoFactor.pendingSecret = null;
    user.twoFactor.recoveryCodes = pendingRecoveryHashes.map((codeHash) => ({
      codeHash,
      usedAt: null,
      createdAt: new Date()
    }));
    user.twoFactor.pendingRecoveryCodeHashes = [];
    user.twoFactor.enabledAt = new Date();
    user.twoFactor.lastVerifiedAt = new Date();
    await user.save();

    await logAudit({
      req,
      action: 'ENABLE_TWO_FACTOR',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: user.organization || null
    });

    return successResponse(
      res,
      buildTwoFactorStatusPayload(user),
      'Two-factor authentication enabled'
    );
  } catch (error) {
    return next(error);
  }
};

export const disableTwoFactor = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await findUserForTwoFactor({
      userId: req.user._id,
      includePassword: true
    });
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    await requireCurrentPasswordMatch({
      user,
      password: req.body?.currentPassword
    });

    assertTwoFactorProof({
      user,
      code: req.body?.code,
      recoveryCode: req.body?.recoveryCode
    });

    user.twoFactor.enabled = false;
    user.twoFactor.secret = null;
    user.twoFactor.pendingSecret = null;
    user.twoFactor.recoveryCodes = [];
    user.twoFactor.pendingRecoveryCodeHashes = [];
    user.twoFactor.enabledAt = null;
    user.twoFactor.lastVerifiedAt = new Date();
    await user.save();

    await logAudit({
      req,
      action: 'DISABLE_TWO_FACTOR',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: user.organization || null
    });

    return successResponse(
      res,
      buildTwoFactorStatusPayload(user),
      'Two-factor authentication disabled'
    );
  } catch (error) {
    return next(error);
  }
};

export const regenerateTwoFactorRecoveryCodes = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await findUserForTwoFactor({
      userId: req.user._id,
      includePassword: true
    });
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    await requireCurrentPasswordMatch({
      user,
      password: req.body?.currentPassword
    });

    assertTwoFactorProof({
      user,
      code: req.body?.code,
      recoveryCode: req.body?.recoveryCode
    });

    const recoveryCodes = generateRecoveryCodes(
      TWO_FACTOR_RECOVERY_CODES_COUNT
    );
    user.twoFactor.recoveryCodes = buildRecoveryCodeRecords(recoveryCodes);
    user.twoFactor.lastVerifiedAt = new Date();
    await user.save();

    await logAudit({
      req,
      action: 'REGENERATE_TWO_FACTOR_RECOVERY_CODES',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: user.organization || null
    });

    return successResponse(
      res,
      {
        recoveryCodes,
        status: buildTwoFactorStatusPayload(user)
      },
      'Two-factor recovery codes regenerated'
    );
  } catch (error) {
    return next(error);
  }
};

export const verifyTwoFactorLogin = async (req, res, next) => {
  try {
    const challengeToken = String(req.body?.twoFactorToken || '').trim();
    if (!challengeToken) {
      throw new AppError('twoFactorToken is required', 400);
    }

    let challengePayload;
    try {
      challengePayload = verifyTwoFactorChallenge(challengeToken);
    } catch {
      throw new AppError('Invalid or expired two-factor token', 401);
    }

    if (challengePayload?.type !== 'two_factor_login') {
      throw new AppError('Invalid two-factor token payload', 401);
    }

    const user = await findUserForTwoFactor({
      userId: challengePayload?.userId,
      includePassword: false
    });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (user.isActive === false) {
      throw new AppError(
        'Account is deactivated. Contact an administrator.',
        403
      );
    }

    if (isEmailVerificationRequired() && !user.isVerified) {
      throw new AppError(
        'Email verification required. Please verify your account first.',
        403
      );
    }

    assertTwoFactorProof({
      user,
      code: req.body?.code,
      recoveryCode: req.body?.recoveryCode
    });

    user.twoFactor.lastVerifiedAt = new Date();

    const portal = String(challengePayload?.portal || 'generic')
      .trim()
      .toLowerCase();
    const authAction =
      portal === 'admin'
        ? 'ADMIN_LOGIN'
        : portal === 'employee'
          ? 'EMPLOYEE_LOGIN'
          : 'LOGIN';

    const data = await finalizeLogin({
      req,
      res,
      user,
      action: authAction,
      meta: {
        portal,
        twoFactorVerified: true
      },
      sessionMetadata:
        challengePayload?.sessionMetadata &&
        typeof challengePayload.sessionMetadata === 'object'
          ? challengePayload.sessionMetadata
          : null
    });

    if (portal === 'employee') {
      const organizationId = user.organization || null;
      const organizationName =
        String(challengePayload?.context?.organizationName || '').trim() ||
        data?.organization?.name ||
        null;

      if (organizationId) {
        publishEmployeeSignedIn({
          organizationId,
          actorUserId: user._id,
          employee: {
            _id: user._id,
            email: user.email,
            role: user.role,
            organization: organizationId,
            organizationName
          }
        });

        await createInAppNotification({
          organizationId,
          actorUserId: user._id,
          type: 'employee_signin',
          title: 'Employee signed in',
          message: `${user.email} signed in to ${organizationName || 'organization'}.`,
          severity: 'info',
          entityType: 'USER',
          entityId: user._id,
          metadata: {
            email: user.email,
            role: user.role,
            organizationName,
            firstLogin: false
          }
        });
      }
    }

    const loginMessage =
      portal === 'admin'
        ? 'Admin login successful'
        : portal === 'employee'
          ? 'Employee login successful'
          : 'Login successful';

    return successResponse(res, data, loginMessage);
  } catch (error) {
    return next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const oldToken = req.cookies.refreshToken;
    if (!oldToken) {
      clearRefreshCookie(res);
      throw new AppError('Refresh token required', 401);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(oldToken);
    } catch {
      clearRefreshCookie(res);
      throw new AppError('Invalid refresh token', 403);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      clearRefreshCookie(res);
      throw new AppError('Invalid refresh token', 403);
    }

    if (ensureRefreshTokenSessionShape(user)) {
      await user.save();
    }

    const matchedTokenEntry = user.refreshTokens.find(
      (rt) => rt.token === oldToken
    );
    const tokenExists = Boolean(matchedTokenEntry);

    if (!tokenExists) {
      user.refreshTokens = [];
      await user.save();

      await logAudit({
        req,
        action: 'TOKEN_REUSE_DETECTED',
        resource: 'AUTH',
        resourceId: user._id,
        organizationId: user.organization || null
      });

      clearRefreshCookie(res);
      throw new AppError('Session compromised. Please login again.', 403);
    }

    user.refreshTokens = user.refreshTokens.filter(
      (rt) => rt.token !== oldToken
    );

    const { refreshToken: newRefreshToken } = appendRefreshToken(
      user,
      buildSessionMetadata(req, {
        sessionId: matchedTokenEntry?.sessionId || null,
        deviceId: matchedTokenEntry?.deviceId || null
      })
    );
    await user.save();

    setRefreshCookie(res, newRefreshToken);

    const newAccessToken = generateAccessToken(user);

    return successResponse(
      res,
      { accessToken: newAccessToken },
      'Token refreshed'
    );
  } catch (err) {
    next(err);
  }
};

export const getMySessions = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await User.findById(req.user._id).select(
      '_id organization refreshTokens'
    );
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    const shapeChanged = ensureRefreshTokenSessionShape(user);
    if (shapeChanged) {
      await user.save();
    }

    const currentToken = String(req.cookies?.refreshToken || '').trim();
    const sessions = mapRefreshTokenSessions({
      user,
      currentToken
    });

    return successResponse(
      res,
      {
        sessions,
        total: sessions.length
      },
      'Sessions fetched'
    );
  } catch (err) {
    next(err);
  }
};

export const revokeSession = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const sessionId = String(req.params?.sessionId || '').trim();
    if (!sessionId) {
      throw new AppError('sessionId is required', 400);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    const shapeChanged = ensureRefreshTokenSessionShape(user);
    const currentToken = String(req.cookies?.refreshToken || '').trim();
    const sessionToRevoke = user.refreshTokens.find(
      (entry) => String(entry.sessionId || '').trim() === sessionId
    );

    if (!sessionToRevoke) {
      throw new AppError('Session not found', 404);
    }

    const isCurrentSession =
      Boolean(currentToken) && String(sessionToRevoke.token) === currentToken;

    user.refreshTokens = user.refreshTokens.filter(
      (entry) => String(entry.sessionId || '').trim() !== sessionId
    );

    if (shapeChanged || user.isModified('refreshTokens')) {
      await user.save();
    }

    if (isCurrentSession) {
      clearRefreshCookie(res);
    }

    await logAudit({
      req,
      action: 'REVOKE_SESSION',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: user.organization || null,
      meta: {
        sessionId,
        currentSessionRevoked: isCurrentSession
      }
    });

    return successResponse(
      res,
      {
        sessionId,
        currentSessionTerminated: isCurrentSession
      },
      isCurrentSession
        ? 'Current session revoked. Sign in again.'
        : 'Session revoked'
    );
  } catch (err) {
    next(err);
  }
};

export const logoutOtherSessions = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    const shapeChanged = ensureRefreshTokenSessionShape(user);
    const currentToken = String(req.cookies?.refreshToken || '').trim();
    if (!currentToken) {
      throw new AppError(
        'Current session not identified. Sign in again and retry.',
        400
      );
    }

    const previousCount = user.refreshTokens.length;
    user.refreshTokens = user.refreshTokens.filter(
      (entry) => String(entry.token || '') === currentToken
    );
    const removedCount = Math.max(0, previousCount - user.refreshTokens.length);

    if (shapeChanged || removedCount > 0) {
      await user.save();
    }

    await logAudit({
      req,
      action: 'LOGOUT_OTHER_SESSIONS',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: user.organization || null,
      meta: {
        removedCount
      }
    });

    return successResponse(
      res,
      {
        removedCount
      },
      'Other sessions logged out'
    );
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const cookieToken = req.cookies.refreshToken;
    let user = req.user || null;

    if (!user && cookieToken) {
      try {
        const decoded = verifyRefreshToken(cookieToken);
        user = await User.findById(decoded.id);
      } catch {
        user = null;
      }
    }

    if (user && cookieToken) {
      user.refreshTokens = user.refreshTokens.filter(
        (rt) => rt.token !== cookieToken
      );
      await user.save();
    }

    clearRefreshCookie(res);

    await logAudit({
      req,
      action: 'LOGOUT',
      resource: 'AUTH',
      resourceId: user?._id || req.user?._id,
      organizationId: user?.organization || req.user?.organization || null
    });

    return successResponse(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

export const register = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const normalizedPassword = String(req.body?.password || '').trim();
    const normalizedConfirmPassword = String(
      req.body?.confirmPassword || ''
    ).trim();
    const normalizedOrganizationName = String(
      req.body?.organizationName || req.body?.companyName || ''
    ).trim();

    if (!normalizedEmail || !normalizedPassword || !normalizedConfirmPassword) {
      throw new AppError(
        'Email, password, and confirmPassword are required',
        400
      );
    }

    if (normalizedPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      throw new AppError('Password and confirmPassword do not match', 400);
    }

    if (!normalizedOrganizationName) {
      throw new AppError('organizationName is required', 400);
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError('Email already exists', 409);
    }

    let organization = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        organization = await Organization.create({
          name: normalizedOrganizationName,
          code: buildOrganizationCode(normalizedOrganizationName, attempt)
        });
        break;
      } catch (error) {
        if (error?.code === 11000) {
          continue;
        }
        throw error;
      }
    }

    if (!organization) {
      throw new AppError(
        'Unable to create organization. Please try again.',
        500
      );
    }

    const verificationRequired = isEmailVerificationRequired();

    const user = await User.create({
      email: normalizedEmail,
      password: normalizedPassword,
      role: 'admin',
      organization: organization._id,
      isVerified: !verificationRequired,
      isActive: true
    });

    let verificationToken = null;
    if (verificationRequired) {
      verificationToken = generateRawToken();
      user.emailVerificationToken = hashToken(verificationToken);
      user.emailVerificationExpiresAt = new Date(
        Date.now() + EMAIL_VERIFICATION_TTL_MS
      );
    }

    let accessToken = null;
    if (!verificationRequired) {
      accessToken = generateAccessToken(user);
      const { refreshToken } = appendRefreshToken(
        user,
        buildSessionMetadata(req)
      );
      setRefreshCookie(res, refreshToken);
    }

    await user.save();

    await logAudit({
      req,
      action: 'REGISTER',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: organization._id,
      meta: {
        organizationName: organization.name,
        organizationCode: organization.code,
        verificationRequired
      }
    });

    const responseData = {
      accessToken,
      verificationRequired,
      user: buildAuthUser(
        user,
        buildOrganizationPayload({
          _id: organization._id,
          name: organization.name,
          code: organization.code
        })
      ),
      organization: {
        _id: organization._id,
        name: organization.name,
        code: organization.code
      }
    };

    if (verificationRequired && verificationToken) {
      Object.assign(responseData, buildTokenDebugData(verificationToken));
    }

    return successResponse(
      res,
      responseData,
      verificationRequired
        ? 'Account created. Verify email before signing in.'
        : 'Account created successfully',
      201
    );
  } catch (err) {
    next(err);
  }
};

export const requestEmailVerification = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);

    if (!normalizedEmail) {
      throw new AppError('Email is required', 400);
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailVerificationToken +emailVerificationExpiresAt'
    );

    if (!user) {
      return successResponse(
        res,
        null,
        'If the account exists, a verification code has been generated.'
      );
    }

    if (user.isVerified) {
      return successResponse(res, null, 'Email is already verified.');
    }

    const verificationToken = generateRawToken();
    user.emailVerificationToken = hashToken(verificationToken);
    user.emailVerificationExpiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_TTL_MS
    );
    await user.save();

    return successResponse(
      res,
      {
        email: normalizedEmail,
        ...buildTokenDebugData(verificationToken)
      },
      'Verification code generated.'
    );
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const token = String(req.body?.token || '').trim();

    if (!normalizedEmail || !token) {
      throw new AppError('Email and token are required', 400);
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailVerificationToken +emailVerificationExpiresAt'
    );

    if (!user) {
      throw new AppError('Invalid verification request', 400);
    }

    if (user.isVerified) {
      return successResponse(res, null, 'Email already verified');
    }

    if (!user.emailVerificationToken || !user.emailVerificationExpiresAt) {
      throw new AppError('No active email verification token', 400);
    }

    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new AppError('Verification token expired', 400);
    }

    if (hashToken(token) !== user.emailVerificationToken) {
      throw new AppError('Invalid verification token', 400);
    }

    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    return successResponse(res, null, 'Email verified successfully');
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);

    if (!normalizedEmail) {
      throw new AppError('Email is required', 400);
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordResetToken +passwordResetExpiresAt'
    );

    if (!user) {
      return successResponse(
        res,
        null,
        'If the account exists, a reset token has been generated.'
      );
    }

    const resetToken = generateRawToken();
    user.passwordResetToken = hashToken(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await user.save();

    return successResponse(
      res,
      {
        email: normalizedEmail,
        ...buildTokenDebugData(resetToken)
      },
      'Password reset token generated.'
    );
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const token = String(req.body?.token || '').trim();
    const normalizedPassword = String(req.body?.password || '').trim();
    const normalizedConfirmPassword = String(
      req.body?.confirmPassword || ''
    ).trim();

    if (
      !normalizedEmail ||
      !token ||
      !normalizedPassword ||
      !normalizedConfirmPassword
    ) {
      throw new AppError(
        'Email, token, password, and confirmPassword are required',
        400
      );
    }

    if (normalizedPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      throw new AppError('Password and confirmPassword do not match', 400);
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordResetToken +passwordResetExpiresAt'
    );

    if (!user) {
      throw new AppError('Invalid password reset request', 400);
    }

    if (!user.passwordResetToken || !user.passwordResetExpiresAt) {
      throw new AppError('No active password reset token', 400);
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new AppError('Password reset token expired', 400);
    }

    if (hashToken(token) !== user.passwordResetToken) {
      throw new AppError('Invalid password reset token', 400);
    }

    user.password = normalizedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    user.refreshTokens = [];
    await user.save();

    return successResponse(res, null, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};
