import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import IdempotencyRequest from '../models/IdempotencyRequest.js';
import Inventory from '../models/Inventory.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Warehouse from '../models/Warehouse.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const originalAuthBypass = process.env.AUTH_TEST_BYPASS;
const originalStrictWarehouse =
  process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID;

beforeAll(async () => {
  process.env.AUTH_TEST_BYPASS = 'true';
  process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID = 'true';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    IdempotencyRequest.deleteMany({}),
    InventorySnapshot.deleteMany({}),
    Inventory.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    Organization.deleteMany({})
  ]);

  await Organization.create({
    _id: TEST_ORG_ID,
    name: 'Idempotency Org',
    code: `IDEMP-${Date.now()}`
  });
});

afterAll(async () => {
  process.env.AUTH_TEST_BYPASS = originalAuthBypass;
  process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID = originalStrictWarehouse;
  await mongoose.connection.close();
});

describe('idempotency for high-risk mutation endpoints', () => {
  it('replays product stock adjustment once for the same idempotency key', async () => {
    const warehouse = await Warehouse.create({
      organization: TEST_ORG_ID,
      name: 'Main Warehouse',
      code: 'IDEMP-WH-01'
    });

    const product = await Product.create({
      organization: TEST_ORG_ID,
      name: 'Idempotent Product',
      sku: `IDEMP-P-${Date.now()}`,
      price: 15,
      stock: 0
    });

    await Inventory.create({
      organization: TEST_ORG_ID,
      warehouse: warehouse._id,
      product: product._id,
      quantityOnHand: 0,
      quantityReserved: 0
    });

    const key = `adjust-${Date.now()}`;
    const body = {
      amount: 5,
      reason: 'restock',
      warehouseId: String(warehouse._id)
    };

    const firstResponse = await request(app)
      .patch(`/api/products/${product._id}/stock`)
      .set('Idempotency-Key', key)
      .send(body);

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body?.success).toBe(true);

    const secondResponse = await request(app)
      .patch(`/api/products/${product._id}/stock`)
      .set('Idempotency-Key', key)
      .send(body);

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body?.success).toBe(true);
    expect(secondResponse.headers['x-idempotency-replayed']).toBe('true');

    const inventory = await Inventory.findOne({
      organization: TEST_ORG_ID,
      warehouse: warehouse._id,
      product: product._id
    }).lean();
    expect(inventory.quantityOnHand).toBe(5);

    const idempotencyRows = await IdempotencyRequest.find({
      organization: TEST_ORG_ID,
      scope: 'MANUAL_STOCK_ADJUSTMENT',
      key
    }).lean();
    expect(idempotencyRows).toHaveLength(1);
    expect(idempotencyRows[0].status).toBe('COMPLETED');
  });

  it('rejects reusing a stock adjustment idempotency key with different payload', async () => {
    const warehouse = await Warehouse.create({
      organization: TEST_ORG_ID,
      name: 'Main Warehouse',
      code: 'IDEMP-WH-02'
    });

    const product = await Product.create({
      organization: TEST_ORG_ID,
      name: 'Payload Drift Product',
      sku: `IDEMP-PD-${Date.now()}`,
      price: 20,
      stock: 0
    });

    await Inventory.create({
      organization: TEST_ORG_ID,
      warehouse: warehouse._id,
      product: product._id,
      quantityOnHand: 0,
      quantityReserved: 0
    });

    const key = `adjust-drift-${Date.now()}`;

    const firstResponse = await request(app)
      .patch(`/api/products/${product._id}/stock`)
      .set('Idempotency-Key', key)
      .send({
        amount: 2,
        reason: 'restock',
        warehouseId: String(warehouse._id)
      });
    expect(firstResponse.status).toBe(200);

    const secondResponse = await request(app)
      .patch(`/api/products/${product._id}/stock`)
      .set('Idempotency-Key', key)
      .send({
        amount: 3,
        reason: 'restock',
        warehouseId: String(warehouse._id)
      });

    expect(secondResponse.status).toBe(409);
    expect(String(secondResponse.body?.message || '')).toContain(
      'different request payload'
    );

    const inventory = await Inventory.findOne({
      organization: TEST_ORG_ID,
      warehouse: warehouse._id,
      product: product._id
    }).lean();
    expect(inventory.quantityOnHand).toBe(2);
  });

  it('replays purchase order receive once for the same idempotency key', async () => {
    const warehouse = await Warehouse.create({
      organization: TEST_ORG_ID,
      name: 'PO Warehouse',
      code: 'IDEMP-WH-03'
    });

    const product = await Product.create({
      organization: TEST_ORG_ID,
      name: 'PO Product',
      sku: `IDEMP-PO-${Date.now()}`,
      price: 11,
      stock: 0
    });

    const purchaseOrder = await PurchaseOrder.create({
      organization: TEST_ORG_ID,
      supplier: new mongoose.Types.ObjectId(),
      warehouse: warehouse._id,
      status: 'SENT',
      createdBy: new mongoose.Types.ObjectId(),
      items: [
        {
          product: product._id,
          sku: product.sku,
          quantity: 10,
          unitCost: 4,
          totalCost: 40
        }
      ]
    });

    const key = `po-receive-${Date.now()}`;

    const firstResponse = await request(app)
      .patch(`/api/purchase-orders/${purchaseOrder._id}/receive`)
      .set('Idempotency-Key', key)
      .send({});
    expect(firstResponse.status).toBe(200);

    const secondResponse = await request(app)
      .patch(`/api/purchase-orders/${purchaseOrder._id}/receive`)
      .set('Idempotency-Key', key)
      .send({});
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.headers['x-idempotency-replayed']).toBe('true');

    const inventory = await Inventory.findOne({
      organization: TEST_ORG_ID,
      warehouse: warehouse._id,
      product: product._id
    }).lean();
    expect(inventory.quantityOnHand).toBe(10);

    const snapshots = await InventorySnapshot.find({
      organization: TEST_ORG_ID,
      purchaseOrder: purchaseOrder._id,
      product: product._id
    }).lean();
    expect(snapshots).toHaveLength(1);

    const idempotencyRows = await IdempotencyRequest.find({
      organization: TEST_ORG_ID,
      scope: 'RECEIVE_PURCHASE_ORDER',
      key
    }).lean();
    expect(idempotencyRows).toHaveLength(1);
    expect(idempotencyRows[0].status).toBe('COMPLETED');
  });
});
