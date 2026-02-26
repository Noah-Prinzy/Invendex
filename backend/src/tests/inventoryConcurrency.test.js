import mongoose from 'mongoose';
import CogsEntry from '../models/CogsEntry.js';
import Inventory from '../models/Inventory.js';
import InventoryCostLayer from '../models/InventoryCostLayer.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Order from '../models/Order.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Warehouse from '../models/Warehouse.js';
import WarehouseBin from '../models/WarehouseBin.js';
import BinInventory from '../models/BinInventory.js';
import { getTestDbUri } from './testDbUri.js';
import { recordCogsForCompletedSaleOrder } from '../services/finance/cogsService.js';
import { transferStockBetweenBins } from '../services/wmsService.js';
import { receivePurchaseOrder } from '../services/purchaseOrderService.js';
import { adjustInventoryFromManualInput } from '../services/inventory/manualAdjustmentService.js';

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
    InventorySnapshot.deleteMany({}),
    Order.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    BinInventory.deleteMany({}),
    WarehouseBin.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('inventory concurrency hardening', () => {
  it('prevents oversell under parallel sale completions', async () => {
    const organization = await Organization.create({
      name: 'Concurrent Sales Org',
      code: `CSO-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Main',
      code: 'CSO-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'Concurrent SKU',
      sku: 'CSO-SKU-1',
      price: 12,
      stock: 5
    });

    await Inventory.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: 5,
      quantityReserved: 0
    });

    await InventoryCostLayer.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      sourceType: 'OPENING_BALANCE',
      sourceId: null,
      unitCost: 7,
      quantityReceived: 5,
      quantityRemaining: 5,
      receivedAt: new Date()
    });

    const [orderA, orderB] = await Order.create([
      {
        organization: organization._id,
        type: 'sale',
        warehouse: warehouse._id,
        status: 'pending',
        products: [
          {
            product: product._id,
            quantity: 4,
            warehouse: warehouse._id,
            unitSalePrice: 15,
            discountAmount: 0,
            taxAmount: 0
          }
        ]
      },
      {
        organization: organization._id,
        type: 'sale',
        warehouse: warehouse._id,
        status: 'pending',
        products: [
          {
            product: product._id,
            quantity: 4,
            warehouse: warehouse._id,
            unitSalePrice: 15,
            discountAmount: 0,
            taxAmount: 0
          }
        ]
      }
    ]);

    const outcomes = await Promise.allSettled([
      recordCogsForCompletedSaleOrder({
        orderId: orderA._id,
        organizationId: organization._id
      }),
      recordCogsForCompletedSaleOrder({
        orderId: orderB._id,
        organizationId: organization._id
      })
    ]);

    const succeeded = outcomes.filter((entry) => entry.status === 'fulfilled');
    const failed = outcomes.filter((entry) => entry.status === 'rejected');

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);

    const inventory = await Inventory.findOne({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id
    }).lean();
    expect(inventory.quantityOnHand).toBeGreaterThanOrEqual(0);

    const cogsEntries = await CogsEntry.find({
      organization: organization._id,
      product: product._id
    }).lean();
    expect(cogsEntries).toHaveLength(1);

    const refreshedProduct = await Product.findById(product._id).lean();
    expect(refreshedProduct.stock).toBe(inventory.quantityOnHand);
  });

  it('prevents negative source bin quantity under parallel transfers', async () => {
    const organization = await Organization.create({
      name: 'Concurrent Transfer Org',
      code: `CTO-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Transfer WH',
      code: 'CTO-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'Transfer SKU',
      sku: 'CTO-SKU-1',
      price: 25,
      stock: 5
    });

    const [fromBin, toBin] = await WarehouseBin.create([
      {
        organization: organization._id,
        warehouse: warehouse._id,
        code: 'BIN-FROM'
      },
      {
        organization: organization._id,
        warehouse: warehouse._id,
        code: 'BIN-TO'
      }
    ]);

    await BinInventory.create([
      {
        organization: organization._id,
        warehouse: warehouse._id,
        bin: fromBin._id,
        product: product._id,
        quantityOnHand: 5,
        quantityReserved: 0
      },
      {
        organization: organization._id,
        warehouse: warehouse._id,
        bin: toBin._id,
        product: product._id,
        quantityOnHand: 0,
        quantityReserved: 0
      }
    ]);

    const outcomes = await Promise.allSettled([
      transferStockBetweenBins({
        organizationId: organization._id,
        warehouseId: warehouse._id,
        productId: product._id,
        fromBinId: fromBin._id,
        toBinId: toBin._id,
        quantity: 4
      }),
      transferStockBetweenBins({
        organizationId: organization._id,
        warehouseId: warehouse._id,
        productId: product._id,
        fromBinId: fromBin._id,
        toBinId: toBin._id,
        quantity: 4
      })
    ]);

    const succeeded = outcomes.filter((entry) => entry.status === 'fulfilled');
    const failed = outcomes.filter((entry) => entry.status === 'rejected');

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);

    const fromAfter = await BinInventory.findOne({
      organization: organization._id,
      warehouse: warehouse._id,
      bin: fromBin._id,
      product: product._id
    }).lean();
    const toAfter = await BinInventory.findOne({
      organization: organization._id,
      warehouse: warehouse._id,
      bin: toBin._id,
      product: product._id
    }).lean();

    expect(fromAfter.quantityOnHand).toBeGreaterThanOrEqual(0);
    expect(toAfter.quantityOnHand).toBeGreaterThanOrEqual(0);
    expect(fromAfter.quantityOnHand + toAfter.quantityOnHand).toBe(5);
  });

  it('applies purchase order receipt once under parallel receive calls', async () => {
    const organization = await Organization.create({
      name: 'Concurrent PO Org',
      code: `CPO-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'PO Warehouse',
      code: 'CPO-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'PO Product',
      sku: 'CPO-SKU-1',
      price: 40,
      stock: 0
    });

    const purchaseOrder = await PurchaseOrder.create({
      organization: organization._id,
      supplier: new mongoose.Types.ObjectId(),
      warehouse: warehouse._id,
      status: 'SENT',
      items: [
        {
          product: product._id,
          sku: product.sku,
          quantity: 10,
          unitCost: 18,
          totalCost: 180
        }
      ],
      createdBy: new mongoose.Types.ObjectId()
    });

    const outcomes = await Promise.allSettled([
      receivePurchaseOrder({
        purchaseOrderId: purchaseOrder._id,
        userId: new mongoose.Types.ObjectId(),
        organizationId: organization._id
      }),
      receivePurchaseOrder({
        purchaseOrderId: purchaseOrder._id,
        userId: new mongoose.Types.ObjectId(),
        organizationId: organization._id
      })
    ]);

    const succeeded = outcomes.filter((entry) => entry.status === 'fulfilled');
    expect(succeeded.length).toBeGreaterThanOrEqual(1);

    const inventory = await Inventory.findOne({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id
    }).lean();
    expect(inventory.quantityOnHand).toBe(10);

    const snapshots = await InventorySnapshot.find({
      organization: organization._id,
      purchaseOrder: purchaseOrder._id,
      product: product._id
    }).lean();
    expect(snapshots).toHaveLength(1);
  });

  it('keeps inventory invariants under parallel manual adjustments', async () => {
    const organization = await Organization.create({
      name: 'Concurrent Manual Org',
      code: `CMO-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Manual Warehouse',
      code: 'CMO-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'Manual SKU',
      sku: 'CMO-SKU-1',
      price: 15,
      stock: 10
    });

    await Inventory.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: 10,
      quantityReserved: 0
    });

    const outcomes = await Promise.allSettled(
      Array.from({ length: 4 }).map(() =>
        adjustInventoryFromManualInput({
          organizationId: organization._id,
          productId: product._id,
          warehouseId: warehouse._id,
          amount: -3,
          reason: 'sale',
          actorUserId: new mongoose.Types.ObjectId(),
          actorRole: 'staff'
        })
      )
    );

    const succeeded = outcomes.filter((entry) => entry.status === 'fulfilled');
    const failed = outcomes.filter((entry) => entry.status === 'rejected');

    expect(succeeded.length).toBe(3);
    expect(failed.length).toBe(1);

    const inventory = await Inventory.findOne({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id
    }).lean();
    expect(inventory.quantityOnHand).toBeGreaterThanOrEqual(0);
    expect(inventory.quantityReserved).toBeLessThanOrEqual(
      inventory.quantityOnHand
    );

    const refreshedProduct = await Product.findById(product._id).lean();
    expect(refreshedProduct.stock).toBe(inventory.quantityOnHand);
  });
});
