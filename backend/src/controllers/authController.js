import crypto from 'node:crypto';

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
  verifyRefreshToken
} from '../utils/token.js';
import { logAudit } from '../utils/auditLogger.js';
import { logger } from '../observability/logger.js';
import { publishEmployeeSignedIn } from '../realtime/publisher.js';
import {
  getRefreshCookieOptions,
  getClearRefreshCookieOptions
} from '../config/envConfig.js';

const MAX_SESSIONS = 5;
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

const appendRefreshToken = (user) => {
  const refreshToken = generateRefreshToken(user);
  user.refreshTokens.push({ token: refreshToken });
  if (user.refreshTokens.length > MAX_SESSIONS) {
    user.refreshTokens = user.refreshTokens.slice(-MAX_SESSIONS);
  }
  return refreshToken;
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', getClearRefreshCookieOptions());
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

const finalizeLogin = async ({ req, res, user, action, meta = null }) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = appendRefreshToken(user);
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

    const tokenExists = user.refreshTokens.some((rt) => rt.token === oldToken);

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

    const newRefreshToken = appendRefreshToken(user);
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
      const refreshToken = appendRefreshToken(user);
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
