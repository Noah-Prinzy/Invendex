import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import StockTransfer from '../models/StockTransfer.js';
import Warehouse from '../models/Warehouse.js';
import { transferStockBetweenWarehouses } from '../services/wmsService.js';
import { getTestDbUri } from './testDbUri.js';

const originalTestDbUri = process.env.MONGO_TEST_URI;

beforeAll(async () => {
  process.env.MONGO_TEST_URI =
    'mongodb://127.0.0.1:27017/ledgerly_test_wms_transfer';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    StockTransfer.deleteMany({}),
    Inventory.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
  process.env.MONGO_TEST_URI = originalTestDbUri;
});

describe('wms warehouse transfer', () => {
  it('moves stock between warehouses and supports idempotency', async () => {
    const organization = await Organization.create({
      name: 'Transfer Org',
      code: `TR-${Date.now()}`
    });

    const [fromWarehouse, toWarehouse] = await Warehouse.create([
      {
        organization: organization._id,
        name: 'Main',
        code: 'MAIN'
      },
      {
        organization: organization._id,
        name: 'Remote',
        code: 'REMOTE'
      }
    ]);

    const product = await Product.create({
      organization: organization._id,
      name: 'Transfer Product',
      sku: 'TR-001',
      price: 20,
      stock: 15
    });

    await Inventory.create([
      {
        organization: organization._id,
        product: product._id,
        warehouse: fromWarehouse._id,
        quantityOnHand: 12,
        quantityReserved: 0
      },
      {
        organization: organization._id,
        product: product._id,
        warehouse: toWarehouse._id,
        quantityOnHand: 3,
        quantityReserved: 0
      }
    ]);

    const idempotencyKey = `transfer-${Date.now()}`;
    const first = await transferStockBetweenWarehouses({
      organizationId: organization._id,
      productId: product._id,
      fromWarehouseId: fromWarehouse._id,
      toWarehouseId: toWarehouse._id,
      quantity: 4,
      idempotencyKey
    });

    expect(first?.deduplicated).toBe(false);
    expect(first?.transfer?._id).toBeTruthy();

    const second = await transferStockBetweenWarehouses({
      organizationId: organization._id,
      productId: product._id,
      fromWarehouseId: fromWarehouse._id,
      toWarehouseId: toWarehouse._id,
      quantity: 4,
      idempotencyKey
    });
    expect(second?.deduplicated).toBe(true);

    const [fromInventory, toInventory] = await Promise.all([
      Inventory.findOne({
        organization: organization._id,
        product: product._id,
        warehouse: fromWarehouse._id
      }).lean(),
      Inventory.findOne({
        organization: organization._id,
        product: product._id,
        warehouse: toWarehouse._id
      }).lean()
    ]);

    expect(Number(fromInventory.quantityOnHand)).toBe(8);
    expect(Number(toInventory.quantityOnHand)).toBe(7);

    const transferCount = await StockTransfer.countDocuments({
      organization: organization._id,
      product: product._id
    });
    expect(transferCount).toBe(1);
  });
});
