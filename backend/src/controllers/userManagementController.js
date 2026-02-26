import crypto from 'node:crypto';

import User from '../models/User.js';
import EmployeeInvite from '../models/EmployeeInvite.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/auditLogger.js';
import {
  getOnlineUsersByOrganization,
  isRealtimeEnabled
} from '../realtime/socketServer.js';

const DEFAULT_INVITE_TTL_HOURS = 72;
const MIN_INVITE_TTL_HOURS = 1;
const MAX_INVITE_TTL_HOURS = 24 * 30;

const normalizeEmailInput = (value) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();

const buildInviteCode = () =>
  `INV-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;

const hashToken = (token) =>
  crypto
    .createHash('sha256')
    .update(String(token || ''))
    .digest('hex');

const markExpiredInvites = async (organizationId) => {
  await EmployeeInvite.updateMany(
    {
      organization: organizationId,
      status: 'ACTIVE',
      expiresAt: { $lte: new Date() }
    },
    {
      $set: {
        status: 'EXPIRED'
      }
    }
  );
};

export const listOrganizationUsers = async (req, res, next) => {
  try {
    const users = await User.find(
      { organization: req.organizationId },
      {
        email: 1,
        role: 1,
        isActive: 1,
        isVerified: 1,
        createdAt: 1
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, users, 'Organization users fetched');
  } catch (error) {
    next(error);
  }
};

export const updateOrganizationUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    if (typeof isActive !== 'boolean') {
      throw new AppError('isActive must be a boolean', 400);
    }

    if (String(req.user?._id) === String(id) && !isActive) {
      throw new AppError('You cannot deactivate your own account', 400);
    }

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: id,
        organization: req.organizationId
      },
      {
        $set: { isActive }
      },
      {
        new: true,
        runValidators: true,
        select: '_id email role isActive isVerified createdAt organization'
      }
    ).lean();

    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    await logAudit({
      req,
      action: 'UPDATE_USER_STATUS',
      resource: 'USER',
      resourceId: updatedUser._id,
      organizationId: req.organizationId,
      meta: { isActive }
    });

    return successResponse(res, updatedUser, 'User status updated');
  } catch (error) {
    next(error);
  }
};

export const listOrganizationOnlineUsers = async (req, res, next) => {
  try {
    if (!isRealtimeEnabled()) {
      return successResponse(
        res,
        [],
        'Realtime is disabled. No online presence data available.'
      );
    }

    const onlineUsers = getOnlineUsersByOrganization(req.organizationId);
    return successResponse(res, onlineUsers, 'Online users fetched');
  } catch (error) {
    next(error);
  }
};

export const createOrganizationInvite = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const rawExpiresInHours = Number(
      req.body?.expiresInHours || DEFAULT_INVITE_TTL_HOURS
    );
    const expiresInHours = Number.isFinite(rawExpiresInHours)
      ? Math.max(
          MIN_INVITE_TTL_HOURS,
          Math.min(MAX_INVITE_TTL_HOURS, Math.floor(rawExpiresInHours))
        )
      : DEFAULT_INVITE_TTL_HOURS;

    if (req.body?.email && !normalizedEmail) {
      throw new AppError('Invalid invite email', 400);
    }

    const inviteCode = buildInviteCode();
    const invite = await EmployeeInvite.create({
      organization: req.organizationId,
      email: normalizedEmail || null,
      codeHash: hashToken(inviteCode),
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      createdBy: req.user._id
    });

    await logAudit({
      req,
      action: 'CREATE_EMPLOYEE_INVITE',
      resource: 'EMPLOYEE_INVITE',
      resourceId: invite._id,
      organizationId: req.organizationId,
      meta: {
        email: invite.email || null,
        expiresAt: invite.expiresAt
      }
    });

    return successResponse(
      res,
      {
        _id: invite._id,
        inviteCode,
        email: invite.email || null,
        status: invite.status,
        expiresAt: invite.expiresAt
      },
      'Employee invite created',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const listOrganizationInvites = async (req, res, next) => {
  try {
    await markExpiredInvites(req.organizationId);

    const invites = await EmployeeInvite.find(
      { organization: req.organizationId },
      {
        email: 1,
        status: 1,
        expiresAt: 1,
        createdBy: 1,
        usedBy: 1,
        usedAt: 1,
        revokedAt: 1,
        createdAt: 1
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, invites, 'Organization invites fetched');
  } catch (error) {
    next(error);
  }
};

export const revokeOrganizationInvite = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invite = await EmployeeInvite.findOneAndUpdate(
      {
        _id: id,
        organization: req.organizationId,
        status: 'ACTIVE'
      },
      {
        $set: {
          status: 'REVOKED',
          revokedAt: new Date()
        }
      },
      {
        new: true,
        runValidators: true,
        select: '_id email status expiresAt revokedAt createdAt'
      }
    ).lean();

    if (!invite) {
      throw new AppError('Active invite not found', 404);
    }

    await logAudit({
      req,
      action: 'REVOKE_EMPLOYEE_INVITE',
      resource: 'EMPLOYEE_INVITE',
      resourceId: invite._id,
      organizationId: req.organizationId
    });

    return successResponse(res, invite, 'Invite revoked');
  } catch (error) {
    next(error);
  }
};

export default {
  listOrganizationUsers,
  updateOrganizationUserStatus,
  listOrganizationOnlineUsers,
  createOrganizationInvite,
  listOrganizationInvites,
  revokeOrganizationInvite
};
