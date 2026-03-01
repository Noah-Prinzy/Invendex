import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { computeTotp } from '../utils/totp.js';
import { getTestDbUri } from './testDbUri.js';

const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;

const registerUser = async ({
  email = 'twofactor-user@example.com',
  password = 'Password123!',
  organizationName = 'Two Factor Org'
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
    email,
    password
  };
};

const setupAndEnableTwoFactor = async ({ accessToken, password }) => {
  const setupResponse = await request(app)
    .post('/auth/2fa/setup')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      currentPassword: password
    });

  expect(setupResponse.status).toBe(200);
  expect(setupResponse.body?.success).toBe(true);
  expect(typeof setupResponse.body?.data?.secret).toBe('string');
  expect(Array.isArray(setupResponse.body?.data?.recoveryCodes)).toBe(true);
  expect(setupResponse.body?.data?.recoveryCodes?.length).toBeGreaterThan(0);

  const secret = setupResponse.body.data.secret;
  const oneTimeCode = computeTotp({ base32Secret: secret });
  const recoveryCode = setupResponse.body.data.recoveryCodes[0];

  const enableResponse = await request(app)
    .post('/auth/2fa/enable')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      currentPassword: password,
      code: oneTimeCode
    });

  expect(enableResponse.status).toBe(200);
  expect(enableResponse.body?.success).toBe(true);
  expect(enableResponse.body?.data?.enabled).toBe(true);

  return {
    secret,
    recoveryCode
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

describe('auth 2fa lifecycle', () => {
  it('requires second factor on login and completes login after code verification', async () => {
    const { registerResponse, accessToken, email, password } =
      await registerUser({
        email: 'twofactor-code@example.com',
        organizationName: 'Two Factor Code Org'
      });

    expect(registerResponse.status).toBe(201);
    expect(typeof accessToken).toBe('string');

    const { secret } = await setupAndEnableTwoFactor({
      accessToken,
      password
    });

    const firstFactorLogin = await request(app).post('/auth/login').send({
      email,
      password
    });

    expect(firstFactorLogin.status).toBe(200);
    expect(firstFactorLogin.body?.success).toBe(true);
    expect(firstFactorLogin.body?.data?.requiresTwoFactor).toBe(true);
    expect(typeof firstFactorLogin.body?.data?.twoFactorToken).toBe('string');

    const verifyLoginResponse = await request(app)
      .post('/auth/2fa/verify-login')
      .send({
        twoFactorToken: firstFactorLogin.body.data.twoFactorToken,
        code: computeTotp({ base32Secret: secret })
      });

    expect(verifyLoginResponse.status).toBe(200);
    expect(verifyLoginResponse.body?.success).toBe(true);
    expect(typeof verifyLoginResponse.body?.data?.accessToken).toBe('string');
    expect(verifyLoginResponse.body?.data?.user?.twoFactorEnabled).toBe(true);
  });

  it('allows one-time recovery code login and rejects reused recovery code', async () => {
    const { registerResponse, accessToken, email, password } =
      await registerUser({
        email: 'twofactor-recovery@example.com',
        organizationName: 'Two Factor Recovery Org'
      });

    expect(registerResponse.status).toBe(201);
    expect(typeof accessToken).toBe('string');

    const { recoveryCode } = await setupAndEnableTwoFactor({
      accessToken,
      password
    });

    const firstChallenge = await request(app).post('/auth/login').send({
      email,
      password
    });
    expect(firstChallenge.status).toBe(200);
    expect(firstChallenge.body?.data?.requiresTwoFactor).toBe(true);

    const recoveryLogin = await request(app)
      .post('/auth/2fa/verify-login')
      .send({
        twoFactorToken: firstChallenge.body.data.twoFactorToken,
        recoveryCode
      });

    expect(recoveryLogin.status).toBe(200);
    expect(recoveryLogin.body?.success).toBe(true);

    const secondChallenge = await request(app).post('/auth/login').send({
      email,
      password
    });
    expect(secondChallenge.status).toBe(200);
    expect(secondChallenge.body?.data?.requiresTwoFactor).toBe(true);

    const reusedRecoveryCodeResponse = await request(app)
      .post('/auth/2fa/verify-login')
      .send({
        twoFactorToken: secondChallenge.body.data.twoFactorToken,
        recoveryCode
      });

    expect(reusedRecoveryCodeResponse.status).toBe(401);
    expect(reusedRecoveryCodeResponse.body?.success).toBe(false);
    expect(String(reusedRecoveryCodeResponse.body?.message || '')).toContain(
      'Invalid two-factor code'
    );
  });
});
