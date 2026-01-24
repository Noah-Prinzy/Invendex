import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '../src/models/Product.js';
import ReorderAlert from '../src/models/ReorderAlert.js';
import { runReorderEngine } from '../src/services/reorderEngine.js';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('creates forecast reorder alert when stock below reorder point', async () => {
  const product = await Product.create({
    name: 'Test Product',
    sku: 'TEST-001',
    price: 10,
    stock: 10,
    averageDailyUsage: 5,
    supplierLeadTimeDays: 7,
    safetyStockDays: 3
  });

  const alerts = await runReorderEngine({ triggeredBy: 'system' });

  const alert = await ReorderAlert.findOne({ product: product._id });

  expect(alert).toBeTruthy();
  expect(alert.source).toBe('forecast');
  expect(alert.stock).toBe(10);
});

test('does NOT create alert when stock is sufficient', async () => {
  await Product.create({
    name: 'Healthy Stock',
    sku: 'SAFE-001',
    price: 10,
    stock: 200,
    averageDailyUsage: 2,
    supplierLeadTimeDays: 5,
    safetyStockDays: 2
  });

  await runReorderEngine({ triggeredBy: 'system' });

  const alerts = await ReorderAlert.find();
  expect(alerts.length).toBe(0);
});

test('does not create duplicate active alerts for same product', async () => {
  const product = await Product.create({
    name: 'Duplicate Test',
    sku: 'DUP-001',
    price: 10,
    stock: 5,
    averageDailyUsage: 5,
    supplierLeadTimeDays: 5,
    safetyStockDays: 2
  });

  await runReorderEngine({ triggeredBy: 'system' });
  await runReorderEngine({ triggeredBy: 'system' });

  const alerts = await ReorderAlert.find({ product: product._id });
  expect(alerts.length).toBe(1);
});
