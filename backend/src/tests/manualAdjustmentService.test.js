import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import Inventory from '../models/Inventory.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import { adjustInventoryFromManualInput } from '../services/inventory/manualAdjustmentService.js';
import { getTestDbUri } from './testDbUri.js';

const originalRequireWarehouse =
  process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    AuditLog.deleteMany({}),
    Inventory.deleteMany({}),
    InventorySnapshot.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  if (originalRequireWarehouse === undefined) {
    delete process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID;
  } else {
    process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID =
      originalRequireWarehouse;
  }
  await mongoose.connection.close();
});

describe('manual inventory adjustment service', () => {
  const seedInventoryContext = async ({
    startingStock = 10,
    codePrefix = 'MAN-CTX'
  } = {}) => {
    const organization = await Organization.create({
      name: `Manual Org ${Date.now()}`,
      code: `${codePrefix}-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Manual Warehouse',
      code: `${codePrefix}-WH-${Date.now()}`
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'Manual Product',
      sku: `${codePrefix}-SKU-${Date.now()}`,
      price: 20,
      stock: startingStock
    });

    await Inventory.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: startingStock,
      quantityReserved: 0
    });

    return { organization, warehouse, product };
  };

  it('rejects adjustment without warehouseId when strict mode is enabled', async () => {
    process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID = 'true';

    const organization = await Organization.create({
      name: 'Manual Strict Org',
      code: `MANSTR-${Date.now()}`
    });
    const product = await Product.create({
      organization: organization._id,
      name: 'Manual Strict Product',
      sku: 'MAN-STRICT-1',
      price: 10,
      stock: 0
    });

    await expect(
      adjustInventoryFromManualInput({
        organizationId: organization._id,
        productId: product._id,
        amount: 2,
        reason: 'restock',
        warehouseId: null
      })
    ).rejects.toThrow('warehouseId is required');
  });

  it('applies adjustment with fallback warehouse when strict mode is disabled', async () => {
    process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID = 'false';

    const organization = await Organization.create({
      name: 'Manual Fallback Org',
      code: `MANFALL-${Date.now()}`
    });
    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Manual Fallback WH',
      code: 'MAN-F-WH'
    });
    const product = await Product.create({
      organization: organization._id,
      name: 'Manual Product',
      sku: 'MAN-F-1',
      price: 20,
      stock: 5
    });

    await Inventory.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: 5,
      quantityReserved: 0
    });

    const result = await adjustInventoryFromManualInput({
      organizationId: organization._id,
      productId: product._id,
      amount: -2,
      reason: 'sale',
      warehouseId: null,
      actorUserId: new mongoose.Types.ObjectId(),
      actorRole: 'staff'
    });

    expect(result.usedWarehouseFallback).toBe(true);
    expect(String(result.warehouseId)).toBe(String(warehouse._id));

    const inventory = await Inventory.findOne({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id
    }).lean();
    expect(inventory.quantityOnHand).toBe(3);

    const refreshedProduct = await Product.findById(product._id).lean();
    expect(refreshedProduct.stock).toBe(3);

    const snapshots = await InventorySnapshot.find({
      organization: organization._id,
      product: product._id
    }).lean();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].stock).toBe(3);
    expect(String(snapshots[0].warehouse)).toBe(String(warehouse._id));

    const auditRows = await AuditLog.find({
      organization: organization._id,
      action: 'ADJUST_PRODUCT_STOCK'
    }).lean();
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects amount direction that conflicts with reason policy', async () => {
    process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID = 'true';
    const { organization, warehouse, product } = await seedInventoryContext({
      startingStock: 10,
      codePrefix: 'MAN-DIR'
    });

    await expect(
      adjustInventoryFromManualInput({
        organizationId: organization._id,
        productId: product._id,
        amount: 3,
        reason: 'sale',
        warehouseId: warehouse._id,
        actorRole: 'admin',
        actorUserId: new mongoose.Types.ObjectId()
      })
    ).rejects.toThrow('only allows negative stock adjustments');
  });

  it('rejects sensitive reasons for staff when minimum role is manager', async () => {
    process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID = 'true';
    process.env.INVENTORY_SENSITIVE_REASON_MIN_ROLE = 'manager';

    const { organization, warehouse, product } = await seedInventoryContext({
      startingStock: 10,
      codePrefix: 'MAN-SENS'
    });

    await expect(
      adjustInventoryFromManualInput({
        organizationId: organization._id,
        productId: product._id,
        amount: -1,
        reason: 'damaged',
        warehouseId: warehouse._id,
        actorRole: 'staff',
        actorUserId: new mongoose.Types.ObjectId()
      })
    ).rejects.toThrow('requires role manager or higher');
  });

  it('allows sensitive reasons for manager role and records stock movement', async () => {
    process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID = 'true';
    process.env.INVENTORY_SENSITIVE_REASON_MIN_ROLE = 'manager';

    const { organization, warehouse, product } = await seedInventoryContext({
      startingStock: 8,
      codePrefix: 'MAN-OK'
    });

    const result = await adjustInventoryFromManualInput({
      organizationId: organization._id,
      productId: product._id,
      amount: -2,
      reason: 'damaged',
      warehouseId: warehouse._id,
      actorRole: 'manager',
      actorUserId: new mongoose.Types.ObjectId()
    });

    expect(result.reason).toBe('damaged');
    expect(result.isSensitiveReason).toBe(true);
    expect(result.sensitiveAdjustmentMinRole).toBe('manager');

    const inventory = await Inventory.findOne({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id
    }).lean();
    expect(Number(inventory?.quantityOnHand || 0)).toBe(6);
  });
});
