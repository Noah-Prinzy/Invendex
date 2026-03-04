import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Product from '../models/Product.js';
import Organization from '../models/Organization.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import ReorderAlert from '../models/ReorderAlert.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;

describe('product label + inventory health score API', () => {
  beforeAll(async () => {
    process.env.AUTH_TEST_BYPASS = 'true';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(getTestDbUri());
    }
  });

  beforeEach(async () => {
    await Promise.all([
      Product.deleteMany({}),
      ReorderAlert.deleteMany({}),
      OrganizationSettings.deleteMany({}),
      Organization.deleteMany({})
    ]);

    await Organization.create({
      _id: TEST_ORG_ID,
      name: 'Health Test Org',
      code: `HLT-${Date.now()}`
    });
  });

  afterAll(async () => {
    process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
    await mongoose.connection.close();
  });

  it('downloads a PNG product label', async () => {
    const product = await Product.create({
      organization: TEST_ORG_ID,
      name: 'Label Product',
      sku: 'LBL-001',
      price: 50,
      stock: 8,
      lowStockThreshold: 2,
      barcode: '0123456789012',
      barcodeType: 'EAN13'
    });

    const response = await request(app)
      .get(`/api/products/${product._id}/label`)
      .query({ type: 'auto', scale: 2, includeText: 'true' });

    expect(response.status).toBe(200);
    expect(String(response.headers['content-type'] || '')).toContain(
      'image/png'
    );
    expect(String(response.headers['content-disposition'] || '')).toContain(
      'attachment; filename="product-label-'
    );
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(100);
  });

  it('returns inventory health score with computed totals and ratios', async () => {
    const staleDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);

    const [lowStockProduct] = await Product.create([
      {
        organization: TEST_ORG_ID,
        name: 'Low Stock Product',
        sku: 'LOW-001',
        price: 20,
        stock: 2,
        lowStockThreshold: 5
      },
      {
        organization: TEST_ORG_ID,
        name: 'Stockout Product',
        sku: 'OUT-001',
        price: 30,
        stock: 0,
        lowStockThreshold: 2
      }
    ]);

    await Product.create({
      organization: TEST_ORG_ID,
      name: 'Stale Product',
      sku: 'STALE-001',
      price: 10,
      stock: 10,
      lowStockThreshold: 1,
      stockHistory: [
        {
          previousStock: 10,
          newStock: 10,
          changeAmount: 0,
          reason: 'adjustment',
          changedAt: staleDate
        }
      ]
    });

    await OrganizationSettings.create({
      organization: TEST_ORG_ID,
      inventory: {
        deadStockThresholdDays: 30
      }
    });

    await ReorderAlert.create({
      organization: TEST_ORG_ID,
      product: lowStockProduct._id,
      sku: lowStockProduct.sku,
      stock: lowStockProduct.stock,
      reorderLevel: lowStockProduct.lowStockThreshold,
      reorderQuantity: 10,
      status: 'ACTIVE',
      resolved: false,
      triggeredAt: new Date(),
      source: 'system'
    });

    const response = await request(app).get(
      '/api/products/inventory/health-score'
    );

    expect(response.status).toBe(200);
    expect(response.body?.success).toBe(true);
    expect(response.body?.data?.totals?.products).toBe(3);
    expect(response.body?.data?.totals?.lowStock).toBe(2);
    expect(response.body?.data?.totals?.stockouts).toBe(1);
    expect(response.body?.data?.totals?.staleStock).toBe(1);
    expect(response.body?.data?.totals?.activeAlerts).toBe(1);
    expect(response.body?.data?.deadStockThresholdDays).toBe(30);
    expect(Number(response.body?.data?.score)).toBeLessThan(100);
    expect(['EXCELLENT', 'GOOD', 'WARNING', 'CRITICAL']).toContain(
      String(response.body?.data?.band || '')
    );
  });
});
