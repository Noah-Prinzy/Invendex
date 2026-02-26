import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Order from '../models/Order.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import WarehouseBin from '../models/WarehouseBin.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const originalAuthBypass = process.env.AUTH_TEST_BYPASS;

beforeAll(async () => {
  process.env.AUTH_TEST_BYPASS = 'true';

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
    Order.deleteMany({}),
    WarehouseBin.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    Organization.deleteMany({})
  ]);

  await Organization.create({
    _id: TEST_ORG_ID,
    name: 'Validation Org',
    code: `VAL-${Date.now()}`
  });
});

afterAll(async () => {
  process.env.AUTH_TEST_BYPASS = originalAuthBypass;
  await mongoose.connection.close();
});

describe('order and wms request validators', () => {
  it('rejects sale order payload missing unitSalePrice', async () => {
    const warehouse = await Warehouse.create({
      organization: TEST_ORG_ID,
      name: 'Main Warehouse',
      code: 'VAL-WH'
    });

    const product = await Product.create({
      organization: TEST_ORG_ID,
      name: 'Validation Product',
      sku: 'VAL-P-001',
      price: 50,
      stock: 10
    });

    const response = await request(app).post('/api/orders').send({
      type: 'sale',
      warehouse: warehouse._id.toString(),
      products: [
        {
          product: product._id.toString(),
          quantity: 1
        }
      ]
    });

    expect(response.status).toBe(400);
    expect(response.body?.success).toBe(false);
    expect(String(response.body?.message || '').toLowerCase()).toContain(
      'unitsaleprice'
    );
  });

  it('rejects invalid wms bin rule payload when target is below minimum', async () => {
    const warehouse = await Warehouse.create({
      organization: TEST_ORG_ID,
      name: 'Rules Warehouse',
      code: 'VAL-RULE-WH'
    });

    const response = await request(app).post('/api/wms/bins').send({
      warehouseId: warehouse._id.toString(),
      code: 'BIN-001',
      replenishmentMinUnits: 10,
      replenishmentTargetUnits: 5
    });

    expect(response.status).toBe(400);
    expect(response.body?.success).toBe(false);
    expect(String(response.body?.message || '').toLowerCase()).toContain(
      'replenishmenttargetunits'
    );
  });

  it('rejects wms transfer payload when source and destination bins are the same', async () => {
    const warehouse = await Warehouse.create({
      organization: TEST_ORG_ID,
      name: 'Transfer Warehouse',
      code: 'VAL-TRF-WH'
    });

    const product = await Product.create({
      organization: TEST_ORG_ID,
      name: 'Transfer Product',
      sku: 'VAL-TRF-P',
      price: 25,
      stock: 5
    });

    const bin = await WarehouseBin.create({
      organization: TEST_ORG_ID,
      warehouse: warehouse._id,
      code: 'BIN-A1'
    });

    const response = await request(app).post('/api/wms/bins/transfer').send({
      warehouseId: warehouse._id.toString(),
      productId: product._id.toString(),
      fromBinId: bin._id.toString(),
      toBinId: bin._id.toString(),
      quantity: 1
    });

    expect(response.status).toBe(400);
    expect(response.body?.success).toBe(false);
    expect(String(response.body?.message || '').toLowerCase()).toContain(
      'frombinid and tobinid must be different'
    );
  });
});
