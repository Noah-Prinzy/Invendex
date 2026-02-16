import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { io as createClient } from 'socket.io-client';
import request from 'supertest';

import app from '../app.js';
import Inventory from '../models/Inventory.js';
import InventoryCostLayer from '../models/InventoryCostLayer.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import User from '../models/User.js';
import Warehouse from '../models/Warehouse.js';
import { getIo, initSocketServer } from '../realtime/socketServer.js';
import { getTestDbUri } from './testDbUri.js';
import { generateAccessToken } from '../utils/token.js';

let httpServer;
let baseUrl;

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const waitForEvent = (emitter, eventName, timeoutMs = 6000) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for event "${eventName}"`));
    }, timeoutMs);

    emitter.once(eventName, payload => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });

beforeAll(async () => {
  if (!process.env.JWT_ACCESS_SECRET) {
    process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }

  httpServer = createServer(app);
  await initSocketServer(httpServer, { enabled: true });

  await new Promise(resolve => {
    httpServer.listen(0, '127.0.0.1', () => {
      const { port } = httpServer.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

beforeEach(async () => {
  await Promise.all([
    Inventory.deleteMany({}),
    InventoryCostLayer.deleteMany({}),
    InventorySnapshot.deleteMany({}),
    Product.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    User.deleteMany({}),
    Warehouse.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  const io = getIo();
  if (io) {
    await new Promise(resolve => io.close(resolve));
  }

  if (httpServer) {
    await new Promise(resolve => httpServer.close(resolve));
  }

  await mongoose.connection.close();
});

describe('finance + realtime smoke flow', () => {
  it('rejects invalid finance query parameters with 400', async () => {
    const response = await request(baseUrl).get(
      '/api/finance/valuation?method=INVALID_METHOD'
    );

    expect(response.status).toBe(400);
    expect(response.body?.success).toBe(false);
    expect(String(response.body?.message || '')).toContain(
      'method must be FIFO, LIFO, or WEIGHTED_AVG'
    );
  });

  it(
    'receives PO, emits realtime events, and refreshes valuation totals',
    async () => {
      const organization = await Organization.create({
        _id: TEST_ORG_ID,
        name: 'Smoke Org',
        code: `SMOKE-${Date.now()}`
      });

      const realtimeUser = await User.create({
        email: `smoke-admin-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'admin',
        organization: organization._id
      });

      const client = createClient(baseUrl, {
        transports: ['websocket'],
        reconnection: false,
        auth: { token: generateAccessToken(realtimeUser) }
      });
      await waitForEvent(client, 'connect');

      const warehouse = await Warehouse.create({
        organization: organization._id,
        name: 'Smoke Warehouse',
        code: 'SMOKE-WH'
      });

      const product = await Product.create({
        organization: organization._id,
        name: 'Smoke Product',
        sku: 'SMK-001',
        price: 9,
        stock: 0
      });

      const purchaseOrder = await PurchaseOrder.create({
        organization: organization._id,
        supplier: new mongoose.Types.ObjectId(),
        warehouse: warehouse._id,
        status: 'SENT',
        createdBy: new mongoose.Types.ObjectId(),
        items: [
          {
            product: product._id,
            sku: product.sku,
            quantity: 10,
            unitCost: 6,
            totalCost: 60
          }
        ]
      });

      const inventoryUpdatedPromise = waitForEvent(client, 'inventory.updated');
      const purchaseOrderReceivedPromise = waitForEvent(
        client,
        'purchase_order.received'
      );
      const valuationUpdatedPromise = waitForEvent(
        client,
        'finance.valuation_updated'
      );

      const receiveResponse = await request(baseUrl).patch(
        `/api/purchase-orders/${purchaseOrder._id}/receive`
      );

      expect(receiveResponse.status).toBe(200);
      expect(receiveResponse.body?.success).toBe(true);

      const [inventoryUpdated, purchaseOrderReceived, valuationUpdated] =
        await Promise.all([
          inventoryUpdatedPromise,
          purchaseOrderReceivedPromise,
          valuationUpdatedPromise
        ]);

      expect(inventoryUpdated.organizationId).toBe(String(organization._id));
      expect(inventoryUpdated.entityType).toBe('INVENTORY');
      expect(inventoryUpdated.data?.purchaseOrderId).toBe(
        String(purchaseOrder._id)
      );

      expect(purchaseOrderReceived.organizationId).toBe(
        String(organization._id)
      );
      expect(purchaseOrderReceived.entityType).toBe('PURCHASE_ORDER');
      expect(purchaseOrderReceived.entityId).toBe(String(purchaseOrder._id));

      expect(valuationUpdated.organizationId).toBe(String(organization._id));
      expect(valuationUpdated.entityType).toBe('INVENTORY_VALUATION');
      expect(valuationUpdated.data?.reason).toBe('purchase_order_receive');

      const valuationResponse = await request(baseUrl).get(
        `/api/finance/valuation?warehouseId=${warehouse._id}`
      );
      expect(valuationResponse.status).toBe(200);
      expect(valuationResponse.body?.success).toBe(true);
      expect(valuationResponse.body?.data?.method).toBe('WEIGHTED_AVG');
      expect(valuationResponse.body?.data?.totalInventoryValue).toBe(60);
      expect(valuationResponse.body?.data?.itemCount).toBe(1);

      const inventory = await Inventory.findOne({
        organization: organization._id,
        product: product._id,
        warehouse: warehouse._id
      }).lean();
      expect(inventory.quantityOnHand).toBe(10);

      client.disconnect();
    },
    20000
  );
});
