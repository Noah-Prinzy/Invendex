import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { getTestDbUri } from './testDbUri.js';

const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;

const registerAdmin = async ({
  email = 'compliance-admin@example.com',
  password = 'Password123!',
  organizationName = 'Compliance Org'
} = {}) => {
  const registerResponse = await request(app).post('/auth/register').send({
    email,
    password,
    confirmPassword: password,
    organizationName
  });

  return {
    registerResponse,
    accessToken: registerResponse.body?.data?.accessToken || '',
    organization: registerResponse.body?.data?.organization || null,
    email,
    password
  };
};

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
  await Promise.all([User.deleteMany({}), Organization.deleteMany({})]);
});

afterAll(async () => {
  process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
  await mongoose.connection.close();
});

describe('compliance api', () => {
  it('exports organization-scoped data as JSON payload', async () => {
    const { registerResponse, accessToken, organization } = await registerAdmin(
      {
        email: 'compliance-export@example.com',
        organizationName: 'Compliance Export Org'
      }
    );

    expect(registerResponse.status).toBe(201);
    expect(typeof accessToken).toBe('string');

    const exportResponse = await request(app)
      .get('/api/compliance/export?includeAudit=false&limit=200')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(exportResponse.status).toBe(200);
    expect(exportResponse.body?.success).toBe(true);
    expect(exportResponse.body?.data?.organization?._id).toBe(
      organization?._id
    );
    expect(
      exportResponse.body?.data?.datasets?.users?.total
    ).toBeGreaterThanOrEqual(1);
    expect(exportResponse.body?.data?.datasets?.products).toBeTruthy();
  });

  it('deactivates the current account after password confirmation', async () => {
    const { registerResponse, accessToken, email, password } =
      await registerAdmin({
        email: 'compliance-account-delete@example.com',
        organizationName: 'Compliance Account Org'
      });
    expect(registerResponse.status).toBe(201);

    const deleteResponse = await request(app)
      .post('/api/compliance/delete-account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: password,
        confirmationText: 'DELETE MY ACCOUNT'
      });

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body?.success).toBe(true);

    const userAfterDelete = await User.findOne({ email }).lean();
    expect(userAfterDelete?.isActive).toBe(false);
    expect(Array.isArray(userAfterDelete?.refreshTokens)).toBe(true);
    expect(userAfterDelete?.refreshTokens?.length).toBe(0);

    const loginAfterDelete = await request(app).post('/auth/login').send({
      email,
      password
    });
    expect(loginAfterDelete.status).toBe(403);
    expect(String(loginAfterDelete.body?.message || '')).toContain(
      'Account is deactivated'
    );
  });

  it('deactivates an organization when confirmation text matches organization code', async () => {
    const { registerResponse, accessToken, password, organization } =
      await registerAdmin({
        email: 'compliance-org-delete@example.com',
        organizationName: 'Compliance Org Delete Org'
      });
    expect(registerResponse.status).toBe(201);

    const invalidConfirmationResponse = await request(app)
      .post('/api/compliance/delete-organization')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: password,
        confirmationText: 'DELETE WRONG-CODE'
      });

    expect(invalidConfirmationResponse.status).toBe(400);

    const deleteOrganizationResponse = await request(app)
      .post('/api/compliance/delete-organization')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: password,
        confirmationText: `DELETE ${organization?.code}`
      });

    expect(deleteOrganizationResponse.status).toBe(200);
    expect(deleteOrganizationResponse.body?.success).toBe(true);
    expect(deleteOrganizationResponse.body?.data?.organizationCode).toBe(
      organization?.code
    );

    const orgAfterDelete = await Organization.findById(
      organization?._id
    ).lean();
    expect(orgAfterDelete?.isActive).toBe(false);

    const usersAfterDelete = await User.find({
      organization: organization?._id
    }).lean();
    expect(usersAfterDelete.length).toBeGreaterThanOrEqual(1);
    for (const member of usersAfterDelete) {
      expect(member.isActive).toBe(false);
    }
  });
});
