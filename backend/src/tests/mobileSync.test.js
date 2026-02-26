import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Inventory from '../models/Inventory.js';
import OfflineSyncMutation from '../models/OfflineSyncMutation.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const originalTestDbUri = process.env.MONGO_TEST_URI;

beforeAll(async () => {
  process.env.AUTH_TEST_BYPASS = 'true';
  process.env.MONGO_TEST_URI =
    'mongodb://127.0.0.1:27017/ledgerly_test_mobile_sync';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    OfflineSyncMutation.deleteMany({}),
    Inventory.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
  process.env.MONGO_TEST_URI = originalTestDbUri;
});

describe('mobile sync API', () => {
  it('applies offline mutations idempotently and returns bootstrap datasets', async () => {
    const warehouse = await Warehouse.create({
      organization: TEST_ORG_ID,
      name: 'Mobile Warehouse',
      code: 'MOB-WH'
    });

    const product = await Product.create({
      organization: TEST_ORG_ID,
      name: 'Mobile Product',
      sku: 'MOB-001',
      price: 25,
      stock: 0
    });

    await Inventory.create({
      organization: TEST_ORG_ID,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: 0,
      quantityReserved: 0
    });

    const mutationBody = {
      deviceId: 'device_test_001',
      mutations: [
        {
          mutationId: 'mutation_001',
          type: 'inventory.adjust',
          payload: {
            productId: product._id.toString(),
            warehouseId: warehouse._id.toString(),
            amount: 5,
            reason: 'restock'
          }
        }
      ]
    };

    const applyResponse = await request(app)
      .post('/api/mobile-sync/mutations')
      .send(mutationBody);
    expect(applyResponse.status).toBe(200);
    expect(applyResponse.body?.data?.appliedCount).toBe(1);

    const dedupeResponse = await request(app)
      .post('/api/mobile-sync/mutations')
      .send(mutationBody);
    expect(dedupeResponse.status).toBe(200);
    expect(dedupeResponse.body?.data?.deduplicatedCount).toBe(1);

    const inventory = await Inventory.findOne({
      organization: TEST_ORG_ID,
      product: product._id,
      warehouse: warehouse._id
    }).lean();
    expect(Number(inventory?.quantityOnHand || 0)).toBe(5);

    const bootstrapResponse = await request(app).get(
      `/api/mobile-sync/bootstrap?warehouseId=${warehouse._id.toString()}`
    );
    expect(bootstrapResponse.status).toBe(200);
    expect(
      Array.isArray(bootstrapResponse.body?.data?.datasets?.inventory)
    ).toBe(true);
    expect(
      bootstrapResponse.body?.data?.datasets?.inventory?.length
    ).toBeGreaterThanOrEqual(1);
  });
});
