import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import NotificationEvent from '../models/NotificationEvent.js';
import EmployeeInvite from '../models/EmployeeInvite.js';
import Warehouse from '../models/Warehouse.js';
import { getTestDbUri } from './testDbUri.js';
import { createInAppNotification } from '../services/notifications/inAppNotificationService.js';
import { generateAccessToken } from '../utils/token.js';

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

  it('hides employee auth/signup notifications from non-admin users', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'notify-owner@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Notify Org'
    });
    expect(registerResponse.status).toBe(201);

    const adminAccessToken = registerResponse.body?.data?.accessToken;
    const organizationId = registerResponse.body?.data?.organization?._id;
    expect(adminAccessToken).toBeTruthy();
    expect(organizationId).toBeTruthy();

    const staffUser = await User.create({
      email: 'notify-staff@example.com',
      username: 'notify.staff',
      password: 'Password123!',
      role: 'staff',
      organization: organizationId,
      isVerified: true,
      isActive: true
    });
    const staffAccessToken = generateAccessToken(staffUser);

    await createInAppNotification({
      organizationId,
      type: 'employee_signup_request',
      title: 'Employee signup request',
      message: 'Someone requested access.'
    });
    await createInAppNotification({
      organizationId,
      type: 'employee_signin',
      title: 'Employee signed in',
      message: 'staff signed in'
    });
    await createInAppNotification({
      organizationId,
      type: 'employee_signout',
      title: 'Employee signed out',
      message: 'staff signed out'
    });
    await createInAppNotification({
      organizationId,
      type: 'test_notification',
      title: 'General notification',
      message: 'Visible to all roles'
    });

    const staffListResponse = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${staffAccessToken}`);

    expect(staffListResponse.status).toBe(200);
    const staffItems = Array.isArray(staffListResponse.body?.data?.items)
      ? staffListResponse.body.data.items
      : [];
    expect(staffItems.length).toBe(1);
    expect(staffItems[0]?.type).toBe('test_notification');
    expect(Number(staffListResponse.body?.data?.unreadCount || 0)).toBe(1);

    const adminListResponse = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(adminListResponse.status).toBe(200);
    const adminTypes = (adminListResponse.body?.data?.items || []).map(
      (item) => item?.type
    );
    expect(adminTypes).toEqual(
      expect.arrayContaining([
        'employee_signup_request',
        'employee_signin',
        'employee_signout',
        'test_notification'
      ])
    );
  });

  it('filters notifications by selected warehouse while keeping org-wide items visible', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'warehouse-admin@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Warehouse Notify Org'
    });
    expect(registerResponse.status).toBe(201);

    const accessToken = registerResponse.body?.data?.accessToken;
    const organizationId = registerResponse.body?.data?.organization?._id;
    const userId = registerResponse.body?.data?.user?._id;
    expect(accessToken).toBeTruthy();
    expect(organizationId).toBeTruthy();
    expect(userId).toBeTruthy();

    const [warehouseA, warehouseB] = await Warehouse.create([
      {
        organization: organizationId,
        name: 'Warehouse A',
        code: 'WH-A'
      },
      {
        organization: organizationId,
        name: 'Warehouse B',
        code: 'WH-B'
      }
    ]);

    await createInAppNotification({
      organizationId,
      warehouseId: warehouseA._id,
      actorUserId: userId,
      type: 'warehouse_specific',
      title: 'Warehouse A alert',
      message: 'Applies only to warehouse A'
    });
    await createInAppNotification({
      organizationId,
      warehouseId: warehouseB._id,
      actorUserId: userId,
      type: 'warehouse_specific',
      title: 'Warehouse B alert',
      message: 'Applies only to warehouse B'
    });
    await createInAppNotification({
      organizationId,
      actorUserId: userId,
      type: 'org_wide',
      title: 'Org-wide alert',
      message: 'Applies across all warehouses'
    });

    const scopedListResponse = await request(app)
      .get('/api/notifications')
      .query({ warehouseId: String(warehouseA._id) })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(scopedListResponse.status).toBe(200);
    const scopedItems = Array.isArray(scopedListResponse.body?.data?.items)
      ? scopedListResponse.body.data.items
      : [];
    expect(scopedItems.map((item) => item?.title)).toEqual(
      expect.arrayContaining(['Warehouse A alert', 'Org-wide alert'])
    );
    expect(scopedItems.map((item) => item?.title)).not.toContain(
      'Warehouse B alert'
    );
    expect(
      scopedItems.find((item) => item?.title === 'Warehouse A alert')
    ).toMatchObject({
      warehouseId: String(warehouseA._id),
      warehouseCode: 'WH-A',
      warehouseName: 'Warehouse A'
    });
    expect(
      scopedItems.find((item) => item?.title === 'Org-wide alert')
    ).toMatchObject({
      warehouseId: null,
      warehouseCode: null,
      warehouseName: null
    });
    expect(Number(scopedListResponse.body?.data?.unreadCount || 0)).toBe(2);

    const scopedReadAllResponse = await request(app)
      .patch('/api/notifications/read-all')
      .query({ warehouseId: String(warehouseA._id) })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(scopedReadAllResponse.status).toBe(200);
    expect(Number(scopedReadAllResponse.body?.data?.updatedCount || 0)).toBe(2);

    const allListResponse = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(allListResponse.status).toBe(200);
    expect(Number(allListResponse.body?.data?.unreadCount || 0)).toBe(1);
    expect(
      (allListResponse.body?.data?.items || []).find(
        (item) => item?.title === 'Warehouse B alert'
      )?.read
    ).toBe(false);
  });
});
