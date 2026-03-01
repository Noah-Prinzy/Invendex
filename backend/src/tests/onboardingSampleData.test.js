import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import Inventory from '../models/Inventory.js';
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
});
