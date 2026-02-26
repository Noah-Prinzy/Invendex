import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';
import InventoryBatch from '../models/InventoryBatch.js';
import InventorySerial from '../models/InventorySerial.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Order from '../models/Order.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import StockMovement from '../models/StockMovement.js';
import Warehouse from '../models/Warehouse.js';
import { applyPurchaseOrderToInventory } from '../services/inventory/inventoryService.js';
import { recallInventoryBatch } from '../services/inventory/trackingService.js';
import { recordCogsForCompletedSaleOrder } from '../services/finance/cogsService.js';
import {
  allocateStockToBin,
  completePickTicket,
  createPickTicket,
  createWarehouseBin
} from '../services/wmsService.js';
import { getTestDbUri } from './testDbUri.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    Inventory.deleteMany({}),
    InventoryBatch.deleteMany({}),
    InventorySerial.deleteMany({}),
    InventorySnapshot.deleteMany({}),
    Product.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Order.deleteMany({}),
    StockMovement.deleteMany({}),
    Warehouse.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('serial and batch tracking', () => {
  it('records batch and serial stock on PO receipt and supports batch recall hold', async () => {
    const organization = await Organization.create({
      name: 'Tracking Org',
      code: `TRACK-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Tracking Warehouse',
      code: 'TRACK-WH'
    });

    const batchProduct = await Product.create({
      organization: organization._id,
      name: 'Batch Product',
      sku: 'BATCH-001',
      price: 20,
      stock: 0
    });

    const serialProduct = await Product.create({
      organization: organization._id,
      name: 'Serial Product',
      sku: 'SERIAL-001',
      price: 100,
      stock: 0
    });

    const purchaseOrder = await PurchaseOrder.create({
      organization: organization._id,
      supplier: new mongoose.Types.ObjectId(),
      warehouse: warehouse._id,
      status: 'SENT',
      createdBy: new mongoose.Types.ObjectId(),
      items: [
        {
          product: batchProduct._id,
          sku: batchProduct.sku,
          quantity: 12,
          unitCost: 8,
          totalCost: 96,
          trackingType: 'BATCH',
          lotNumber: 'LOT-ALPHA',
          expiryDate: new Date('2027-01-01')
        },
        {
          product: serialProduct._id,
          sku: serialProduct.sku,
          quantity: 3,
          unitCost: 60,
          totalCost: 180,
          trackingType: 'SERIAL',
          lotNumber: 'LOT-SERIAL',
          serialNumbers: ['SN-001', 'SN-002', 'SN-003']
        }
      ]
    });

    await applyPurchaseOrderToInventory({ purchaseOrder });

    const batch = await InventoryBatch.findOne({
      organization: organization._id,
      product: batchProduct._id,
      warehouse: warehouse._id,
      lotNumber: 'LOT-ALPHA'
    }).lean();

    expect(batch).not.toBeNull();
    expect(batch.quantityOnHand).toBe(12);
    expect(batch.isRecalled).toBe(false);

    const serials = await InventorySerial.find({
      organization: organization._id,
      product: serialProduct._id,
      warehouse: warehouse._id
    }).lean();

    expect(serials).toHaveLength(3);
    expect(serials.every((row) => row.status === 'AVAILABLE')).toBe(true);

    const recall = await recallInventoryBatch({
      organizationId: organization._id,
      productId: serialProduct._id,
      warehouseId: warehouse._id,
      lotNumber: 'LOT-SERIAL',
      reason: 'Quality issue',
      recalledBy: new mongoose.Types.ObjectId()
    });

    expect(recall.recalledBatchCount).toBe(1);
    expect(recall.serialsPlacedOnHold).toBe(3);

    const heldSerials = await InventorySerial.find({
      organization: organization._id,
      product: serialProduct._id,
      lotNumber: 'LOT-SERIAL'
    }).lean();

    expect(heldSerials.every((row) => row.status === 'RECALL_HOLD')).toBe(true);
  }, 15000);

  it('marks sold serials and decrements batch quantity on sale order completion', async () => {
    const organization = await Organization.create({
      name: 'Order Tracking Org',
      code: `ORD-TRACK-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Order Warehouse',
      code: 'ORD-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'Tracked Sale Product',
      sku: 'SALE-SERIAL-001',
      price: 50,
      stock: 0
    });

    const po = await PurchaseOrder.create({
      organization: organization._id,
      supplier: new mongoose.Types.ObjectId(),
      warehouse: warehouse._id,
      status: 'SENT',
      createdBy: new mongoose.Types.ObjectId(),
      items: [
        {
          product: product._id,
          sku: product.sku,
          quantity: 3,
          unitCost: 20,
          totalCost: 60,
          trackingType: 'SERIAL',
          lotNumber: 'LOT-SALE',
          serialNumbers: ['S-SALE-001', 'S-SALE-002', 'S-SALE-003']
        }
      ]
    });
    await applyPurchaseOrderToInventory({ purchaseOrder: po });

    const order = await Order.create({
      organization: organization._id,
      type: 'sale',
      warehouse: warehouse._id,
      status: 'pending',
      products: [
        {
          product: product._id,
          quantity: 2,
          warehouse: warehouse._id,
          unitSalePrice: 45,
          lotNumber: 'LOT-SALE',
          serialNumbers: ['S-SALE-001', 'S-SALE-002']
        }
      ]
    });

    await recordCogsForCompletedSaleOrder({
      orderId: order._id,
      organizationId: organization._id
    });

    const soldSerials = await InventorySerial.find({
      organization: organization._id,
      product: product._id,
      serialNumber: { $in: ['S-SALE-001', 'S-SALE-002'] }
    }).lean();
    expect(soldSerials).toHaveLength(2);
    expect(soldSerials.every((row) => row.status === 'SOLD')).toBe(true);
    expect(soldSerials.every((row) => row.soldReferenceType === 'ORDER')).toBe(
      true
    );

    const remainingSerial = await InventorySerial.findOne({
      organization: organization._id,
      product: product._id,
      serialNumber: 'S-SALE-003'
    }).lean();
    expect(remainingSerial.status).toBe('AVAILABLE');

    const batch = await InventoryBatch.findOne({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      lotNumber: 'LOT-SALE'
    }).lean();
    expect(batch.quantityOnHand).toBe(1);
  }, 15000);

  it('marks sold serials on pick ticket completion', async () => {
    const organization = await Organization.create({
      name: 'Pick Tracking Org',
      code: `PICK-TRACK-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Pick Warehouse',
      code: 'PICK-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'Pick Serial Product',
      sku: 'PICK-SERIAL-001',
      price: 90,
      stock: 0
    });

    const po = await PurchaseOrder.create({
      organization: organization._id,
      supplier: new mongoose.Types.ObjectId(),
      warehouse: warehouse._id,
      status: 'SENT',
      createdBy: new mongoose.Types.ObjectId(),
      items: [
        {
          product: product._id,
          sku: product.sku,
          quantity: 2,
          unitCost: 40,
          totalCost: 80,
          trackingType: 'SERIAL',
          lotNumber: 'LOT-PICK',
          serialNumbers: ['S-PICK-001', 'S-PICK-002']
        }
      ]
    });
    await applyPurchaseOrderToInventory({ purchaseOrder: po });

    const bin = await createWarehouseBin({
      organizationId: organization._id,
      warehouseId: warehouse._id,
      code: 'BIN-A1'
    });

    await allocateStockToBin({
      organizationId: organization._id,
      warehouseId: warehouse._id,
      binId: bin._id,
      productId: product._id,
      quantity: 2
    });

    const ticket = await createPickTicket({
      organizationId: organization._id,
      warehouseId: warehouse._id,
      createdBy: new mongoose.Types.ObjectId(),
      items: [
        {
          product: product._id,
          quantity: 2,
          lotNumber: 'LOT-PICK',
          serialNumbers: ['S-PICK-001', 'S-PICK-002']
        }
      ]
    });

    await completePickTicket({
      organizationId: organization._id,
      ticketId: ticket._id
    });

    const soldSerials = await InventorySerial.find({
      organization: organization._id,
      product: product._id,
      serialNumber: { $in: ['S-PICK-001', 'S-PICK-002'] }
    }).lean();
    expect(soldSerials).toHaveLength(2);
    expect(soldSerials.every((row) => row.status === 'SOLD')).toBe(true);
    expect(
      soldSerials.every((row) => row.soldReferenceType === 'PICK_TICKET')
    ).toBe(true);
  }, 15000);
});
