import mongoose from 'mongoose';
import BinInventory from '../models/BinInventory.js';
import Inventory from '../models/Inventory.js';
import InventoryCostLayer from '../models/InventoryCostLayer.js';
import InventoryIntegrityReport from '../models/InventoryIntegrityReport.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import {
  getInventoryIntegrityHistory,
  persistInventoryIntegrityReport,
  runInventoryIntegrityCheck
} from '../services/inventory/inventoryIntegrityService.js';
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
    InventoryCostLayer.deleteMany({}),
    InventoryIntegrityReport.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('inventory integrity service', () => {
  it('detects inventory drift against bin totals', async () => {
    const organization = await Organization.create({
      name: 'Integrity Org',
      code: `INT-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Integrity Warehouse',
      code: 'INT-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'Integrity Product',
      sku: 'INT-001',
      price: 20,
      stock: 0
    });

    await Inventory.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: 10,
      quantityReserved: 1
    });

    await InventoryCostLayer.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      sourceType: 'ADJUSTMENT',
      sourceId: null,
      unitCost: 10,
      quantityReceived: 10,
      quantityRemaining: 10,
      receivedAt: new Date()
    });

    await BinInventory.create([
      {
        organization: organization._id,
        warehouse: warehouse._id,
        bin: new mongoose.Types.ObjectId(),
        product: product._id,
        quantityOnHand: 4,
        quantityReserved: 1
      },
      {
        organization: organization._id,
        warehouse: warehouse._id,
        bin: new mongoose.Types.ObjectId(),
        product: product._id,
        quantityOnHand: 3,
        quantityReserved: 0
      }
    ]);

    const report = await runInventoryIntegrityCheck({
      organizationId: organization._id
    });

    expect(report.driftCount).toBe(1);
    expect(report.findings).toHaveLength(1);
    expect(
      report.findings[0].issues.some(
        (issue) => issue.code === 'BIN_ON_HAND_DRIFT'
      )
    ).toBe(true);
  });

  it('auto-fixes drift using the best available source summary', async () => {
    const organization = await Organization.create({
      name: 'Integrity Fix Org',
      code: `INTFIX-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Integrity Fix Warehouse',
      code: 'IFX-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'Integrity Fix Product',
      sku: 'IFX-001',
      price: 30,
      stock: 0
    });

    const inventory = await Inventory.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: 12,
      quantityReserved: 2
    });

    await BinInventory.create({
      organization: organization._id,
      warehouse: warehouse._id,
      bin: new mongoose.Types.ObjectId(),
      product: product._id,
      quantityOnHand: 9,
      quantityReserved: 1
    });

    const report = await runInventoryIntegrityCheck({
      organizationId: organization._id,
      autoFix: true
    });

    expect(report.driftCount).toBe(1);
    expect(report.autoFixAppliedCount).toBe(1);

    const updated = await Inventory.findById(inventory._id).lean();
    expect(updated.quantityOnHand).toBe(9);
    expect(updated.quantityReserved).toBe(1);
  });

  it('persists report summaries and returns scoped history', async () => {
    const organization = await Organization.create({
      name: 'Integrity History Org',
      code: `INTHIST-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'History Warehouse',
      code: 'IH-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'History Product',
      sku: 'IH-001',
      price: 55
    });

    await Inventory.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: 8,
      quantityReserved: 0
    });

    await BinInventory.create({
      organization: organization._id,
      warehouse: warehouse._id,
      bin: new mongoose.Types.ObjectId(),
      product: product._id,
      quantityOnHand: 7,
      quantityReserved: 0
    });

    const report = await runInventoryIntegrityCheck({
      organizationId: organization._id
    });
    const persisted = await persistInventoryIntegrityReport({
      organizationId: organization._id,
      report
    });

    expect(persisted).not.toBeNull();
    expect(persisted.organization.toString()).toBe(organization._id.toString());

    const history = await getInventoryIntegrityHistory({
      organizationId: organization._id,
      days: 30,
      limit: 10
    });

    expect(history).toHaveLength(1);
    expect(history[0].driftCount).toBe(report.driftCount);
  });
});
