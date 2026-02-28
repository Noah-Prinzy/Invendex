import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Product from '../models/Product.js';
import Organization from '../models/Organization.js';
import ProductSkuSequence from '../models/ProductSkuSequence.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;

describe('product sku generation', () => {
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
      name: 'SKU Test Org',
      code: `SKU-${Date.now()}`
    });
  });

  afterAll(async () => {
    process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
    await mongoose.connection.close();
  });

  it('auto-generates a unique SKU when missing', async () => {
    const first = await request(app).post('/api/products').send({
      name: 'Phone Case',
      category: 'Phone',
      price: 12.5,
      lowStockThreshold: 3
    });

    expect(first.status).toBe(201);
    expect(String(first.body?.data?.sku || '')).toMatch(/^PHONE-\d{6}$/);

    const second = await request(app).post('/api/products').send({
      name: 'Phone Charger',
      category: 'Phone',
      price: 25
    });

    expect(second.status).toBe(201);
    expect(String(second.body?.data?.sku || '')).toMatch(/^PHONE-\d{6}$/);
    expect(second.body?.data?.sku).not.toBe(first.body?.data?.sku);
  });

  it('keeps manually provided SKU and allows SKU query filtering', async () => {
    const created = await request(app).post('/api/products').send({
      name: 'Manual SKU Product',
      sku: 'manual_001',
      price: 9.99
    });

    expect(created.status).toBe(201);
    expect(created.body?.data?.sku).toBe('MANUAL-001');

    const filtered = await request(app)
      .get('/api/products')
      .query({ sku: 'manual_001' });

    expect(filtered.status).toBe(200);
    expect(Array.isArray(filtered.body?.data)).toBe(true);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0]?.sku).toBe('MANUAL-001');
  });

  it('supports bulk import with field mapping and mixed manual/auto SKU rows', async () => {
    const response = await request(app)
      .post('/api/products/bulk-import')
      .send({
        fieldMap: {
          name: 'productName',
          sku: 'productSku',
          price: 'unitPrice',
          category: 'group'
        },
        products: [
          {
            productName: 'Mapped Auto SKU',
            unitPrice: 50,
            group: 'Accessories'
          },
          {
            productName: 'Mapped Manual SKU',
            productSku: 'mp-001',
            unitPrice: 75,
            group: 'Accessories'
          }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body?.data?.createdCount).toBe(2);
    expect(response.body?.data?.failedCount).toBe(0);

    const products = await Product.find({
      organization: TEST_ORG_ID
    })
      .sort({ name: 1 })
      .lean();

    expect(products).toHaveLength(2);
    const autoSkuProduct = products.find(
      (row) => row.name === 'Mapped Auto SKU'
    );
    const manualSkuProduct = products.find(
      (row) => row.name === 'Mapped Manual SKU'
    );

    expect(String(autoSkuProduct?.sku || '')).toMatch(/^ACCESS-\d{6}$/);
    expect(manualSkuProduct?.sku).toBe('MP-001');
  });
});
