import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { getTestDbUri } from './testDbUri.js';

beforeAll(async () => {
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
  await mongoose.connection.close();
});

describe('auth register', () => {
  it('creates organization and admin account', async () => {
    const response = await request(app).post('/auth/register').send({
      email: 'new-admin@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Northstar Logistics'
    });

    expect(response.status).toBe(201);
    expect(response.body?.success).toBe(true);
    expect(typeof response.body?.data?.accessToken).toBe('string');
    expect(response.body?.data?.user?.email).toBe('new-admin@example.com');
    expect(response.body?.data?.user?.role).toBe('admin');
    expect(response.body?.data?.organization?.name).toBe('Northstar Logistics');
    expect(
      Array.isArray(response.headers['set-cookie']) &&
        response.headers['set-cookie'].some((cookie) =>
          String(cookie).includes('refreshToken=')
        )
    ).toBe(true);

    const savedUser = await User.findOne({
      email: 'new-admin@example.com'
    }).lean();
    expect(savedUser).toBeTruthy();
    expect(savedUser.organization).toBeTruthy();

    const savedOrg = await Organization.findById(savedUser.organization).lean();
    expect(savedOrg).toBeTruthy();
    expect(savedOrg.name).toBe('Northstar Logistics');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/auth/register').send({
      email: 'duplicate@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Acme Supply'
    });

    const duplicateResponse = await request(app).post('/auth/register').send({
      email: 'duplicate@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Acme Supply'
    });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body?.success).toBe(false);
    expect(String(duplicateResponse.body?.message || '')).toContain(
      'Email already exists'
    );
  });

  it('allows login with mixed-case email after signup', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'case-user@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Case Org'
    });

    expect(registerResponse.status).toBe(201);

    const loginResponse = await request(app).post('/auth/login').send({
      email: 'Case-User@Example.com',
      password: 'Password123!'
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body?.success).toBe(true);
    expect(loginResponse.body?.data?.user?.email).toBe('case-user@example.com');
  });

  it('allows login when email contains hidden unicode characters', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'unicode-user@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Unicode Org'
    });

    expect(registerResponse.status).toBe(201);

    // Zero-width space between "unicode" and "-user"
    const loginResponse = await request(app).post('/auth/login').send({
      email: 'unicode\u200B-user@example.com',
      password: 'Password123!'
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body?.success).toBe(true);
    expect(loginResponse.body?.data?.user?.email).toBe(
      'unicode-user@example.com'
    );
  });
});
