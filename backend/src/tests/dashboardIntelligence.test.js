import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import { getDeadStockIntelligence } from '../services/dashboardService.js';
import { getTestDbUri } from './testDbUri.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    Inventory.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('dashboard intelligence', () => {
  it('returns dead stock intelligence with threshold filtering', async () => {
    const organization = await Organization.create({
      name: 'Dashboard Org',
      code: `DASH-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Dashboard Warehouse',
      code: 'DASH-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'Aging Product',
      sku: 'AGE-001',
      price: 10,
      stock: 0
    });

    await Inventory.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: 25,
      quantityReserved: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      lastMovementAt: new Date('2024-01-01')
    });

    const result = await getDeadStockIntelligence({
      organizationId: organization._id,
      days: 90,
      warehouseId: warehouse._id,
      limit: 10
    });

    expect(result.count).toBe(1);
    expect(result.items[0].sku).toBe('AGE-001');
  });
});
