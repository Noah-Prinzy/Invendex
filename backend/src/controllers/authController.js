import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken
} from '../utils/token.js';
import { logAudit } from '../utils/auditLogger.js';

const MAX_SESSIONS = 5;

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

/**
 * LOGIN
 */
export const login = async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const normalizedPassword = String(req.body?.password || '').trim();

    if (!normalizedEmail || !normalizedPassword) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(normalizedPassword, user.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token (limit sessions)
    user.refreshTokens.push({ token: refreshToken });
    if (user.refreshTokens.length > MAX_SESSIONS) {
      user.refreshTokens = user.refreshTokens.slice(-MAX_SESSIONS);
    }

    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await logAudit({
      req,
      action: 'LOGIN',
      resource: 'AUTH',
      resourceId: user._id
    });

    return successResponse(
      res,
      {
        accessToken,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          organization: user.organization || null
        }
      },
      'Login successful'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET CURRENT USER
 */
export const getMe = async (req, res, next) => {
  try {
    return successResponse(res, req.user, 'User profile fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * REFRESH ACCESS TOKEN (ROTATION + REUSE DETECTION)
 */
export const refreshToken = async (req, res, next) => {
  try {
    const oldToken = req.cookies.refreshToken;
    if (!oldToken) {
      throw new AppError('Refresh token required', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(
        oldToken,
        process.env.JWT_REFRESH_SECRET
      );
    } catch {
      throw new AppError('Invalid refresh token', 403);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('Invalid refresh token', 403);
    }

    const tokenExists = user.refreshTokens.some(
      rt => rt.token === oldToken
    );

    // 🚨 TOKEN REUSE DETECTED
    if (!tokenExists) {
      user.refreshTokens = [];
      await user.save();

      await logAudit({
        req,
        action: 'TOKEN_REUSE_DETECTED',
        resource: 'AUTH',
        resourceId: user._id
      });

      throw new AppError('Session compromised. Please login again.', 403);
    }

    // 🔄 ROTATE TOKEN
    user.refreshTokens = user.refreshTokens.filter(
      rt => rt.token !== oldToken
    );

    const newRefreshToken = generateRefreshToken(user);
    user.refreshTokens.push({ token: newRefreshToken });

    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

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

/**
 * LOGOUT (single session)
 */
export const logout = async (req, res, next) => {
  try {
    const cookieToken = req.cookies.refreshToken;

    if (req.user && cookieToken) {
      req.user.refreshTokens = req.user.refreshTokens.filter(
        rt => rt.token !== cookieToken
      );
      await req.user.save();
    }

    res.clearCookie('refreshToken');

    await logAudit({
      req,
      action: 'LOGOUT',
      resource: 'AUTH',
      resourceId: req.user?._id
    });

    return successResponse(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * REGISTER (INTENTIONALLY DISABLED)
 */
export const register = async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const normalizedPassword = String(req.body?.password || '').trim();
    const normalizedOrganizationName = String(
      req.body?.organizationName || req.body?.companyName || ''
    ).trim();

    if (!normalizedEmail || !normalizedPassword) {
      throw new AppError('Email and password are required', 400);
    }

    if (normalizedPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
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

    const user = await User.create({
      email: normalizedEmail,
      password: normalizedPassword,
      role: 'admin',
      organization: organization._id
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokens.push({ token: refreshToken });
    if (user.refreshTokens.length > MAX_SESSIONS) {
      user.refreshTokens = user.refreshTokens.slice(-MAX_SESSIONS);
    }
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await logAudit({
      req,
      action: 'REGISTER',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: organization._id,
      meta: {
        organizationName: organization.name,
        organizationCode: organization.code
      }
    });

    return successResponse(
      res,
      {
        accessToken,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          organization: organization._id
        },
        organization: {
          _id: organization._id,
          name: organization.name,
          code: organization.code
        }
      },
      'Account created successfully',
      201
    );
  } catch (err) {
    next(err);
  }
};
