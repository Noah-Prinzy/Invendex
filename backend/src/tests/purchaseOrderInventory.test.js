import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Organization from '../models/Organization.js';
import Warehouse from '../models/Warehouse.js';
import Inventory from '../models/Inventory.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import ReorderAlert from '../models/ReorderAlert.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { getTestDbUri } from './testDbUri.js';

import {
  applyPurchaseOrderToInventory
} from '../services/inventory/inventoryService.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    Product.deleteMany({}),
    Organization.deleteMany({}),
    Warehouse.deleteMany({}),
    Inventory.deleteMany({}),
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
      const organization = await Organization.create({
        name: 'Tenant One',
        code: 'TENANT_ONE'
      });

      const product = await Product.create({
        organization: organization._id,
        name: 'PO Test Product',
        sku: 'PO-SKU-001',
        price: 100,
        stock: 10,
        lowStockThreshold: 5,
        supplierLeadTimeDays: 5
      });
      const warehouse = await Warehouse.create({
        organization: organization._id,
        name: 'Main Warehouse',
        code: 'MAIN'
      });

      const alert = await ReorderAlert.create({
        organization: organization._id,
        product: product._id,
        sku: product.sku,
        stock: 10,
        reorderLevel: 15,
        reorderQuantity: 20,
        triggeredAt: new Date(),
        status: 'ACTIVE'
      });

      const purchaseOrder = await PurchaseOrder.create({
        organization: organization._id,
        supplier: new mongoose.Types.ObjectId(),
        warehouse: warehouse._id,
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

      const inventory = await Inventory.findOne({
        product: product._id,
        warehouse: warehouse._id
      });
      expect(inventory.quantityOnHand).toBe(20);

      const snapshots = await InventorySnapshot.find({
        product: product._id,
        purchaseOrder: purchaseOrder._id
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
      const organization = await Organization.create({
        name: 'Tenant Two',
        code: 'TENANT_TWO'
      });
      const product = await Product.create({
        organization: organization._id,
        name: 'Idempotent Product',
        sku: 'PO-SKU-002',
        price: 100,
        stock: 5
      });
      const warehouse = await Warehouse.create({
        organization: organization._id,
        name: 'Secondary Warehouse',
        code: 'SECONDARY'
      });

      const purchaseOrder = await PurchaseOrder.create({
        organization: organization._id,
        supplier: new mongoose.Types.ObjectId(),
        warehouse: warehouse._id,
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

      const inventory = await Inventory.findOne({
        product: product._id,
        warehouse: warehouse._id
      });
      expect(inventory.quantityOnHand).toBe(10);

      const snapshots = await InventorySnapshot.find({
        product: product._id,
        purchaseOrder: purchaseOrder._id
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
