import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import TaxConfiguration from '../models/TaxConfiguration.js';
import Warehouse from '../models/Warehouse.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const originalTestDbUri = process.env.MONGO_TEST_URI;

beforeAll(async () => {
  process.env.AUTH_TEST_BYPASS = 'true';
  process.env.MONGO_TEST_URI =
    'mongodb://127.0.0.1:27017/invendex_test_tax_compliance';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    Order.deleteMany({}),
    TaxConfiguration.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
  process.env.MONGO_TEST_URI = originalTestDbUri;
});

describe('tax compliance', () => {
  it('applies configured VAT defaults to sale orders and exposes tax config API', async () => {
    const warehouse = await Warehouse.create({
      organization: TEST_ORG_ID,
      name: 'Tax Warehouse',
      code: 'TAX-WH'
    });

    const product = await Product.create({
      organization: TEST_ORG_ID,
      name: 'Tax Product',
      sku: 'TAX-001',
      price: 100,
      stock: 0
    });

    const configGetResponse = await request(app).get('/api/finance/tax-config');
    expect(configGetResponse.status).toBe(200);
    expect(configGetResponse.body?.data?.vatRate).toBe(18);

    const patchResponse = await request(app)
      .patch('/api/finance/tax-config')
      .send({
        vatEnabled: true,
        vatRate: 18,
        taxInclusivePricing: false,
        countryCode: 'UG',
        currencyCode: 'UGX'
      });
    expect(patchResponse.status).toBe(200);
    expect(Number(patchResponse.body?.data?.vatRate)).toBe(18);

    const orderResponse = await request(app)
      .post('/api/orders')
      .send({
        type: 'sale',
        warehouse: warehouse._id.toString(),
        products: [
          {
            product: product._id.toString(),
            quantity: 2,
            unitSalePrice: 100
          }
        ]
      });

    expect(orderResponse.status).toBe(201);
    expect(orderResponse.body?.data?.products?.[0]?.taxAmount).toBe(36);

    const vatSummaryResponse = await request(app).get(
      '/api/finance/vat-summary'
    );
    expect(vatSummaryResponse.status).toBe(200);
    expect(
      vatSummaryResponse.body?.data?.totalTaxCollected
    ).toBeGreaterThanOrEqual(0);
  });
});
