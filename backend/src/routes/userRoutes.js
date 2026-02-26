import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';
import validateRequest from '../middlewares/validateRequest.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import {
  listOrganizationUsers,
  updateOrganizationUserStatus,
  listOrganizationOnlineUsers,
  createOrganizationInvite,
  listOrganizationInvites,
  revokeOrganizationInvite
} from '../controllers/userManagementController.js';
import {
  updateUserStatusValidator,
  createInviteValidator,
  inviteIdParamValidator
} from '../validations/userManagementValidators.js';
import {
  createUserInviteLimiter,
  revokeUserInviteLimiter,
  updateUserStatusLimiter
} from '../middlewares/rateLimiter.js';

const router = express.Router();

router.use(protect, requireOrganization, requireRoles('owner', 'admin'));

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
  '/:id/status',
  updateUserStatusLimiter,
  updateUserStatusValidator,
  validateRequest,
  updateOrganizationUserStatus
);

export default router;
