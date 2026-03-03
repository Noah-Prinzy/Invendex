import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import Inventory from '../models/Inventory.js';
import Warehouse from '../models/Warehouse.js';
import { getTestDbUri } from './testDbUri.js';

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
    Inventory.deleteMany({}),
    Product.deleteMany({}),
    Supplier.deleteMany({}),
    Warehouse.deleteMany({}),
    User.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
  await mongoose.connection.close();
});

describe('onboarding sample data api', () => {
  it('seeds sample data once and returns skipped on subsequent runs', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'seed-admin@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Seed Org'
    });

    expect(registerResponse.status).toBe(201);
    const accessToken = registerResponse.body?.data?.accessToken;
    expect(accessToken).toBeTruthy();

    const firstSeedResponse = await request(app)
      .post('/api/onboarding/seed-sample-data')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        force: false
      });

    expect(firstSeedResponse.status).toBe(201);
    expect(firstSeedResponse.body?.data?.skipped).toBe(false);
    expect(
      Number(firstSeedResponse.body?.data?.summary?.productsCreated || 0)
    ).toBeGreaterThan(0);

    const secondSeedResponse = await request(app)
      .post('/api/onboarding/seed-sample-data')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        force: false
      });

    expect(secondSeedResponse.status).toBe(200);
    expect(secondSeedResponse.body?.data?.skipped).toBe(true);

    const totalProducts = await Product.countDocuments({});
    const totalSuppliers = await Supplier.countDocuments({});
    const totalInventoryRows = await Inventory.countDocuments({});

    expect(totalProducts).toBeGreaterThan(0);
    expect(totalSuppliers).toBeGreaterThan(0);
    expect(totalInventoryRows).toBeGreaterThan(0);
  });

  it('returns onboarding status and creates first warehouse via onboarding api', async () => {
    const registerResponse = await request(app).post('/auth/register').send({
      email: 'onboarding-admin@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      organizationName: 'Onboarding Org'
    });

    expect(registerResponse.status).toBe(201);
    const accessToken = registerResponse.body?.data?.accessToken;

    const beforeStatusResponse = await request(app)
      .get('/api/onboarding/status')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(beforeStatusResponse.status).toBe(200);
    expect(beforeStatusResponse.body?.data?.counters?.warehouses).toBe(0);
    expect(beforeStatusResponse.body?.data?.progress?.completedSteps).toBe(0);

    const createWarehouseResponse = await request(app)
      .post('/api/onboarding/warehouses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Central Warehouse',
        code: 'CENTRAL-1',
        region: 'Kampala'
      });

    expect(createWarehouseResponse.status).toBe(201);
    expect(createWarehouseResponse.body?.data?.name).toBe('Central Warehouse');
    expect(createWarehouseResponse.body?.data?.code).toBe('CENTRAL-1');

    const afterStatusResponse = await request(app)
      .get('/api/onboarding/status')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(afterStatusResponse.status).toBe(200);
    expect(afterStatusResponse.body?.data?.counters?.warehouses).toBe(1);
    expect(afterStatusResponse.body?.data?.steps?.[0]?.completed).toBe(true);
  });
});
