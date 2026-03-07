import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import BackgroundJob, {
  BACKGROUND_JOB_STATUSES,
  BACKGROUND_JOB_TYPES
} from '../models/BackgroundJob.js';
import EmployeeInvite from '../models/EmployeeInvite.js';
import EmployeeSignupRequest from '../models/EmployeeSignupRequest.js';
import NotificationEvent from '../models/NotificationEvent.js';
import Organization from '../models/Organization.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import User from '../models/User.js';
import { getTestDbUri } from './testDbUri.js';
import { signEmployeeSignupEmailActionToken } from '../utils/employeeSignupEmailActions.js';

const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;
const originalEmailNotificationsEnabled =
  process.env.EMAIL_NOTIFICATIONS_ENABLED;
const originalAppWebUrl = process.env.APP_WEB_URL;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForEmailJobsToSettle = async ({
  maxAttempts = 40,
  delayMs = 25
} = {}) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const jobs = await BackgroundJob.find({
      type: BACKGROUND_JOB_TYPES.EMAIL_NOTIFICATION
    })
      .select('status')
      .lean();

    if (
      jobs.length > 0 &&
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
    type: BACKGROUND_JOB_TYPES.EMAIL_NOTIFICATION
  })
    .select('status')
    .lean();
};

beforeAll(async () => {
  process.env.AUTH_TEST_BYPASS = 'false';
  process.env.EMAIL_NOTIFICATIONS_ENABLED = 'false';
  process.env.APP_WEB_URL = 'http://localhost:3000';
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET || 'test_access_secret';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    BackgroundJob.deleteMany({}),
    NotificationEvent.deleteMany({}),
    EmployeeInvite.deleteMany({}),
    EmployeeSignupRequest.deleteMany({}),
    OrganizationSettings.deleteMany({}),
    User.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
  process.env.EMAIL_NOTIFICATIONS_ENABLED = originalEmailNotificationsEnabled;
  process.env.APP_WEB_URL = originalAppWebUrl;
  await mongoose.connection.close();
});

describe('employee signup email action links', () => {
  it('approves a pending signup request through a signed email link', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'email-action-admin@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Email Action Org'
    });

    expect(registerResponse.status).toBe(201);

    const organizationId = registerResponse.body?.data?.organization?._id;
    const adminUserId = registerResponse.body?.data?.user?._id;
    expect(organizationId).toBeTruthy();
    expect(adminUserId).toBeTruthy();

    const passwordHash = await bcrypt.hash('EmployeePass123!', 10);
    const signupRequest = await EmployeeSignupRequest.create({
      organization: organizationId,
      email: 'email-action-staff@example.com',
      username: 'email.action.staff',
      mobileNumber: '+256700123456',
      passwordHash,
      requestedByIp: '127.0.0.1',
      requestedByUserAgent: 'jest'
    });

    const token = signEmployeeSignupEmailActionToken({
      organizationId,
      signupRequestId: signupRequest._id,
      reviewerUserId: adminUserId,
      action: 'approve'
    });

    const response = await request(app)
      .get('/auth/employee/signup-requests/review-email')
      .query({ token });

    expect(response.status).toBe(200);
    expect(response.text).toContain('Signup request approved');
    expect(response.text).toContain('email-action-staff@example.com');
    expect(response.text).toContain('Reviewed by');

    const updatedSignupRequest = await EmployeeSignupRequest.findById(
      signupRequest._id
    ).lean();
    expect(updatedSignupRequest?.status).toBe('APPROVED');
    expect(String(updatedSignupRequest?.reviewedBy || '')).toBe(
      String(adminUserId)
    );

    const createdUser = await User.findOne({
      email: 'email-action-staff@example.com'
    }).lean();
    expect(createdUser).toBeTruthy();
    expect(createdUser?.username).toBe('email.action.staff');
    expect(createdUser?.role).toBe('staff');

    const settledJobs = await waitForEmailJobsToSettle();
    expect(settledJobs.length).toBeGreaterThan(0);

    const approvalEmailJob = await BackgroundJob.findOne({
      type: BACKGROUND_JOB_TYPES.EMAIL_NOTIFICATION,
      'payload.notificationType': 'EMPLOYEE_SIGNUP_APPROVED'
    }).lean();
    expect(approvalEmailJob?.payload?.html).toContain('Inventra access');
    expect(approvalEmailJob?.payload?.html).toContain(
      'Your workspace access is ready'
    );
    expect(approvalEmailJob?.payload?.html).toContain('Workspace');
  });

  it('declines a pending signup request through a signed email link', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'email-action-admin-2@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Email Action Org'
    });

    expect(registerResponse.status).toBe(201);

    const organizationId = registerResponse.body?.data?.organization?._id;
    const adminUserId = registerResponse.body?.data?.user?._id;

    const passwordHash = await bcrypt.hash('EmployeePass123!', 10);
    const signupRequest = await EmployeeSignupRequest.create({
      organization: organizationId,
      email: 'email-action-decline@example.com',
      username: 'email.action.decline',
      mobileNumber: '+256700654321',
      passwordHash,
      requestedByIp: '127.0.0.1',
      requestedByUserAgent: 'jest'
    });

    const token = signEmployeeSignupEmailActionToken({
      organizationId,
      signupRequestId: signupRequest._id,
      reviewerUserId: adminUserId,
      action: 'decline'
    });

    const response = await request(app)
      .get('/auth/employee/signup-requests/review-email')
      .query({ token });

    expect(response.status).toBe(200);
    expect(response.text).toContain('Signup request declined');
    expect(response.text).toContain('email-action-decline@example.com');
    expect(response.text).toContain('Reviewed by');

    const updatedSignupRequest = await EmployeeSignupRequest.findById(
      signupRequest._id
    ).lean();
    expect(updatedSignupRequest?.status).toBe('DECLINED');
    expect(String(updatedSignupRequest?.reviewedBy || '')).toBe(
      String(adminUserId)
    );
    expect(updatedSignupRequest?.declineReason).toBe(
      'Declined from signed email review link'
    );

    const createdUser = await User.findOne({
      email: 'email-action-decline@example.com'
    }).lean();
    expect(createdUser).toBeNull();

    const settledJobs = await waitForEmailJobsToSettle();
    expect(settledJobs.length).toBeGreaterThan(0);

    const declineEmailJob = await BackgroundJob.findOne({
      type: BACKGROUND_JOB_TYPES.EMAIL_NOTIFICATION,
      'payload.notificationType': 'EMPLOYEE_SIGNUP_DECLINED'
    }).lean();
    expect(declineEmailJob?.payload?.html).toContain('Inventra access');
    expect(declineEmailJob?.payload?.html).toContain(
      'workspace access request was declined'
    );
    expect(declineEmailJob?.payload?.html).toContain('Workspace');
  });
});
