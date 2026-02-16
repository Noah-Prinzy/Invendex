import mongoose from 'mongoose';
import Product from '../models/Product.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import ReorderAlert from '../models/ReorderAlert.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

import {
  applyPurchaseOrderToInventory
} from '../services/inventory/inventoryService.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_TEST_URI);
  }
});

beforeEach(async () => {
  await Promise.all([
    Product.deleteMany({}),
    InventorySnapshot.deleteMany({}),
    ReorderAlert.deleteMany({}),
    PurchaseOrder.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('applyPurchaseOrderToInventory', () => {
  it(
    'increments product stock and creates inventory snapshot',
    async () => {
      const product = await Product.create({
        name: 'PO Test Product',
        sku: 'PO-SKU-001',
        price: 100,
        stock: 10,
        lowStockThreshold: 5,
        supplierLeadTimeDays: 5
      });

      const alert = await ReorderAlert.create({
        product: product._id,
        sku: product.sku,
        stock: 10,
        reorderLevel: 15,
        reorderQuantity: 20,
        triggeredAt: new Date(),
        status: 'ACTIVE'
      });

      const purchaseOrder = await PurchaseOrder.create({
        supplier: new mongoose.Types.ObjectId(),
        items: [
          {
            product: product._id,
            sku: product.sku,
            quantity: 20,
            unitCost: 50,
            totalCost: 1000,
            reorderAlert: alert._id
          }
        ],
        createdBy: new mongoose.Types.ObjectId()
      });

      await applyPurchaseOrderToInventory({ purchaseOrder });

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(30);

      const snapshots = await InventorySnapshot.find({
        product: product._id
      });
      expect(snapshots).toHaveLength(1);

      const updatedAlert = await ReorderAlert.findById(alert._id);
      expect(updatedAlert.resolved).toBe(true);
    },
    10000
  );

  it(
    'is idempotent when applied twice',
    async () => {
      const product = await Product.create({
        name: 'Idempotent Product',
        sku: 'PO-SKU-002',
        price: 100,
        stock: 5
      });

      const purchaseOrder = await PurchaseOrder.create({
        supplier: new mongoose.Types.ObjectId(),
        items: [
          {
            product: product._id,
            sku: product.sku,
            quantity: 10,
            unitCost: 30,
            totalCost: 300
          }
        ],
        createdBy: new mongoose.Types.ObjectId()
      });

      await applyPurchaseOrderToInventory({ purchaseOrder });
      await applyPurchaseOrderToInventory({ purchaseOrder });

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(15);

      const snapshots = await InventorySnapshot.find({
        product: product._id
      });
      expect(snapshots).toHaveLength(1);
    },
    10000
  );

  it(
    'throws an error if purchase order is invalid',
    async () => {
      await expect(
        applyPurchaseOrderToInventory({ purchaseOrder: null })
      ).rejects.toThrow();
    },
    10000
  );
});