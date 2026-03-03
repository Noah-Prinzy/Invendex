import crypto from 'node:crypto';

import User from '../models/User.js';
import EmployeeInvite from '../models/EmployeeInvite.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import Organization from '../models/Organization.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/auditLogger.js';
import { ROLES } from '../authorization/permissions.js';
import {
  getPermissionCatalog,
  getRolePermissionMatrixForOrganization,
  updateRolePermissionsForOrganization
} from '../authorization/permissionPolicyService.js';
import {
  getOnlineUsersByOrganization,
  isRealtimeEnabled
} from '../realtime/socketServer.js';
import { queueEmailNotification } from '../services/notifications/emailJobService.js';

const DEFAULT_INVITE_TTL_HOURS = 72;
const MIN_INVITE_TTL_HOURS = 1;
const MAX_INVITE_TTL_HOURS = 24 * 30;
const MUTABLE_ROLES = new Set([ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN]);
const TOP_MANAGEMENT_ROLES = new Set([ROLES.OWNER, ROLES.ADMIN]);

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

export const updateOrganizationUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const nextRole = String(req.body?.role || '')
      .trim()
      .toLowerCase();

    if (!MUTABLE_ROLES.has(nextRole) && nextRole !== ROLES.OWNER) {
      throw new AppError('Invalid role value', 400);
    }

    const actorRole = String(req.user?.role || '').toLowerCase();
    const actorIsOwner = actorRole === ROLES.OWNER;

    if (nextRole === ROLES.OWNER && !actorIsOwner) {
      throw new AppError('Only organization owner can assign owner role', 403);
    }

    const targetUser = await User.findOne({
      _id: id,
      organization: req.organizationId
    }).select('_id role email organization isActive isVerified createdAt');

    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    const currentTargetRole = String(targetUser.role || '').toLowerCase();
    if (currentTargetRole === ROLES.OWNER && !actorIsOwner) {
      throw new AppError(
        'Only organization owner can modify owner account',
        403
      );
    }

    if (
      String(req.user?._id || '') === String(targetUser._id || '') &&
      actorRole !== nextRole
    ) {
      throw new AppError('You cannot change your own role', 400);
    }

    if (!actorIsOwner && !TOP_MANAGEMENT_ROLES.has(actorRole)) {
      throw new AppError('Only admin/owner can change user roles', 403);
    }

    targetUser.role = nextRole;
    await targetUser.save();

    await logAudit({
      req,
      action: 'UPDATE_USER_ROLE',
      resource: 'USER',
      resourceId: targetUser._id,
      organizationId: req.organizationId,
      meta: {
        previousRole: currentTargetRole,
        role: nextRole
      }
    });

    return successResponse(res, targetUser.toObject(), 'User role updated');
  } catch (error) {
    next(error);
  }
};

export const getOrganizationRolePermissionMatrix = async (req, res, next) => {
  try {
    const matrix = await getRolePermissionMatrixForOrganization(
      req.organizationId
    );

    return successResponse(
      res,
      {
        catalog: getPermissionCatalog(),
        matrix
      },
      'Role permission matrix fetched'
    );
  } catch (error) {
    next(error);
  }
};

export const updateOrganizationRolePermissionMatrix = async (
  req,
  res,
  next
) => {
  try {
    const role = String(req.params?.role || '')
      .trim()
      .toLowerCase();
    const permissions = Array.isArray(req.body?.permissions)
      ? req.body.permissions
      : [];

    const updatedMatrix = await updateRolePermissionsForOrganization({
      organizationId: req.organizationId,
      role,
      permissions,
      updatedBy: req.user?._id || null
    });

    await logAudit({
      req,
      action: 'UPDATE_ROLE_PERMISSION_MATRIX',
      resource: 'ROLE_PERMISSION_POLICY',
      resourceId: req.organizationId,
      organizationId: req.organizationId,
      meta: {
        role,
        permissionCount: permissions.length
      }
    });

    return successResponse(
      res,
      {
        catalog: getPermissionCatalog(),
        matrix: updatedMatrix
      },
      'Role permission matrix updated'
    );
  } catch (error) {
    if (
      String(error?.message || '').includes('Only staff, manager, or admin')
    ) {
      return next(new AppError(error.message, 400));
    }
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
    const hasExplicitExpiry =
      req.body?.expiresInHours !== undefined &&
      req.body?.expiresInHours !== null;

    let settingsInviteExpiry = DEFAULT_INVITE_TTL_HOURS;
    if (!hasExplicitExpiry) {
      const organizationSettings = await OrganizationSettings.findOne({
        organization: req.organizationId
      })
        .select('userAccess.defaultInviteExpiryHours')
        .lean();
      settingsInviteExpiry = Number(
        organizationSettings?.userAccess?.defaultInviteExpiryHours ||
          DEFAULT_INVITE_TTL_HOURS
      );
    }

    const rawExpiresInHours = Number(
      hasExplicitExpiry ? req.body?.expiresInHours : settingsInviteExpiry
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

    if (invite.email) {
      const organization = await Organization.findById(req.organizationId)
        .select('name code')
        .lean();
      const organizationName = organization?.name || 'your organization';
      const appUrl = String(process.env.APP_WEB_URL || '').trim();
      const inviteMessage = [
        `You have been invited to join ${organizationName} on Ledgerly.`,
        `Invite code: ${inviteCode}`,
        `Expires at: ${new Date(invite.expiresAt).toISOString()}`,
        appUrl
          ? `Use the employee sign-in portal at ${appUrl} and enter this code on first login.`
          : 'Use the employee sign-in portal and enter this code on first login.'
      ].join('\n');

      try {
        await queueEmailNotification({
          organizationId: req.organizationId,
          createdBy: req.user?._id || null,
          to: invite.email,
          subject: `${organizationName} employee invite`,
          text: inviteMessage,
          notificationType: 'EMPLOYEE_INVITE',
          metadata: {
            organizationName,
            organizationCode: organization?.code || null,
            expiresAt: invite.expiresAt
          }
        });
      } catch {
        // Invite creation is successful even when email delivery queueing fails.
      }
    }

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
  updateOrganizationUserRole,
  listOrganizationOnlineUsers,
  getOrganizationRolePermissionMatrix,
  updateOrganizationRolePermissionMatrix,
  createOrganizationInvite,
  listOrganizationInvites,
  revokeOrganizationInvite
};
