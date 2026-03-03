import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Warehouse from '../models/Warehouse.js';
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import { getTestDbUri } from './testDbUri.js';
import { adjustInventoryFromManualInput } from '../services/inventory/manualAdjustmentService.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    Organization.deleteMany({}),
    Warehouse.deleteMany({}),
    Product.deleteMany({}),
    Inventory.deleteMany({}),
    InventorySnapshot.deleteMany({}),
    OrganizationSettings.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('manual adjustment UOM conversion', () => {
  it('converts purchase-unit restock adjustments into base units', async () => {
    const organization = await Organization.create({
      name: 'UOM Org',
      code: 'UOMORG'
    });
    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Main Warehouse',
      code: 'MAIN'
    });
    const product = await Product.create({
      organization: organization._id,
      name: 'UOM Adjust Product',
      sku: 'UOM-ADJ-001',
      price: 100,
      stock: 0,
      uom: {
        base: 'pcs',
        purchase: 'box',
        purchaseToBaseFactor: 12
      }
    });

    const result = await adjustInventoryFromManualInput({
      organizationId: organization._id,
      productId: product._id,
      warehouseId: warehouse._id,
      amount: 2,
      amountUnit: 'purchase',
      reason: 'restock'
    });

    expect(Number(result?.amount || 0)).toBe(24);
    expect(Number(result?.requestedAmount || 0)).toBe(2);
    expect(String(result?.requestedAmountUnit || '')).toBe('purchase');

    const inventory = await Inventory.findOne({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id
    }).lean();
    expect(Number(inventory?.quantityOnHand || 0)).toBe(24);

    const refreshedProduct = await Product.findById(product._id).lean();
    expect(Number(refreshedProduct?.stock || 0)).toBe(24);
  });

  it('applies purchase-unit sale adjustments against base stock and enforces available quantity', async () => {
    const organization = await Organization.create({
      name: 'UOM Org 2',
      code: 'UOMORG2'
    });
    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Main Warehouse',
      code: 'MAIN2'
    });
    const product = await Product.create({
      organization: organization._id,
      name: 'UOM Adjust Product 2',
      sku: 'UOM-ADJ-002',
      price: 100,
      stock: 0,
      uom: {
        base: 'pcs',
        purchase: 'box',
        purchaseToBaseFactor: 6
      }
    });

    await adjustInventoryFromManualInput({
      organizationId: organization._id,
      productId: product._id,
      warehouseId: warehouse._id,
      amount: 3,
      amountUnit: 'purchase',
      reason: 'restock'
    });

    await adjustInventoryFromManualInput({
      organizationId: organization._id,
      productId: product._id,
      warehouseId: warehouse._id,
      amount: -1,
      amountUnit: 'purchase',
      reason: 'sale'
    });

    const inventoryAfterSale = await Inventory.findOne({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id
    }).lean();
    expect(Number(inventoryAfterSale?.quantityOnHand || 0)).toBe(12);

    await expect(
      adjustInventoryFromManualInput({
        organizationId: organization._id,
        productId: product._id,
        warehouseId: warehouse._id,
        amount: -3,
        amountUnit: 'purchase',
        reason: 'sale'
      })
    ).rejects.toThrow('Insufficient inventory for this adjustment');
  });
});
