import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import { getTestDbUri } from './testDbUri.js';
import InventoryCostLayer from '../models/InventoryCostLayer.js';
import InventoryValuationConfig from '../models/InventoryValuationConfig.js';
import {
  consumeCostLayers,
  getOrCreateValuationConfig
} from '../services/finance/valuationService.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    Organization.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    InventoryCostLayer.deleteMany({}),
    InventoryValuationConfig.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('valuationService.consumeCostLayers', () => {
  const seedBase = async () => {
    const organization = await Organization.create({
      name: 'Valuation Org',
      code: 'VALUATION_ORG'
    });
    const product = await Product.create({
      organization: organization._id,
      name: 'Layered Product',
      sku: 'LAYER-001',
      price: 10,
      stock: 100
    });
    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Main',
      code: 'MAIN'
    });

    await getOrCreateValuationConfig(organization._id);

    return { organization, product, warehouse };
  };

  it('consumes layers in FIFO order', async () => {
    const { organization, product, warehouse } = await seedBase();

    const layerA = await InventoryCostLayer.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      sourceType: 'OPENING_BALANCE',
      unitCost: 5,
      quantityReceived: 10,
      quantityRemaining: 10,
      receivedAt: new Date('2024-01-01')
    });
    const layerB = await InventoryCostLayer.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      sourceType: 'OPENING_BALANCE',
      unitCost: 7,
      quantityReceived: 10,
      quantityRemaining: 10,
      receivedAt: new Date('2024-01-02')
    });

    const consumed = await consumeCostLayers({
      organizationId: organization._id,
      productId: product._id,
      warehouseId: warehouse._id,
      quantity: 12,
      method: 'FIFO'
    });

    expect(consumed.totalCost).toBe(64);
    expect(consumed.unitCost).toBe(5.33);

    const refreshedA = await InventoryCostLayer.findById(layerA._id);
    const refreshedB = await InventoryCostLayer.findById(layerB._id);
    expect(refreshedA.quantityRemaining).toBe(0);
    expect(refreshedB.quantityRemaining).toBe(8);
  });

  it('consumes layers in LIFO order', async () => {
    const { organization, product, warehouse } = await seedBase();

    const layerA = await InventoryCostLayer.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      sourceType: 'OPENING_BALANCE',
      unitCost: 5,
      quantityReceived: 10,
      quantityRemaining: 10,
      receivedAt: new Date('2024-01-01')
    });
    const layerB = await InventoryCostLayer.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      sourceType: 'OPENING_BALANCE',
      unitCost: 7,
      quantityReceived: 10,
      quantityRemaining: 10,
      receivedAt: new Date('2024-01-02')
    });

    const consumed = await consumeCostLayers({
      organizationId: organization._id,
      productId: product._id,
      warehouseId: warehouse._id,
      quantity: 12,
      method: 'LIFO'
    });

    expect(consumed.totalCost).toBe(80);
    expect(consumed.unitCost).toBe(6.67);

    const refreshedA = await InventoryCostLayer.findById(layerA._id);
    const refreshedB = await InventoryCostLayer.findById(layerB._id);
    expect(refreshedA.quantityRemaining).toBe(8);
    expect(refreshedB.quantityRemaining).toBe(0);
  });

  it('consumes layers using weighted average costing', async () => {
    const { organization, product, warehouse } = await seedBase();

    await InventoryCostLayer.create([
      {
        organization: organization._id,
        product: product._id,
        warehouse: warehouse._id,
        sourceType: 'OPENING_BALANCE',
        unitCost: 5,
        quantityReceived: 10,
        quantityRemaining: 10,
        receivedAt: new Date('2024-01-01')
      },
      {
        organization: organization._id,
        product: product._id,
        warehouse: warehouse._id,
        sourceType: 'OPENING_BALANCE',
        unitCost: 7,
        quantityReceived: 10,
        quantityRemaining: 10,
        receivedAt: new Date('2024-01-02')
      }
    ]);

    const consumed = await consumeCostLayers({
      organizationId: organization._id,
      productId: product._id,
      warehouseId: warehouse._id,
      quantity: 6,
      method: 'WEIGHTED_AVG'
    });

    expect(consumed.totalCost).toBe(36);
    expect(consumed.unitCost).toBe(6);

    const layers = await InventoryCostLayer.find({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id
    });
    const remainingQty = layers.reduce(
      (sum, layer) => sum + Number(layer.quantityRemaining),
      0
    );
    expect(remainingQty).toBe(14);
  });

  it('creates a single valuation config under parallel get-or-create calls', async () => {
    const organization = await Organization.create({
      name: 'Valuation Config Concurrency Org',
      code: 'VALUATION_CONFIG_CONCURRENCY_ORG'
    });

    const results = await Promise.all(
      Array.from({ length: 8 }).map(() =>
        getOrCreateValuationConfig(organization._id)
      )
    );

    const ids = new Set(results.map((entry) => String(entry._id)));
    expect(ids.size).toBe(1);

    const count = await InventoryValuationConfig.countDocuments({
      organization: organization._id
    });
    expect(count).toBe(1);
  });
});
