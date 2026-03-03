import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import validateRequest from '../middlewares/validateRequest.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import {
  listOrganizationUsers,
  updateOrganizationUserStatus,
  updateOrganizationUserRole,
  listOrganizationOnlineUsers,
  createOrganizationInvite,
  listOrganizationInvites,
  revokeOrganizationInvite,
  getOrganizationRolePermissionMatrix,
  updateOrganizationRolePermissionMatrix
} from '../controllers/userManagementController.js';
import {
  updateUserStatusValidator,
  updateUserRoleValidator,
  createInviteValidator,
  inviteIdParamValidator,
  updateRolePermissionMatrixValidator
} from '../validations/userManagementValidators.js';
import {
  createUserInviteLimiter,
  revokeUserInviteLimiter,
  updateUserStatusLimiter
} from '../middlewares/rateLimiter.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.USERS_MANAGE)
);

router.get(
  '/',
  auditMiddleware({
    action: 'LIST_ORGANIZATION_USERS',
    resource: 'USER'
  }),
  listOrganizationUsers
);
router.get(
  '/online',
  auditMiddleware({
    action: 'LIST_ORGANIZATION_ONLINE_USERS',
    resource: 'USER'
  }),
  listOrganizationOnlineUsers
);
router.get(
  '/permissions/matrix',
  auditMiddleware({
    action: 'LIST_ROLE_PERMISSION_MATRIX',
    resource: 'ROLE_PERMISSION_POLICY'
  }),
  getOrganizationRolePermissionMatrix
);
router.patch(
  '/permissions/matrix/:role',
  updateUserStatusLimiter,
  updateRolePermissionMatrixValidator,
  validateRequest,
  updateOrganizationRolePermissionMatrix
);
router.get(
  '/invites',
  auditMiddleware({
    action: 'LIST_ORGANIZATION_INVITES',
    resource: 'EMPLOYEE_INVITE'
  }),
  listOrganizationInvites
);
router.post(
  '/invites',
  createUserInviteLimiter,
  createInviteValidator,
  validateRequest,
  createOrganizationInvite
);
router.patch(
  '/invites/:id/revoke',
  revokeUserInviteLimiter,
  inviteIdParamValidator,
  validateRequest,
  revokeOrganizationInvite
);
router.patch(
  '/:id/role',
  updateUserStatusLimiter,
  updateUserRoleValidator,
  validateRequest,
  updateOrganizationUserRole
);
router.patch(
  '/:id/status',
  updateUserStatusLimiter,
  updateUserStatusValidator,
  validateRequest,
  updateOrganizationUserStatus
);

export default router;
