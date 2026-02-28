import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Product from '../models/Product.js';
import Organization from '../models/Organization.js';
import ProductSkuSequence from '../models/ProductSkuSequence.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;

describe('product bulk import safety rails', () => {
  beforeAll(async () => {
    process.env.AUTH_TEST_BYPASS = 'true';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(getTestDbUri());
    }
  });

  beforeEach(async () => {
    await Promise.all([
      Product.deleteMany({}),
      ProductSkuSequence.deleteMany({}),
      Organization.deleteMany({})
    ]);

    await Organization.create({
      _id: TEST_ORG_ID,
      name: 'Bulk Safety Org',
      code: `BSAFE-${Date.now()}`
    });
  });

  afterAll(async () => {
    process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
    await mongoose.connection.close();
  });

  it('supports validate-only mode without database writes', async () => {
    const response = await request(app)
      .post('/api/products/bulk-import')
      .send({
        options: {
          validateOnly: true,
          duplicatePolicy: 'skip'
        },
        products: [
          { name: 'Validate A', category: 'Demo', price: 10.5 },
          { name: 'Validate B', category: 'Demo', price: 20.5 }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body?.data?.dryRun).toBe(true);
    expect(response.body?.data?.totalRows).toBe(2);
    expect(response.body?.data?.invalidRows).toBe(0);
    expect(response.body?.data?.createdCount).toBe(0);

    const count = await Product.countDocuments({ organization: TEST_ORG_ID });
    expect(count).toBe(0);
  });

  it('supports duplicate policy skip', async () => {
    await Product.create({
      organization: TEST_ORG_ID,
      name: 'Existing',
      sku: 'DUP-001',
      price: 8
    });

    const response = await request(app)
      .post('/api/products/bulk-import')
      .send({
        options: {
          duplicatePolicy: 'skip'
        },
        products: [
          { name: 'Duplicate incoming', sku: 'dup_001', price: 9.5 },
          { name: 'New incoming', sku: 'new_001', price: 11.75 }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body?.data?.createdCount).toBe(1);
    expect(response.body?.data?.skippedCount).toBe(1);
    expect(response.body?.data?.failedCount).toBe(0);

    const products = await Product.find({ organization: TEST_ORG_ID }).lean();
    expect(products).toHaveLength(2);
  });

  it('supports duplicate policy fail with row-level error details', async () => {
    await Product.create({
      organization: TEST_ORG_ID,
      name: 'Existing',
      sku: 'DUP-XYZ',
      price: 8
    });

    const response = await request(app)
      .post('/api/products/bulk-import')
      .send({
        options: {
          duplicatePolicy: 'fail'
        },
        products: [
          { name: 'Duplicate incoming', sku: 'dup_xyz', price: 9.5 },
          { name: 'New incoming', sku: 'new_xyz', price: 11.75 }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body?.data?.createdCount).toBe(1);
    expect(response.body?.data?.failedCount).toBe(1);
    expect(Array.isArray(response.body?.data?.rowErrors)).toBe(true);
    expect(response.body.data.rowErrors[0]?.field).toBe('sku');
  });

  it('blocks atomic import writes when validation fails', async () => {
    const response = await request(app)
      .post('/api/products/bulk-import')
      .send({
        options: {
          atomic: true,
          duplicatePolicy: 'fail'
        },
        products: [
          { name: 'Atomic Valid', sku: 'ATM-001', price: 5 },
          { name: '', sku: 'ATM-002', price: 10 }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body?.message).toContain('Atomic import validation failed');
    expect(response.body?.data?.dryRun).toBe(true);
    expect(response.body?.data?.atomic).toBe(true);
    expect(response.body?.data?.invalidRows).toBeGreaterThan(0);

    const count = await Product.countDocuments({ organization: TEST_ORG_ID });
    expect(count).toBe(0);
  });
});
