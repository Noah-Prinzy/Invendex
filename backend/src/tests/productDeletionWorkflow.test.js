import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { generateAccessToken } from '../utils/token.js';
import { getTestDbUri } from './testDbUri.js';
import { hasPermission, PERMISSIONS } from '../authorization/permissions.js';

const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;

const buildAuthHeader = (user) => ({
  Authorization: `Bearer ${generateAccessToken(user)}`
});

describe('product deletion workflow', () => {
  let organization;
  let adminUser;
  let staffUser;

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
      Product.deleteMany({}),
      User.deleteMany({}),
      Organization.deleteMany({})
    ]);

    organization = await Organization.create({
      name: 'Product Workflow Org',
      code: 'PWORKFLOW'
    });

    adminUser = await User.create({
      email: 'admin.product.workflow@example.com',
      password: 'Password123!',
      role: 'admin',
      organization: organization._id,
      isVerified: true
    });

    staffUser = await User.create({
      email: 'staff.product.workflow@example.com',
      password: 'Password123!',
      role: 'staff',
      organization: organization._id,
      isVerified: true
    });
  });

  afterAll(async () => {
    process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
    await mongoose.connection.close();
  });

  it('allows staff soft delete while reserving restore/permanent delete for admin', async () => {
    const createResponse = await request(app)
      .post('/api/products')
      .set(buildAuthHeader(staffUser))
      .send({
        name: 'Widget Alpha',
        sku: 'WIDGET-ALPHA',
        price: 12.99,
        category: 'Widgets',
        lowStockThreshold: 5
      });

    expect(createResponse.status).toBe(201);
    const productId = createResponse.body?.data?.id;
    expect(productId).toBeTruthy();

    const softDeleteResponse = await request(app)
      .delete(`/api/products/${productId}`)
      .set(buildAuthHeader(staffUser));

    expect(softDeleteResponse.status).toBe(200);
    expect(softDeleteResponse.body?.data?.isActive).toBe(false);
    expect(softDeleteResponse.body?.data?.deleteStatus).toBe(
      'pending_admin_review'
    );
    expect(softDeleteResponse.body?.data?.deletedByRole).toBe('staff');

    expect(hasPermission('staff', PERMISSIONS.PRODUCTS_EDIT)).toBe(true);
    expect(hasPermission('staff', PERMISSIONS.PRODUCTS_DELETE)).toBe(false);
    expect(hasPermission('admin', PERMISSIONS.PRODUCTS_DELETE)).toBe(true);

    const deletedListAsAdmin = await request(app)
      .get('/api/products/deleted')
      .set(buildAuthHeader(adminUser));
    expect(deletedListAsAdmin.status).toBe(200);
    expect(Array.isArray(deletedListAsAdmin.body?.data)).toBe(true);
    expect(deletedListAsAdmin.body.data).toHaveLength(1);

    const restoreAsAdmin = await request(app)
      .patch(`/api/products/${productId}/restore`)
      .set(buildAuthHeader(adminUser));
    expect(restoreAsAdmin.status).toBe(200);
    expect(restoreAsAdmin.body?.data?.isActive).toBe(true);
    expect(restoreAsAdmin.body?.data?.deleteStatus).toBe('active');

    const softDeleteAgain = await request(app)
      .delete(`/api/products/${productId}`)
      .set(buildAuthHeader(staffUser));
    expect(softDeleteAgain.status).toBe(200);

    const permanentDeleteAsAdmin = await request(app)
      .delete(`/api/products/${productId}/permanent`)
      .set(buildAuthHeader(adminUser));
    expect(permanentDeleteAsAdmin.status).toBe(200);

    const productAfterPermanentDelete = await Product.findById(productId);
    expect(productAfterPermanentDelete).toBeNull();
  });
});
