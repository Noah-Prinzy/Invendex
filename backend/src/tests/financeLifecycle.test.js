import mongoose from 'mongoose';
import CogsEntry from '../models/CogsEntry.js';
import Inventory from '../models/Inventory.js';
import InventoryCostLayer from '../models/InventoryCostLayer.js';
import Order from '../models/Order.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Warehouse from '../models/Warehouse.js';
import { getTestDbUri } from './testDbUri.js';
import { applyPurchaseOrderToInventory } from '../services/inventory/inventoryService.js';
import { recordCogsForCompletedSaleOrder } from '../services/finance/cogsService.js';
import { getGrossMarginReport } from '../services/finance/marginService.js';
import { getDeadStockItems } from '../services/finance/deadStockService.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    CogsEntry.deleteMany({}),
    Inventory.deleteMany({}),
    InventoryCostLayer.deleteMany({}),
    Order.deleteMany({}),
    Organization.deleteMany({}),
    Product.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Warehouse.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('finance lifecycle', () => {
  it('creates cost layers from PO, records COGS on sale completion, and computes margin/dead-stock', async () => {
    const organization = await Organization.create({
      name: 'Finance Org',
      code: `FIN-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Finance Warehouse',
      code: 'FIN-WH'
    });

    const productA = await Product.create({
      organization: organization._id,
      name: 'COGS Product',
      sku: 'COGS-001',
      price: 8,
      stock: 0
    });

    const productB = await Product.create({
      organization: organization._id,
      name: 'Dead Stock Product',
      sku: 'DEAD-001',
      price: 12,
      stock: 0
    });

    const purchaseOrder = await PurchaseOrder.create({
      organization: organization._id,
      supplier: new mongoose.Types.ObjectId(),
      warehouse: warehouse._id,
      items: [
        {
          product: productA._id,
          sku: productA.sku,
          quantity: 20,
          unitCost: 4,
          totalCost: 80
        }
      ],
      createdBy: new mongoose.Types.ObjectId()
    });

    await applyPurchaseOrderToInventory({ purchaseOrder });

    const costLayer = await InventoryCostLayer.findOne({
      organization: organization._id,
      product: productA._id,
      warehouse: warehouse._id
    });
    expect(costLayer).not.toBeNull();
    expect(costLayer.quantityRemaining).toBe(20);
    expect(costLayer.unitCost).toBe(4);

    await Inventory.create({
      organization: organization._id,
      product: productB._id,
      warehouse: warehouse._id,
      quantityOnHand: 15,
      quantityReserved: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      lastMovementAt: new Date('2023-01-01')
    });

    const order = await Order.create({
      organization: organization._id,
      type: 'sale',
      warehouse: warehouse._id,
      status: 'pending',
      products: [
        {
          product: productA._id,
          quantity: 5,
          warehouse: warehouse._id,
          unitSalePrice: 10,
          discountAmount: 0,
          taxAmount: 0
        }
      ]
    });

    const cogsEntries = await recordCogsForCompletedSaleOrder({
      orderId: order._id,
      organizationId: organization._id
    });

    expect(cogsEntries).toHaveLength(1);
    expect(cogsEntries[0].totalCogs).toBe(20);
    expect(cogsEntries[0].unitCogs).toBe(4);

    const refreshedLayer = await InventoryCostLayer.findById(costLayer._id);
    expect(refreshedLayer.quantityRemaining).toBe(15);

    const grossMargin = await getGrossMarginReport({
      organizationId: organization._id,
      groupBy: 'day'
    });
    expect(grossMargin.totals.revenue).toBe(50);
    expect(grossMargin.totals.cogs).toBe(20);
    expect(grossMargin.totals.grossMargin).toBe(30);

    const deadStock = await getDeadStockItems({
      organizationId: organization._id,
      days: 90,
      warehouseId: warehouse._id
    });
    expect(deadStock.count).toBeGreaterThanOrEqual(1);
    expect(deadStock.items.some((item) => item.sku === 'DEAD-001')).toBe(true);
  }, 15000);
});
