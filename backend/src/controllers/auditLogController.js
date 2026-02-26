import AuditLog from '../models/AuditLog.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';

/**
 * 📄 Get audit logs (ADMIN ONLY)
 * Query params:
 *  - page
 *  - limit
 *  - user
 *  - action
 *  - resource
 *  - success
 *  - from
 *  - to
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      user,
      action,
      resource,
      success,
      from,
      to
    } = req.query;

    const query = {
      organization: req.organizationId
    };

    if (user) query.user = user;
    if (action) query.action = action;
    if (resource) query.resource = resource;

    if (success !== undefined) {
      query.success = success === 'true';
    }

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(query)
    ]);

    return successResponse(res, {
      data: logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🔍 Get single audit log by ID (ADMIN ONLY)
 */
export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await AuditLog.findOne({
      _id: req.params.id,
      organization: req.organizationId
    }).populate('user', 'name email role');

    if (!log) {
      throw new AppError('Audit log not found', 404);
    }

    return successResponse(res, log, 'Audit log fetched successfully');
  } catch (err) {
    next(err);
  }
};
