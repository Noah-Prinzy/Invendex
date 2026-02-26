import mongoose from 'mongoose';
import BinInventory from '../models/BinInventory.js';
import Inventory from '../models/Inventory.js';
import InventoryBatch from '../models/InventoryBatch.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import WarehouseBin from '../models/WarehouseBin.js';
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
    InventoryBatch.deleteMany({}),
    WarehouseBin.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('inventory invariant guards', () => {
  it('rejects Inventory where quantityReserved exceeds quantityOnHand', async () => {
    const organization = await Organization.create({
      name: 'Inventory Invariant Org',
      code: `INV-INVAR-${Date.now()}`
    });
    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Invariant WH',
      code: 'INV-WH'
    });
    const product = await Product.create({
      organization: organization._id,
      name: 'Invariant Product',
      sku: 'INV-P-1',
      price: 10
    });

    await expect(
      Inventory.create({
        organization: organization._id,
        warehouse: warehouse._id,
        product: product._id,
        quantityOnHand: 2,
        quantityReserved: 3
      })
    ).rejects.toThrow('quantityReserved cannot exceed quantityOnHand');
  });

  it('rejects BinInventory where quantityReserved exceeds quantityOnHand', async () => {
    const organization = await Organization.create({
      name: 'Bin Invariant Org',
      code: `BIN-INVAR-${Date.now()}`
    });
    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Bin WH',
      code: 'BIN-WH'
    });
    const product = await Product.create({
      organization: organization._id,
      name: 'Bin Product',
      sku: 'BIN-P-1',
      price: 15
    });
    const bin = await WarehouseBin.create({
      organization: organization._id,
      warehouse: warehouse._id,
      code: 'BIN-A'
    });

    await expect(
      BinInventory.create({
        organization: organization._id,
        warehouse: warehouse._id,
        bin: bin._id,
        product: product._id,
        quantityOnHand: 1,
        quantityReserved: 2
      })
    ).rejects.toThrow('quantityReserved cannot exceed quantityOnHand');
  });

  it('rejects InventoryBatch where quantityReserved exceeds quantityOnHand', async () => {
    const organization = await Organization.create({
      name: 'Batch Invariant Org',
      code: `BATCH-INVAR-${Date.now()}`
    });
    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Batch WH',
      code: 'BATCH-WH'
    });
    const product = await Product.create({
      organization: organization._id,
      name: 'Batch Product',
      sku: 'BATCH-P-1',
      price: 20
    });

    await expect(
      InventoryBatch.create({
        organization: organization._id,
        warehouse: warehouse._id,
        product: product._id,
        lotNumber: 'LOT-1',
        quantityOnHand: 5,
        quantityReserved: 6
      })
    ).rejects.toThrow('quantityReserved cannot exceed quantityOnHand');
  });
});
