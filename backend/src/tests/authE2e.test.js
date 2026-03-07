import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import BackgroundJob, {
  BACKGROUND_JOB_STATUSES,
  BACKGROUND_JOB_TYPES
} from '../models/BackgroundJob.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import EmployeeInvite from '../models/EmployeeInvite.js';
import EmployeeSignupRequest from '../models/EmployeeSignupRequest.js';
import { getTestDbUri } from './testDbUri.js';

const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;
const originalEmailNotificationsEnabled =
  process.env.EMAIL_NOTIFICATIONS_ENABLED;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForEmailJobsByTypeToSettle = async ({
  notificationType,
  expectedCount = 1,
  maxAttempts = 50,
  delayMs = 25
}) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const jobs = await BackgroundJob.find({
      type: BACKGROUND_JOB_TYPES.EMAIL_NOTIFICATION,
      'payload.notificationType': notificationType
    })
      .sort({ createdAt: 1 })
      .lean();

    if (
      jobs.length >= expectedCount &&
      jobs.every(({ status }) =>
        [
          BACKGROUND_JOB_STATUSES.COMPLETED,
          BACKGROUND_JOB_STATUSES.FAILED
        ].includes(status)
      )
    ) {
      return jobs;
    }

    await sleep(delayMs);
  }

  return BackgroundJob.find({
    type: BACKGROUND_JOB_TYPES.EMAIL_NOTIFICATION,
    'payload.notificationType': notificationType
  })
    .sort({ createdAt: 1 })
    .lean();
};

beforeAll(async () => {
  process.env.AUTH_TEST_BYPASS = 'false';
  process.env.EMAIL_NOTIFICATIONS_ENABLED = 'false';

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
    BackgroundJob.deleteMany({}),
    EmployeeInvite.deleteMany({}),
    EmployeeSignupRequest.deleteMany({}),
    User.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
  process.env.EMAIL_NOTIFICATIONS_ENABLED = originalEmailNotificationsEnabled;
  await mongoose.connection.close();
});

