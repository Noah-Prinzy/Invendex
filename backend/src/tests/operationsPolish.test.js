import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import BinInventory from '../models/BinInventory.js';
import Inventory from '../models/Inventory.js';
import InventoryBatch from '../models/InventoryBatch.js';
import InventorySerial from '../models/InventorySerial.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import StockMovement from '../models/StockMovement.js';
import Warehouse from '../models/Warehouse.js';
import WarehouseBin from '../models/WarehouseBin.js';
import { applyPurchaseOrderToInventory } from '../services/inventory/inventoryService.js';
import {
  allocateStockToBin,
  createPickTicket,
  createWarehouseBin,
  getReplenishmentRecommendations
} from '../services/wmsService.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');

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
    InventorySerial.deleteMany({}),
    InventorySnapshot.deleteMany({}),
    Product.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    StockMovement.deleteMany({}),
    WarehouseBin.deleteMany({}),
    Warehouse.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('operational polish', () => {
  it('supports serial reservation/release/scan verification endpoints', async () => {
    const organization = await Organization.create({
      _id: TEST_ORG_ID,
      name: 'Ops Org',
      code: `OPS-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'Ops Warehouse',
      code: 'OPS-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'Ops Product',
      sku: 'OPS-SERIAL-001',
      price: 100,
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
          unitCost: 30,
          totalCost: 60,
          trackingType: 'SERIAL',
          lotNumber: 'LOT-OPS',
          serialNumbers: ['OPS-SN-001', 'OPS-SN-002']
        }
      ]
    });
    await applyPurchaseOrderToInventory({ purchaseOrder: po });

    const reservationReferenceId = new mongoose.Types.ObjectId().toString();

    const reserveRes = await request(app)
      .post('/api/inventory-tracking/serials/reserve')
      .send({
        productId: product._id.toString(),
        warehouseId: warehouse._id.toString(),
        quantity: 1,
        lotNumber: 'LOT-OPS',
        referenceType: 'ORDER',
        referenceId: reservationReferenceId
      });
    expect(reserveRes.status).toBe(200);
    expect(reserveRes.body?.data?.reservedCount).toBe(1);

    const reservedSerial = reserveRes.body.data.serialNumbers[0];
    const verifyReservedRes = await request(app)
      .post('/api/inventory-tracking/serials/verify-scan')
      .send({
        serialNumber: reservedSerial,
        productId: product._id.toString(),
        warehouseId: warehouse._id.toString(),
        expectedStatuses: ['RESERVED'],
        expectedReferenceId: reservationReferenceId
      });
    expect(verifyReservedRes.status).toBe(200);
    expect(verifyReservedRes.body?.data?.isValid).toBe(true);

    const releaseRes = await request(app)
      .post('/api/inventory-tracking/serials/release')
      .send({
        serialNumbers: [reservedSerial],
        referenceId: reservationReferenceId
      });
    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body?.data?.releasedCount).toBe(1);

    const verifyAvailableRes = await request(app)
      .post('/api/inventory-tracking/serials/verify-scan')
      .send({
        serialNumber: reservedSerial,
        expectedStatuses: ['AVAILABLE']
      });
    expect(verifyAvailableRes.status).toBe(200);
    expect(verifyAvailableRes.body?.data?.isValid).toBe(true);
  }, 20000);

  it('enforces FEFO, bin capacity, and provides replenishment recommendations', async () => {
    const organization = await Organization.create({
      name: 'WMS Ops Org',
      code: `WMS-OPS-${Date.now()}`
    });

    const warehouse = await Warehouse.create({
      organization: organization._id,
      name: 'WMS Ops Warehouse',
      code: 'WMS-OPS-WH'
    });

    const product = await Product.create({
      organization: organization._id,
      name: 'WMS Product',
      sku: 'WMS-001',
      price: 40,
      stock: 0
    });

    await Inventory.create({
      organization: organization._id,
      product: product._id,
      warehouse: warehouse._id,
      quantityOnHand: 30,
      quantityReserved: 0
    });

    const pickBin = await createWarehouseBin({
      organizationId: organization._id,
      warehouseId: warehouse._id,
      code: 'PICK-A1',
      binType: 'PICK_FACE',
      maxCapacityUnits: 10,
      replenishmentMinUnits: 2,
      replenishmentTargetUnits: 8
    });
    const sourceBin = await createWarehouseBin({
      organizationId: organization._id,
      warehouseId: warehouse._id,
      code: 'STOR-A1',
      binType: 'STORAGE'
    });

    await allocateStockToBin({
      organizationId: organization._id,
      warehouseId: warehouse._id,
      binId: pickBin._id,
      productId: product._id,
      quantity: 9
    });
    await expect(
      allocateStockToBin({
        organizationId: organization._id,
        warehouseId: warehouse._id,
        binId: pickBin._id,
        productId: product._id,
        quantity: 2
      })
    ).rejects.toThrow('Bin capacity exceeded');

    await allocateStockToBin({
      organizationId: organization._id,
      warehouseId: warehouse._id,
      binId: sourceBin._id,
      productId: product._id,
      quantity: 10
    });

    await InventoryBatch.create([
      {
        organization: organization._id,
        product: product._id,
        warehouse: warehouse._id,
        lotNumber: 'LOT-OLD',
        expiryDate: new Date('2026-12-01'),
        quantityOnHand: 8,
        sourceType: 'MANUAL'
      },
      {
        organization: organization._id,
        product: product._id,
        warehouse: warehouse._id,
        lotNumber: 'LOT-NEW',
        expiryDate: new Date('2027-12-01'),
        quantityOnHand: 8,
        sourceType: 'MANUAL'
      }
    ]);

    await InventorySerial.create([
      {
        organization: organization._id,
        product: product._id,
        warehouse: warehouse._id,
        lotNumber: 'LOT-OLD',
        serialNumber: 'WMS-SN-001',
        status: 'AVAILABLE',
        expiryDate: new Date('2026-12-01')
      },
      {
        organization: organization._id,
        product: product._id,
        warehouse: warehouse._id,
        lotNumber: 'LOT-OLD',
        serialNumber: 'WMS-SN-002',
        status: 'AVAILABLE',
        expiryDate: new Date('2026-12-01')
      },
      {
        organization: organization._id,
        product: product._id,
        warehouse: warehouse._id,
        lotNumber: 'LOT-NEW',
        serialNumber: 'WMS-SN-003',
        status: 'AVAILABLE',
        expiryDate: new Date('2027-12-01')
      }
    ]);

    await expect(
      createPickTicket({
        organizationId: organization._id,
        warehouseId: warehouse._id,
        createdBy: new mongoose.Types.ObjectId(),
        items: [
          {
            product: product._id,
            quantity: 1,
            lotNumber: 'LOT-NEW'
          }
        ]
      })
    ).rejects.toThrow('FEFO enforcement');

    const pickTicket = await createPickTicket({
      organizationId: organization._id,
      warehouseId: warehouse._id,
      createdBy: new mongoose.Types.ObjectId(),
      items: [
        {
          product: product._id,
          quantity: 2
        }
      ]
    });

    expect(pickTicket.items[0].lotNumber).toBe('LOT-OLD');
    expect(pickTicket.items[0].serialNumbers).toEqual(
      expect.arrayContaining(['WMS-SN-001', 'WMS-SN-002'])
    );

    await BinInventory.findOneAndUpdate(
      {
        organization: organization._id,
        warehouse: warehouse._id,
        bin: pickBin._id,
        product: product._id
      },
      {
        $set: { quantityOnHand: 1, quantityReserved: 0 }
      }
    );
    await BinInventory.findOneAndUpdate(
      {
        organization: organization._id,
        warehouse: warehouse._id,
        bin: sourceBin._id,
        product: product._id
      },
      {
        $set: { quantityOnHand: 10, quantityReserved: 0 }
      }
    );

    const plan = await getReplenishmentRecommendations({
      organizationId: organization._id,
      warehouseId: warehouse._id
    });

    expect(plan.count).toBeGreaterThanOrEqual(1);
    const pickRecommendation = plan.recommendations.find(
      (row) => String(row.targetBinId) === String(pickBin._id)
    );
    expect(pickRecommendation).toBeTruthy();
    expect(pickRecommendation.neededQuantity).toBeGreaterThan(0);
    expect(pickRecommendation.suggestedSources.length).toBeGreaterThan(0);
  }, 25000);
});
