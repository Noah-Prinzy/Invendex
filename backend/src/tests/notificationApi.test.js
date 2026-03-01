import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import NotificationEvent from '../models/NotificationEvent.js';
import EmployeeInvite from '../models/EmployeeInvite.js';
import { getTestDbUri } from './testDbUri.js';
import { createInAppNotification } from '../services/notifications/inAppNotificationService.js';

const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;

beforeAll(async () => {
  process.env.AUTH_TEST_BYPASS = 'false';
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
    NotificationEvent.deleteMany({}),
    EmployeeInvite.deleteMany({}),
    User.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
  await mongoose.connection.close();
});

describe('notification api', () => {
  it('lists and marks notifications as read', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'notify-admin@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Notify Org'
    });
    expect(registerResponse.status).toBe(201);

    const accessToken = registerResponse.body?.data?.accessToken;
    const organizationId = registerResponse.body?.data?.organization?._id;
    const userId = registerResponse.body?.data?.user?._id;
    expect(accessToken).toBeTruthy();
    expect(organizationId).toBeTruthy();
    expect(userId).toBeTruthy();

    const notification = await createInAppNotification({
      organizationId,
      actorUserId: userId,
      type: 'test_notification',
      title: 'Test',
      message: 'Notification test'
    });

    const listResponse = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body?.data?.items)).toBe(true);
    expect(listResponse.body?.data?.unreadCount).toBe(1);
    expect(listResponse.body?.data?.items[0]?._id).toBe(
      String(notification._id)
    );
    expect(listResponse.body?.data?.items[0]?.read).toBe(false);

    const readResponse = await request(app)
      .patch(`/api/notifications/${notification._id}/read`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(readResponse.status).toBe(200);
    expect(readResponse.body?.data?.read).toBe(true);

    const readAllResponse = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(readAllResponse.status).toBe(200);
    expect(Number(readAllResponse.body?.data?.updatedCount || 0)).toBe(0);
  });
});