describe('auth e2e', () => {
  it('registers, logs in, fetches profile, and logs out', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'e2e-auth@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'E2E Org'
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body?.success).toBe(true);

    const loginResponse = await request(app).post('/auth/login').send({
      email: 'e2e-auth@example.com',
      password: 'Password123!'
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body?.success).toBe(true);
    expect(typeof loginResponse.body?.data?.accessToken).toBe('string');
    expect(loginResponse.body?.data?.user?.email).toBe('e2e-auth@example.com');

    const accessToken = loginResponse.body.data.accessToken;
    const loginCookies = loginResponse.headers['set-cookie'] || [];
    expect(loginCookies.length).toBeGreaterThan(0);

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body?.success).toBe(true);
    expect(meResponse.body?.data?.email).toBe('e2e-auth@example.com');

    const observabilityPingResponse = await request(app)
      .get('/api/observability/ping')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-client-trace-id', 'frontend-trace-e2e');

    expect(observabilityPingResponse.status).toBe(200);
    expect(observabilityPingResponse.body?.success).toBe(true);
    expect(observabilityPingResponse.body?.data?.status).toBe('ok');
    expect(observabilityPingResponse.body?.data?.trace?.requestId).toBeTruthy();
    expect(observabilityPingResponse.body?.data?.trace?.clientTraceId).toBe(
      'frontend-trace-e2e'
    );

    const logoutResponse = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', loginCookies);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body?.success).toBe(true);
    expect(logoutResponse.body?.message).toBe('Logged out successfully');
  });

  it('lists sessions and supports revoking a specific session', async () => {
    const email = 'session-auth@example.com';
    const password = 'Password123!';

    const registerResponse = await request(app).post('/auth/register').send({
      email,
      password,
      confirmPassword: password,
      organizationName: 'Session Org'
    });
    expect(registerResponse.status).toBe(201);

    const firstLogin = await request(app).post('/auth/login').send({
      email,
      password
    });
    expect(firstLogin.status).toBe(200);

    const secondLogin = await request(app)
      .post('/auth/login')
      .set('x-device-id', 'device_two')
      .send({
        email,
        password
      });
    expect(secondLogin.status).toBe(200);

    const accessToken = secondLogin.body?.data?.accessToken;
    const loginCookies = secondLogin.headers['set-cookie'] || [];
    expect(typeof accessToken).toBe('string');
    expect(loginCookies.length).toBeGreaterThan(0);

    const sessionsResponse = await request(app)
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', loginCookies);

    expect(sessionsResponse.status).toBe(200);
    expect(Array.isArray(sessionsResponse.body?.data?.sessions)).toBe(true);
    expect(Number(sessionsResponse.body?.data?.total || 0)).toBeGreaterThan(0);

    const nonCurrentSession = sessionsResponse.body.data.sessions.find(
      (session) => !session.current
    );
    expect(nonCurrentSession?.sessionId).toBeTruthy();

    const revokeResponse = await request(app)
      .delete(`/auth/sessions/${nonCurrentSession.sessionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', loginCookies);

    expect(revokeResponse.status).toBe(200);
    expect(revokeResponse.body?.success).toBe(true);
    expect(revokeResponse.body?.data?.currentSessionTerminated).toBe(false);

    const [sessionRevokedEmailJob] = await waitForEmailJobsByTypeToSettle({
      notificationType: 'AUTH_SESSION_REVOKED'
    });
    expect(sessionRevokedEmailJob?.payload?.html).toContain(
      'session was removed from your account'
    );
    expect(sessionRevokedEmailJob?.payload?.html).toContain('Session ID');
  });

  it('logs out other sessions and queues a security alert email', async () => {
    const email = 'logout-others@example.com';
    const password = 'Password123!';

    const registerResponse = await request(app).post('/auth/register').send({
      email,
      password,
      confirmPassword: password,
      organizationName: 'Logout Others Org'
    });
    expect(registerResponse.status).toBe(201);

    const firstLogin = await request(app).post('/auth/login').send({
      email,
      password
    });
    expect(firstLogin.status).toBe(200);

    const secondLogin = await request(app)
      .post('/auth/login')
      .set('x-device-id', 'device_keep')
      .send({
        email,
        password
      });
    expect(secondLogin.status).toBe(200);

    const accessToken = secondLogin.body?.data?.accessToken;
    const loginCookies = secondLogin.headers['set-cookie'] || [];
    expect(typeof accessToken).toBe('string');
    expect(loginCookies.length).toBeGreaterThan(0);

    const logoutOthersResponse = await request(app)
      .delete('/auth/sessions/others')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', loginCookies);

    expect(logoutOthersResponse.status).toBe(200);
    expect(logoutOthersResponse.body?.success).toBe(true);
    expect(Number(logoutOthersResponse.body?.data?.removedCount || 0)).toBe(2);

    const [sessionsClearedEmailJob] = await waitForEmailJobsByTypeToSettle({
      notificationType: 'AUTH_SESSIONS_CLEARED'
    });
    expect(sessionsClearedEmailJob?.payload?.html).toContain(
      'Other sessions were signed out'
    );
    expect(sessionsClearedEmailJob?.payload?.html).toContain(
      'Sessions removed'
    );
  });

  it('persists uiTheme preference updates on the authenticated profile', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'theme-auth@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Theme Org'
    });
    expect(registerResponse.status).toBe(201);

    const loginResponse = await request(app).post('/auth/login').send({
      email: 'theme-auth@example.com',
      password: 'Password123!'
    });
    expect(loginResponse.status).toBe(200);

    const accessToken = loginResponse.body?.data?.accessToken;
    expect(typeof accessToken).toBe('string');

    const updateResponse = await request(app)
      .patch('/auth/me/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        uiTheme: 'neon-grid'
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body?.success).toBe(true);
    expect(updateResponse.body?.data?.uiTheme).toBe('neon-grid');

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body?.data?.uiTheme).toBe('neon-grid');

    const invalidThemeResponse = await request(app)
      .patch('/auth/me/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        uiTheme: 'non-existent-theme'
      });

    expect(invalidThemeResponse.status).toBe(400);
  });

  it('supports forgot-password and reset-password flow', async () => {
    const email = 'recover-auth@example.com';
    const initialPassword = 'Password123!';
    const nextPassword = 'Password123!New';

    const registerResponse = await request(app).post('/auth/register').send({
      email,
      password: initialPassword,
      confirmPassword: initialPassword,
      organizationName: 'Recovery Org'
    });

    expect(registerResponse.status).toBe(201);

    const forgotResponse = await request(app)
      .post('/auth/forgot-password')
      .send({
        email
      });

    expect(forgotResponse.status).toBe(200);
    expect(forgotResponse.body?.success).toBe(true);
    expect(typeof forgotResponse.body?.data?.debugToken).toBe('string');

    const [resetEmailJob] = await waitForEmailJobsByTypeToSettle({
      notificationType: 'AUTH_PASSWORD_RESET'
    });
    expect(resetEmailJob?.payload?.html).toContain('Reset your password');
    expect(resetEmailJob?.payload?.html).toContain('Password reset token');

    const resetResponse = await request(app).post('/auth/reset-password').send({
      email,
      token: forgotResponse.body.data.debugToken,
      password: nextPassword,
      confirmPassword: nextPassword
    });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body?.success).toBe(true);

    const [passwordChangedEmailJob] = await waitForEmailJobsByTypeToSettle({
      notificationType: 'AUTH_PASSWORD_CHANGED'
    });
    expect(passwordChangedEmailJob?.payload?.html).toContain(
      'Your password was changed'
    );
    expect(passwordChangedEmailJob?.payload?.html).toContain('Changed at');

    const oldLoginResponse = await request(app).post('/auth/login').send({
      email,
      password: initialPassword
    });
    expect(oldLoginResponse.status).toBe(401);

    const newLoginResponse = await request(app).post('/auth/login').send({
      email,
      password: nextPassword
    });
    expect(newLoginResponse.status).toBe(200);
    expect(newLoginResponse.body?.success).toBe(true);
  });

  it('enforces optional email verification when enabled', async () => {
    process.env.AUTH_REQUIRE_EMAIL_VERIFICATION = 'true';

    try {
      const email = 'verify-auth@example.com';
      const password = 'Password123!';

      const registerResponse = await request(app).post('/auth/register').send({
        email,
        password,
        confirmPassword: password,
        organizationName: 'Verification Org'
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body?.data?.verificationRequired).toBe(true);

      const [registrationVerificationJob] =
        await waitForEmailJobsByTypeToSettle({
          notificationType: 'AUTH_EMAIL_VERIFICATION',
          expectedCount: 1
        });
      expect(registrationVerificationJob?.payload?.html).toContain(
        'Verify your account'
      );
      expect(registrationVerificationJob?.payload?.html).toContain(
        'Verification token'
      );

      const loginBeforeVerify = await request(app).post('/auth/login').send({
        email,
        password
      });
      expect(loginBeforeVerify.status).toBe(403);

      const verificationTokenResponse = await request(app)
        .post('/auth/verify-email/request')
        .send({ email });
      expect(verificationTokenResponse.status).toBe(200);
      expect(typeof verificationTokenResponse.body?.data?.debugToken).toBe(
        'string'
      );

      const verificationJobs = await waitForEmailJobsByTypeToSettle({
        notificationType: 'AUTH_EMAIL_VERIFICATION',
        expectedCount: 2
      });
      expect(verificationJobs.at(-1)?.payload?.html).toContain(
        'Verify your account'
      );
      expect(verificationJobs.at(-1)?.payload?.html).toContain(
        'Verification token'
      );

      const verifyResponse = await request(app)
        .post('/auth/verify-email')
        .send({
          email,
          token: verificationTokenResponse.body.data.debugToken
        });
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body?.success).toBe(true);

      const loginAfterVerify = await request(app).post('/auth/login').send({
        email,
        password
      });
      expect(loginAfterVerify.status).toBe(200);
      expect(loginAfterVerify.body?.success).toBe(true);
    } finally {
      process.env.AUTH_REQUIRE_EMAIL_VERIFICATION = 'false';
    }
  });

  it('supports employee portal login with company name and auto-provisions staff user', async () => {
    const inviteResponse = await request(app).post('/auth/register').send({
      email: 'org-admin@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Warehouse Heroes'
    });
    expect(inviteResponse.status).toBe(201);

    const organizationId = inviteResponse.body?.data?.organization?._id;
    const adminToken = inviteResponse.body?.data?.accessToken;
    const createInviteResponse = await request(app)
      .post('/api/users/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'employee1@example.com'
      });
    expect(createInviteResponse.status).toBe(201);

    const [inviteEmailJob] = await waitForEmailJobsByTypeToSettle({
      notificationType: 'EMPLOYEE_INVITE'
    });
    expect(inviteEmailJob?.payload?.html).toContain('Inventra invite');
    expect(inviteEmailJob?.payload?.html).toContain(
      createInviteResponse.body?.data?.inviteCode
    );

    const employeeLoginWithoutInvite = await request(app)
      .post('/auth/employee/login')
      .send({
        companyName: 'Warehouse Heroes',
        email: 'employee1@example.com',
        password: 'EmployeePass123!'
      });
    expect(employeeLoginWithoutInvite.status).toBe(403);

    const employeeLoginResponse = await request(app)
      .post('/auth/employee/login')
      .send({
        companyName: 'Warehouse Heroes',
        email: 'employee1@example.com',
        password: 'EmployeePass123!',
        inviteCode: createInviteResponse.body?.data?.inviteCode
      });

    expect(employeeLoginResponse.status).toBe(200);
    expect(employeeLoginResponse.body?.success).toBe(true);
    expect(employeeLoginResponse.body?.data?.user?.role).toBe('staff');

    const repeatEmployeeLoginWithoutInvite = await request(app)
      .post('/auth/employee/login')
      .send({
        companyName: 'Warehouse Heroes',
        email: 'employee1@example.com',
        password: 'EmployeePass123!'
      });
    expect(repeatEmployeeLoginWithoutInvite.status).toBe(200);
    expect(repeatEmployeeLoginWithoutInvite.body?.success).toBe(true);

    const employeeInDb = await User.findOne({
      email: 'employee1@example.com'
    }).lean();
    expect(String(employeeInDb?.organization)).toBe(String(organizationId));
    expect(employeeInDb?.role).toBe('staff');

    const adminRegisterResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'admin1@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        organizationName: 'Admin Org'
      });

    expect(adminRegisterResponse.status).toBe(201);

    const adminUser = await User.findOne({
      email: 'admin1@example.com'
    }).select('+password');
    adminUser.organization = organizationId;
    await adminUser.save();

    const adminLoginFromEmployeePortal = await request(app)
      .post('/auth/employee/login')
      .send({
        companyName: 'Warehouse Heroes',
        email: 'admin1@example.com',
        password: 'Password123!'
      });
    expect(adminLoginFromEmployeePortal.status).toBe(403);

    const staffLoginFromAdminPortal = await request(app)
      .post('/auth/admin/login')
      .send({
        email: 'employee1@example.com',
        password: 'EmployeePass123!'
      });
    expect(staffLoginFromAdminPortal.status).toBe(403);
  });

  it('stores employee signup mobile number and carries it into the approved user', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'admin-mobile@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Mobile Org'
    });

    expect(registerResponse.status).toBe(201);
    const adminToken = registerResponse.body?.data?.accessToken;
    const organizationId = registerResponse.body?.data?.organization?._id;

    const signupResponse = await request(app)
      .post('/auth/employee/signup')
      .send({
        companyName: 'Mobile Org',
        username: 'mobile.staff',
        email: 'mobile.staff@example.com',
        mobileNumber: '+256700000099',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });

    expect(signupResponse.status).toBe(201);

    const signupRequest = await EmployeeSignupRequest.findOne({
      organization: organizationId,
      email: 'mobile.staff@example.com'
    }).lean();
    expect(signupRequest?.mobileNumber).toBe('+256700000099');

    const approveResponse = await request(app)
      .post(`/auth/employee/signup-requests/${signupRequest?._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(approveResponse.status).toBe(200);

    const employee = await User.findOne({
      email: 'mobile.staff@example.com'
    }).lean();
    expect(employee?.mobileNumber).toBe('+256700000099');
  });
});
