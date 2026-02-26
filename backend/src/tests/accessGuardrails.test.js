import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import EmployeeInvite from '../models/EmployeeInvite.js';
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
    User.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
  await mongoose.connection.close();
});

const registerAdminAndGetToken = async ({
  email = 'guardrails-admin@example.com',
  password = 'Password123!',
  organizationName = 'Guardrails Org'
} = {}) => {
  const registerResponse = await request(app).post('/auth/register').send({
    email,
    password,
    confirmPassword: password,
    organizationName
  });

  expect(registerResponse.status).toBe(201);
  return {
    accessToken: registerResponse.body?.data?.accessToken,
    organizationId: registerResponse.body?.data?.organization?._id,
    userId: registerResponse.body?.data?.user?._id
  };
};

describe('access guardrails', () => {
  it('blocks deactivated users on protected endpoints', async () => {
    const { accessToken, userId } = await registerAdminAndGetToken({
      email: 'inactive-admin@example.com'
    });

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          isActive: false
        }
      }
    );

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meResponse.status).toBe(403);
    expect(meResponse.body?.success).toBe(false);
    expect(String(meResponse.body?.message || '').toLowerCase()).toContain(
      'deactivated'
    );
  });

  it('blocks users when organization is inactive', async () => {
    const { accessToken, organizationId } = await registerAdminAndGetToken({
      email: 'inactive-org-admin@example.com',
      organizationName: 'Inactive Organization'
    });

    await Organization.updateOne(
      { _id: organizationId },
      {
        $set: {
          isActive: false
        }
      }
    );

    const usersResponse = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(usersResponse.status).toBe(403);
    expect(usersResponse.body?.success).toBe(false);
    expect(String(usersResponse.body?.message || '').toLowerCase()).toContain(
      'organization'
    );
  });
});
