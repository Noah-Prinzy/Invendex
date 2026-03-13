import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import User from '../models/User.js';
import Warehouse from '../models/Warehouse.js';
import { getTestDbUri } from './testDbUri.js';

const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;
const originalTestDbUri = process.env.MONGO_TEST_URI;

const registerAdmin = async ({
  email = `ai-admin-${Date.now()}@example.com`,
  password = 'Password123!',
  organizationName = `AI Org ${Date.now()}`
} = {}) => {
  const response = await request(app).post('/auth/register').send({
    email,
    password,
    confirmPassword: password,
    organizationName
  });

  return {
    response,
    accessToken: String(response.body?.data?.accessToken || ''),
    organizationId: String(response.body?.data?.organization?._id || ''),
    userId: String(response.body?.data?.user?._id || ''),
    password
  };
};

const addDays = (date, days) =>
  new Date(new Date(date).getTime() + days * 24 * 60 * 60 * 1000);

beforeAll(async () => {
  process.env.AUTH_TEST_BYPASS = 'false';
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET || 'test_access_secret';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
  process.env.MONGO_TEST_URI =
    'mongodb://127.0.0.1:27017/invendex_test_ai_insights_api';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    InventorySnapshot.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Supplier.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    User.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
  process.env.MONGO_TEST_URI = originalTestDbUri;
  await mongoose.connection.close();
});

describe('AI insights API', () => {
  it('returns demand anomalies for product snapshots', async () => {
    const { response, accessToken, organizationId } = await registerAdmin({
      email: 'ai-anomalies-admin@example.com',
      organizationName: 'AI Anomalies Org'
    });
    expect(response.status).toBe(201);
    expect(accessToken).toBeTruthy();
    expect(organizationId).toBeTruthy();

    const product = await Product.create({
      organization: organizationId,
      name: 'Anomaly Product',
      sku: 'ANOM-001',
      price: 10,
      stock: 0
    });

    const demands = [5, 5, 5, 5, 5, 5, 5, 80];
    const firstDate = addDays(new Date(), -demands.length);
    let stock = 200;
    const snapshots = [
      {
        organization: organizationId,
        product: product._id,
        sku: product.sku,
        stock,
        price: product.price,
        recordedAt: firstDate
      }
    ];

    demands.forEach((demand, index) => {
      stock -= demand;
      snapshots.push({
        organization: organizationId,
        product: product._id,
        sku: product.sku,
        stock,
        price: product.price,
        recordedAt: addDays(firstDate, index + 1)
      });
    });

    await InventorySnapshot.insertMany(snapshots);

    const apiResponse = await request(app)
      .get(`/api/ai/anomalies/${product._id}?days=365&zThreshold=2.3`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(apiResponse.status).toBe(200);
    expect(apiResponse.body?.success).toBe(true);
    expect(apiResponse.body?.data?.productId).toBe(String(product._id));
    expect(Number(apiResponse.body?.data?.anomalyCount || 0)).toBeGreaterThan(
      0
    );
    expect(Array.isArray(apiResponse.body?.data?.anomalies)).toBe(true);
    expect(
      Number(apiResponse.body?.data?.anomalies?.[0]?.zScore || 0)
    ).toBeGreaterThanOrEqual(2.3);
  });

  it('returns ranked supplier reliability scores', async () => {
    const { response, accessToken, organizationId, userId } =
      await registerAdmin({
        email: 'ai-supplier-admin@example.com',
        organizationName: 'AI Supplier Org'
      });
    expect(response.status).toBe(201);
    expect(accessToken).toBeTruthy();

    const [goodSupplier, weakSupplier] = await Supplier.create([
      {
        organization: organizationId,
        name: 'Reliable Supplies'
      },
      {
        organization: organizationId,
        name: 'Slow Supplies'
      }
    ]);

    const warehouse = await Warehouse.create({
      organization: organizationId,
      name: 'Main Warehouse',
      code: 'MAIN-WH'
    });

    const product = await Product.create({
      organization: organizationId,
      name: 'Supplier Product',
      sku: 'SUP-001',
      price: 30,
      stock: 0
    });

    const now = new Date();
    const orderTemplate = {
      organization: organizationId,
      warehouse: warehouse._id,
      createdBy: userId,
      items: [
        {
          product: product._id,
          sku: product.sku,
          quantity: 5,
          unitCost: 12,
          totalCost: 60
        }
      ]
    };

    await PurchaseOrder.create([
      {
        ...orderTemplate,
        supplier: goodSupplier._id,
        status: 'RECEIVED',
        sentAt: addDays(now, -20),
        receivedAt: addDays(now, -16),
        expectedDeliveryDate: addDays(now, -15)
      },
      {
        ...orderTemplate,
        supplier: goodSupplier._id,
        status: 'RECEIVED',
        sentAt: addDays(now, -14),
        receivedAt: addDays(now, -10),
        expectedDeliveryDate: addDays(now, -9)
      },
      {
        ...orderTemplate,
        supplier: weakSupplier._id,
        status: 'RECEIVED',
        sentAt: addDays(now, -20),
        receivedAt: addDays(now, -9),
        expectedDeliveryDate: addDays(now, -14)
      },
      {
        ...orderTemplate,
        supplier: weakSupplier._id,
        status: 'RECEIVED',
        sentAt: addDays(now, -12),
        receivedAt: addDays(now, -2),
        expectedDeliveryDate: addDays(now, -8)
      }
    ]);

    const apiResponse = await request(app)
      .get('/api/ai/supplier-reliability?days=365')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(apiResponse.status).toBe(200);
    expect(apiResponse.body?.success).toBe(true);
    expect(Array.isArray(apiResponse.body?.data)).toBe(true);
    expect(apiResponse.body.data.length).toBeGreaterThanOrEqual(2);

    const reliable = apiResponse.body.data.find(
      (row) => row.supplierName === 'Reliable Supplies'
    );
    const slow = apiResponse.body.data.find(
      (row) => row.supplierName === 'Slow Supplies'
    );

    expect(reliable).toBeTruthy();
    expect(slow).toBeTruthy();
    expect(Number(reliable.score || 0)).toBeGreaterThan(
      Number(slow.score || 0)
    );
    expect(Number(reliable.onTimeRate || 0)).toBeGreaterThan(
      Number(slow.onTimeRate || 0)
    );
  });
});
