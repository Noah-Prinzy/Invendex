import mongoose from 'mongoose';
import Product from '../models/Product.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import ReorderAlert from '../models/ReorderAlert.js';
import SupplierProduct from '../models/SupplierProduct.js';
import { runReorderEngine } from '../services/reorderEngine.js';

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
    SupplierProduct.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Reorder Engine', () => {
  it(
    'creates a reorder alert when stock is below calculated reorder level',
    async () => {
      const product = await Product.create({
        name: 'Test Product',
        sku: 'TEST-SKU-001',
        price: 100,
        stock: 5,
        lowStockThreshold: 5,
        supplierLeadTimeDays: 7
      });

      await InventorySnapshot.create([
        {
          product: product._id,
          sku: product.sku,
          stock: 20,
          price: 100,
          recordedAt: new Date('2024-01-01')
        },
        {
          product: product._id,
          sku: product.sku,
          stock: 5,
          price: 100,
          recordedAt: new Date('2024-01-02')
        }
      ]);

      const result = await runReorderEngine();

      const alerts = await ReorderAlert.find({ sku: product.sku });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].status).toBe('ACTIVE');
      expect(alerts[0].reorderQuantity).toBeGreaterThan(0);
      expect(result.generated).toBe(1);
    },
    10000
  );

  it(
    'does NOT create duplicate active reorder alerts on the same day',
    async () => {
      const product = await Product.create({
        name: 'Test Product',
        sku: 'TEST-SKU-002',
        price: 100,
        stock: 5,
        lowStockThreshold: 5,
        supplierLeadTimeDays: 7
      });

      await InventorySnapshot.create([
        {
          product: product._id,
          sku: product.sku,
          stock: 20,
          price: 100,
          recordedAt: new Date('2024-01-01')
        },
        {
          product: product._id,
          sku: product.sku,
          stock: 5,
          price: 100,
          recordedAt: new Date('2024-01-02')
        }
      ]);

      const firstRun = await runReorderEngine();
      expect(firstRun.generated).toBe(1);

      const secondRun = await runReorderEngine();
      expect(secondRun.generated).toBe(0);

      const alerts = await ReorderAlert.find({ sku: product.sku });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].status).toBe('ACTIVE');
    },
    10000
  );

  it(
    'creates a NEW reorder alert after the previous one is resolved',
    async () => {
      const product = await Product.create({
        name: 'Test Product',
        sku: 'TEST-SKU-003',
        price: 100,
        stock: 5,
        lowStockThreshold: 5,
        supplierLeadTimeDays: 7
      });

      await InventorySnapshot.create([
        {
          product: product._id,
          sku: product.sku,
          stock: 20,
          price: 100,
          recordedAt: new Date('2024-01-01')
        },
        {
          product: product._id,
          sku: product.sku,
          stock: 5,
          price: 100,
          recordedAt: new Date('2024-01-02')
        }
      ]);

      const firstRun = await runReorderEngine();
      expect(firstRun.generated).toBe(1);

      const alert = await ReorderAlert.findOne({ sku: product.sku });
      alert.resolved = true;
      await alert.save();

      const secondRun = await runReorderEngine();
      expect(secondRun.generated).toBe(1);

      const alerts = await ReorderAlert.find({ sku: product.sku });
      expect(alerts).toHaveLength(2);
    },
    10000
  );

  it(
    'respects supplier minimum order quantity (MOQ)',
    async () => {
      const product = await Product.create({
        name: 'MOQ Product',
        sku: 'TEST-SKU-MOQ',
        price: 50,
        stock: 2,
        lowStockThreshold: 5,
        supplierLeadTimeDays: 5
      });

      await SupplierProduct.create({
        supplier: new mongoose.Types.ObjectId(),
        product: product._id,
        sku: product.sku,
        unitCost: 40,
        leadTimeDays: 5,
        minimumOrderQuantity: 20,
        isPreferred: true
      });

      await InventorySnapshot.create([
        {
          product: product._id,
          sku: product.sku,
          stock: 10,
          price: 50,
          recordedAt: new Date('2024-01-01')
        },
        {
          product: product._id,
          sku: product.sku,
          stock: 2,
          price: 50,
          recordedAt: new Date('2024-01-02')
        }
      ]);

      const result = await runReorderEngine();

      const alert = await ReorderAlert.findOne({ sku: product.sku });

      expect(result.generated).toBe(1);
      expect(alert).not.toBeNull();
      expect(alert.reorderQuantity).toBe(20); // 👈 MOQ enforced
    },
    10000
  );
});