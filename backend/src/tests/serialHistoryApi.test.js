import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Inventory from '../models/Inventory.js';
import InventoryBatch from '../models/InventoryBatch.js';
import InventorySerial from '../models/InventorySerial.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Order from '../models/Order.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import StockMovement from '../models/StockMovement.js';
import Warehouse from '../models/Warehouse.js';
import { recordCogsForCompletedSaleOrder } from '../services/finance/cogsService.js';
import { applyPurchaseOrderToInventory } from '../services/inventory/inventoryService.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    Inventory.deleteMany({}),
    InventoryBatch.deleteMany({}),
    InventorySerial.deleteMany({}),
    InventorySnapshot.deleteMany({}),
    Order.deleteMany({}),
    Product.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    StockMovement.deleteMany({}),
    Warehouse.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('serial history api', () => {
  it(
    'returns serial timeline with received and sold events',
    async () => {
      const organization = await Organization.create({
        _id: TEST_ORG_ID,
        name: 'Serial History Org',
        code: `SER-HIST-${Date.now()}`
      });

      const warehouse = await Warehouse.create({
        organization: organization._id,
        name: 'History Warehouse',
        code: 'HIST-WH'
      });

      const product = await Product.create({
        organization: organization._id,
        name: 'History Product',
        sku: 'HIST-001',
        price: 55,
        stock: 0
      });

      const po = await PurchaseOrder.create({
        organization: organization._id,
        supplier: new mongoose.Types.ObjectId(),
        warehouse: warehouse._id,
        status: 'SENT',
        createdBy: new mongoose.Types.ObjectId(),
        items: [
          {
            product: product._id,
            sku: product.sku,
            quantity: 2,
            unitCost: 25,
            totalCost: 50,
            trackingType: 'SERIAL',
            lotNumber: 'LOT-HIST',
            serialNumbers: ['HIST-SN-001', 'HIST-SN-002']
          }
        ]
      });
      await applyPurchaseOrderToInventory({ purchaseOrder: po });

      const saleOrder = await Order.create({
        organization: organization._id,
        type: 'sale',
        warehouse: warehouse._id,
        status: 'pending',
        products: [
          {
            product: product._id,
            quantity: 1,
            warehouse: warehouse._id,
            unitSalePrice: 60,
            lotNumber: 'LOT-HIST',
            serialNumbers: ['HIST-SN-001']
          }
        ]
      });
      await recordCogsForCompletedSaleOrder({
        orderId: saleOrder._id,
        organizationId: organization._id
      });

      const response = await request(app).get(
        `/api/inventory-tracking/serials/HIST-SN-001/history?productId=${product._id}`
      );

      expect(response.status).toBe(200);
      expect(response.body?.success).toBe(true);
      expect(response.body?.data?.serial?.serialNumber).toBe('HIST-SN-001');
      expect(response.body?.data?.serial?.status).toBe('SOLD');

      const eventTypes = response.body?.data?.timeline?.map(event => event.eventType) || [];
      expect(eventTypes).toContain('RECEIVED');
      expect(eventTypes).toContain('SOLD');
      expect(eventTypes.some(type => String(type).startsWith('MOVEMENT_'))).toBe(true);
    },
    20000
  );
});
