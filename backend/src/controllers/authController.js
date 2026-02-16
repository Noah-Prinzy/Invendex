import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken
} from '../utils/token.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * LOGIN
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token (limit sessions)
    const MAX_SESSIONS = 5;
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
    throw new AppError('Register not implemented yet', 501);
  } catch (err) {
    next(err);
  }
};
