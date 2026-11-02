import mongoose from 'mongoose';
import BinInventory from '../models/BinInventory.js';
import Inventory from '../models/Inventory.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import WarehouseBin from '../models/WarehouseBin.js';
import {
  getDeadStockIntelligence,
  getDeadStockRescuePlan,
  getInventoryAdvisorRecommendations,
  getStockAgingBuckets,
  getWarehouseDigitalTwin
} from '../services/dashboardService.js';
import { getTestDbUri } from './testDbUri.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    BinInventory.deleteMany({}),
    Inventory.deleteMany({}),
    Product.deleteMany({}),
    WarehouseBin.deleteMany({}),
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
      code: `DASH-${Date.now()}-W${process.env.JEST_WORKER_ID || 0}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Dashboard Warehouse',
      code: `DASH-WH-W${process.env.JEST_WORKER_ID || 0}`
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

  it('scopes stock aging buckets to the selected warehouse', async () => {
    const organization = await Organization.create({
      name: 'Dashboard Aging Org',
      code: `DASH-AGING-${Date.now()}-W${process.env.JEST_WORKER_ID || 0}`
    });

    const [warehouseA, warehouseB] = await Warehouse.create([
      {
        organization: organization._id,
        name: 'Warehouse A',
        code: `AGING-A-W${process.env.JEST_WORKER_ID || 0}`
      },
      {
        organization: organization._id,
        name: 'Warehouse B',
        code: `AGING-B-W${process.env.JEST_WORKER_ID || 0}`
      }
    ]);

    const [productA, productB] = await Product.create([
      {
        organization: organization._id,
        name: 'Aging Product A',
        sku: 'AGE-A',
        price: 10,
        stock: 0
      },
      {
        organization: organization._id,
        name: 'Aging Product B',
        sku: 'AGE-B',
        price: 10,
        stock: 0
      }
    ]);

    await Inventory.create([
      {
        organization: organization._id,
        product: productA._id,
        warehouse: warehouseA._id,
        quantityOnHand: 5,
        quantityReserved: 0,
        lastMovementAt: new Date('2026-02-20')
      },
      {
        organization: organization._id,
        product: productB._id,
        warehouse: warehouseB._id,
        quantityOnHand: 9,
        quantityReserved: 0,
        lastMovementAt: new Date('2025-10-01')
      }
    ]);

    const seeded = await Inventory.countDocuments({
      organization: organization._id
    });
    expect(seeded).toBe(2);

    const scoped = await getStockAgingBuckets({
      organizationId: organization._id,
      warehouseId: warehouseA._id
    });

    expect(scoped.items).toHaveLength(1);
    expect(scoped.items[0].sku).toBe('AGE-A');
    expect(scoped.summary.bucket0to30.quantity).toBe(5);
    expect(scoped.summary.bucket90plus.quantity).toBe(0);
  });

  it('builds inventory advisor and dead stock rescue actions', async () => {
    const organization = await Organization.create({
      name: 'Dashboard Advisor Org',
      code: `DASH-ADV-${Date.now()}-W${process.env.JEST_WORKER_ID || 0}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Advisor Warehouse',
      code: 'ADVISOR-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'Stale Product',
      sku: 'STALE-001',
      price: 14,
      lowStockThreshold: 3,
      stock: 0
    });

    await Inventory.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: 32,
      quantityReserved: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      lastMovementAt: new Date('2023-12-01')
    });

    const advisor = await getInventoryAdvisorRecommendations({
      organizationId: organization._id,
      days: 30,
      warehouseId: warehouse._id,
      limit: 10
    });
    expect(Array.isArray(advisor.recommendations)).toBe(true);
    expect(advisor.recommendations.length).toBeGreaterThan(0);
    expect(advisor.recommendations.some((row) => row.sku === 'STALE-001')).toBe(
      true
    );

    const rescuePlan = await getDeadStockRescuePlan({
      organizationId: organization._id,
      days: 90,
      warehouseId: warehouse._id,
      limit: 10
    });
    expect(Array.isArray(rescuePlan.actions)).toBe(true);
    expect(rescuePlan.actions.length).toBe(1);
    expect(rescuePlan.actions[0].sku).toBe('STALE-001');
    expect(rescuePlan.actions[0].recommendedAction).toBeTruthy();
  });

  it('builds warehouse digital twin occupancy and zone summary', async () => {
    const organization = await Organization.create({
      name: 'Dashboard Twin Org',
      code: `DASH-TWIN-${Date.now()}-W${process.env.JEST_WORKER_ID || 0}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Twin Warehouse',
      code: 'TWIN-WH'
    });

    const [productA, productB] = await Product.create([
      {
        organization: organization._id,
        name: 'Twin Product A',
        sku: 'TWIN-A',
        price: 10,
        stock: 0
      },
      {
        organization: organization._id,
        name: 'Twin Product B',
        sku: 'TWIN-B',
        price: 12,
        stock: 0
      }
    ]);

    const [binA, binB] = await WarehouseBin.create([
      {
        organization: organization._id,
        warehouse: warehouse._id,
        code: 'A-01',
        zone: 'A',
        maxCapacityUnits: 20
      },
      {
        organization: organization._id,
        warehouse: warehouse._id,
        code: 'B-01',
        zone: 'B',
        maxCapacityUnits: 10
      }
    ]);

    await BinInventory.create([
      {
        organization: organization._id,
        warehouse: warehouse._id,
        bin: binA._id,
        product: productA._id,
        quantityOnHand: 8,
        quantityReserved: 1
      },
      {
        organization: organization._id,
        warehouse: warehouse._id,
        bin: binB._id,
        product: productB._id,
        quantityOnHand: 4,
        quantityReserved: 0
      }
    ]);

    await Inventory.create([
      {
        organization: organization._id,
        product: productA._id,
        warehouse: warehouse._id,
        quantityOnHand: 11,
        quantityReserved: 1,
        reorderPoint: 0,
        reorderQuantity: 0
      },
      {
        organization: organization._id,
        product: productB._id,
        warehouse: warehouse._id,
        quantityOnHand: 6,
        quantityReserved: 0,
        reorderPoint: 0,
        reorderQuantity: 0
      }
    ]);

    const result = await getWarehouseDigitalTwin({
      organizationId: organization._id,
      warehouseId: warehouse._id
    });

    expect(result.totals.warehouses).toBe(1);
    expect(result.totals.bins).toBe(2);
    expect(result.totals.unitsBinned).toBe(12);
    expect(result.totals.unitsUnbinned).toBe(5);
    expect(Array.isArray(result.warehouses)).toBe(true);
    expect(result.warehouses[0].warehouseCode).toBe('TWIN-WH');
    expect(result.warehouses[0].totals.quantityOnHand).toBe(17);
    expect(result.warehouses[0].totals.quantityUnbinned).toBe(5);
    expect(result.warehouses[0].zones.length).toBe(2);
  });
});
