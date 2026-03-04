import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Inventory from '../models/Inventory.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import StocktakeSession from '../models/StocktakeSession.js';
import Warehouse from '../models/Warehouse.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;

describe('inventory stocktake flow', () => {
  beforeAll(async () => {
    process.env.AUTH_TEST_BYPASS = 'true';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(getTestDbUri());
    }
  });

  beforeEach(async () => {
    await Promise.all([
      StocktakeSession.deleteMany({}),
      Inventory.deleteMany({}),
      Product.deleteMany({}),
      Warehouse.deleteMany({}),
      Organization.deleteMany({})
    ]);

    await Organization.create({
      _id: TEST_ORG_ID,
      name: 'Stocktake Org',
      code: `STK-${Date.now()}`
    });
  });

  afterAll(async () => {
    process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
    await mongoose.connection.close();
  });

  it('creates, counts, and approves a stocktake session with inventory adjustment', async () => {
    const warehouse = await Warehouse.create({
      organization: TEST_ORG_ID,
      name: 'Main Warehouse',
      code: 'MAIN-1',
      isActive: true,
      isArchived: false
    });

    const product = await Product.create({
      organization: TEST_ORG_ID,
      name: 'Cycle Item',
      sku: 'CYCLE-001',
      price: 10,
      stock: 10,
      lowStockThreshold: 2
    });

    await Inventory.create({
      organization: TEST_ORG_ID,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: 10,
      quantityReserved: 0
    });

    const createResponse = await request(app)
      .post('/api/inventory/stocktakes')
      .send({
        warehouseId: String(warehouse._id),
        title: 'Cycle Count Session A'
      });

    expect(createResponse.status).toBe(201);
    const sessionId = createResponse.body?.data?._id;
    expect(sessionId).toBeTruthy();
    expect(createResponse.body?.data?.status).toBe('OPEN');

    const countsResponse = await request(app)
      .patch(`/api/inventory/stocktakes/${sessionId}/counts`)
      .send({
        counts: [
          {
            productId: String(product._id),
            countedQuantity: 7
          }
        ]
      });

    expect(countsResponse.status).toBe(200);
    expect(countsResponse.body?.data?.status).toBe('IN_REVIEW');

    const approveResponse = await request(app).post(
      `/api/inventory/stocktakes/${sessionId}/approve`
    );

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body?.data?.status).toBe('APPROVED');
    expect(Array.isArray(approveResponse.body?.data?.appliedAdjustments)).toBe(
      true
    );
    expect(approveResponse.body?.data?.appliedAdjustments).toHaveLength(1);
    expect(
      Number(
        approveResponse.body?.data?.appliedAdjustments?.[0]?.appliedDelta || 0
      )
    ).toBe(-3);

    const inventory = await Inventory.findOne({
      organization: TEST_ORG_ID,
      product: product._id,
      warehouse: warehouse._id
    }).lean();

    expect(Number(inventory?.quantityOnHand || 0)).toBe(7);

    const refreshedProduct = await Product.findOne({
      _id: product._id,
      organization: TEST_ORG_ID
    }).lean();
    expect(Number(refreshedProduct?.stock || 0)).toBe(7);
  });

  it('returns stocktake vision-scan count estimates for captured shelf image payload', async () => {
    const warehouse = await Warehouse.create({
      organization: TEST_ORG_ID,
      name: 'Vision Warehouse',
      code: 'VISION-1',
      isActive: true,
      isArchived: false
    });

    const product = await Product.create({
      organization: TEST_ORG_ID,
      name: 'Vision Item',
      sku: 'VISION-001',
      price: 9,
      stock: 15,
      lowStockThreshold: 2
    });

    await Inventory.create({
      organization: TEST_ORG_ID,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: 15,
      quantityReserved: 0
    });

    const createResponse = await request(app)
      .post('/api/inventory/stocktakes')
      .send({
        warehouseId: String(warehouse._id),
        title: 'Vision Count Session'
      });

    expect(createResponse.status).toBe(201);
    const sessionId = String(createResponse.body?.data?._id || '');
    expect(sessionId).toBeTruthy();

    const fakeImageBase64 = Buffer.from('vision-scan-frame').toString('base64');
    const scanResponse = await request(app)
      .post(`/api/inventory/stocktakes/${sessionId}/vision-scan`)
      .send({
        imageDataUrl: `data:image/jpeg;base64,${fakeImageBase64}`,
        maxDetections: 20,
        confidenceThreshold: 0.2
      });

    expect(scanResponse.status).toBe(200);
    expect(scanResponse.body?.success).toBe(true);
    expect(scanResponse.body?.data?.provider).toBeTruthy();
    expect(Array.isArray(scanResponse.body?.data?.counts)).toBe(true);
    expect(scanResponse.body?.data?.counts?.length).toBeGreaterThan(0);
    expect(scanResponse.body?.data?.policy).toBeDefined();
    expect(Array.isArray(scanResponse.body?.data?.eligibleCounts)).toBe(true);
    expect(Array.isArray(scanResponse.body?.data?.reviewRequiredCounts)).toBe(
      true
    );
    expect(scanResponse.body?.data?.counts?.[0]?.sku).toBe('VISION-001');
  });
});
