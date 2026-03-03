import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import EmployeeInvite from '../models/EmployeeInvite.js';
import RolePermissionPolicy from '../models/RolePermissionPolicy.js';
import { getTestDbUri } from './testDbUri.js';

const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;

beforeAll(async () => {
  process.env.AUTH_TEST_BYPASS = 'false';

  if (!process.env.JWT_ACCESS_SECRET) {
    process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    EmployeeInvite.deleteMany({}),
    RolePermissionPolicy.deleteMany({}),
    User.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
  await mongoose.connection.close();
});

describe('user management api', () => {
  it('lists organization users and updates active status', async () => {
    const adminEmail = 'org-admin@example.com';
    const adminPassword = 'Password123!';

    const registerResponse = await request(app).post('/auth/register').send({
      email: adminEmail,
      password: adminPassword,
      confirmPassword: adminPassword,
      organizationName: 'Org Manage'
    });

    expect(registerResponse.status).toBe(201);
    const organizationId = registerResponse.body?.data?.organization?._id;
    const adminId = registerResponse.body?.data?.user?._id;

    const staff = await User.create({
      email: 'staff-user@example.com',
      password: 'Password123!',
      role: 'staff',
      organization: organizationId,
      isVerified: true
    });

    const loginResponse = await request(app).post('/auth/login').send({
      email: adminEmail,
      password: adminPassword
    });
    const accessToken = loginResponse.body?.data?.accessToken;

    const listResponse = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body?.success).toBe(true);
    expect(Array.isArray(listResponse.body?.data)).toBe(true);
    expect(
      listResponse.body?.data.some((user) => user.email === adminEmail)
    ).toBe(true);
    expect(
      listResponse.body?.data.some((user) => user.email === staff.email)
    ).toBe(true);

    const deactivateResponse = await request(app)
      .patch(`/api/users/${staff._id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isActive: false });

    expect(deactivateResponse.status).toBe(200);
    expect(deactivateResponse.body?.success).toBe(true);
    expect(deactivateResponse.body?.data?.isActive).toBe(false);

    const selfDeactivateResponse = await request(app)
      .patch(`/api/users/${adminId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isActive: false });

    expect(selfDeactivateResponse.status).toBe(400);
    expect(selfDeactivateResponse.body?.success).toBe(false);
  });

  it('creates, lists, and revokes organization invites', async () => {
    const adminEmail = 'invite-admin@example.com';
    const adminPassword = 'Password123!';

    const registerResponse = await request(app).post('/auth/register').send({
      email: adminEmail,
      password: adminPassword,
      confirmPassword: adminPassword,
      organizationName: 'Invite Org'
    });
    expect(registerResponse.status).toBe(201);

    const accessToken = registerResponse.body?.data?.accessToken;

    const createInviteResponse = await request(app)
      .post('/api/users/invites')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'employee-invite@example.com',
        expiresInHours: 24
      });

    expect(createInviteResponse.status).toBe(201);
    expect(createInviteResponse.body?.data?.inviteCode).toBeTruthy();
    expect(createInviteResponse.body?.data?.status).toBe('ACTIVE');

    const listInvitesResponse = await request(app)
      .get('/api/users/invites')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(listInvitesResponse.status).toBe(200);
    expect(Array.isArray(listInvitesResponse.body?.data)).toBe(true);
    expect(
      listInvitesResponse.body?.data.some(
        (invite) => invite.email === 'employee-invite@example.com'
      )
    ).toBe(true);

    const inviteId = createInviteResponse.body?.data?._id;
    const revokeInviteResponse = await request(app)
      .patch(`/api/users/invites/${inviteId}/revoke`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(revokeInviteResponse.status).toBe(200);
    expect(revokeInviteResponse.body?.data?.status).toBe('REVOKED');
  });

  it('rejects invalid user-management payloads and ids', async () => {
    const adminEmail = 'validation-admin@example.com';
    const adminPassword = 'Password123!';

    const registerResponse = await request(app).post('/auth/register').send({
      email: adminEmail,
      password: adminPassword,
      confirmPassword: adminPassword,
      organizationName: 'Validation Org'
    });
    expect(registerResponse.status).toBe(201);

    const accessToken = registerResponse.body?.data?.accessToken;

    const invalidInviteEmailResponse = await request(app)
      .post('/api/users/invites')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'invalid-email'
      });

    expect(invalidInviteEmailResponse.status).toBe(400);
    expect(invalidInviteEmailResponse.body?.success).toBe(false);

    const invalidInviteIdResponse = await request(app)
      .patch('/api/users/invites/not-a-valid-id/revoke')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(invalidInviteIdResponse.status).toBe(400);
    expect(invalidInviteIdResponse.body?.success).toBe(false);

    const invalidUserIdResponse = await request(app)
      .patch('/api/users/not-a-valid-id/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isActive: false });

    expect(invalidUserIdResponse.status).toBe(400);
    expect(invalidUserIdResponse.body?.success).toBe(false);

    const invalidStatusTypeResponse = await request(app)
      .patch(`/api/users/${new mongoose.Types.ObjectId()}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isActive: 'not-boolean' });

    expect(invalidStatusTypeResponse.status).toBe(400);
    expect(invalidStatusTypeResponse.body?.success).toBe(false);
  });

  it('updates user roles and role permission matrix', async () => {
    const adminEmail = 'rbac-admin@example.com';
    const adminPassword = 'Password123!';

    const registerResponse = await request(app).post('/auth/register').send({
      email: adminEmail,
      password: adminPassword,
      confirmPassword: adminPassword,
      organizationName: 'RBAC Org'
    });
    expect(registerResponse.status).toBe(201);

    const organizationId = registerResponse.body?.data?.organization?._id;
    const accessToken = registerResponse.body?.data?.accessToken;

    const staff = await User.create({
      email: 'rbac-staff@example.com',
      password: 'Password123!',
      role: 'staff',
      organization: organizationId,
      isVerified: true
    });

    const matrixResponse = await request(app)
      .get('/api/users/permissions/matrix')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(matrixResponse.status).toBe(200);
    expect(Array.isArray(matrixResponse.body?.data?.catalog)).toBe(true);
    expect(matrixResponse.body?.data?.matrix?.staff).toBeDefined();

    const roleUpdateResponse = await request(app)
      .patch(`/api/users/${staff._id}/role`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'manager' });

    expect(roleUpdateResponse.status).toBe(200);
    expect(roleUpdateResponse.body?.data?.role).toBe('manager');

    const matrixPatchResponse = await request(app)
      .patch('/api/users/permissions/matrix/staff')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        permissions: ['dashboard:view', 'products:view']
      });

    expect(matrixPatchResponse.status).toBe(200);
    expect(matrixPatchResponse.body?.data?.matrix?.staff).toEqual(
      expect.arrayContaining(['dashboard:view', 'products:view'])
    );
    expect(matrixPatchResponse.body?.data?.matrix?.manager).toEqual(
      expect.arrayContaining(['dashboard:view', 'products:view'])
    );
  });
});
