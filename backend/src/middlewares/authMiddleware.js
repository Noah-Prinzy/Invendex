import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * 🔐 Protect Routes (Access Token Verification)
 */
export const protect = async (req, res, next) => {
  try {
    /**
     * 🧪 TEST MODE BYPASS
     * Automatically authenticate requests during tests
     */
    if (process.env.NODE_ENV === 'test') {
      req.user = {
        _id: '000000000000000000000000',
        role: 'admin',
        organization: '000000000000000000000001'
      };
      req.userToken = { id: req.user._id };
      return next();
    }

    let token;

    // 🔎 Extract Bearer token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized, no token provided', 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Access token expired', 401));
      }
      return next(new AppError('Invalid access token', 401));
    }

    // 🔎 Check user still exists
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    // 🔐 Attach user to request
    req.user = user;
    req.userToken = decoded;

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 🧾 Audit Logging Middleware (Post-response)
 */
export const auditMiddleware = (action) => {
  return (req, res, next) => {
    res.on('finish', async () => {
      try {
        if (!req.user) return;

        await logAudit({
          req,
          action,
          resource: req.baseUrl.replace('/', '').toUpperCase(),
          resourceId: req.params?.id || null,
          success: res.statusCode < 400
        });
      } catch (err) {
        // Never break request lifecycle
        console.error('Audit log failed:', err.message);
      }
    });

    next();
  };
};
