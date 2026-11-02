import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { type Model } from 'mongoose';
import type { TestAppContext } from './test-app';
import { createTestApp, destroyTestApp } from './test-app';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { TenantContext } from '../src/tenant/tenant-context';
import type { IOrganization } from '../src/persistence/schemas/organization.schema';
import type { IProduct } from '../src/persistence/schemas/product.schema';
import type { IWarehouse } from '../src/persistence/schemas/warehouse.schema';
import type { IInventory } from '../src/persistence/schemas/inventory.schema';
import type { IInventorySnapshot } from '../src/persistence/schemas/inventory-snapshot.schema';
import type { IReorderAlert } from '../src/persistence/schemas/reorder-alert.schema';
import type { IPurchaseOrder } from '../src/persistence/schemas/purchase-order.schema';

/**
 * Ported from legacy `backend/src/tests/purchaseOrderInventory.test.js` —
 * the legacy Jest suite is the executable spec for the receive flow.
 */
describe('applyPurchaseOrderToInventory (ported legacy spec)', () => {
  let ctx: TestAppContext;
  let app: INestApplication;
  let service: InventoryService;
  let Organization: Model<IOrganization>;
  let Product: Model<IProduct>;
  let Warehouse: Model<IWarehouse>;
  let Inventory: Model<IInventory>;
  let InventorySnapshot: Model<IInventorySnapshot>;
  let ReorderAlert: Model<IReorderAlert>;
  let PurchaseOrder: Model<IPurchaseOrder>;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
    service = app.get(InventoryService);
    Organization = app.get(getModelToken('Organization'));
    Product = app.get(getModelToken('Product'));
    Warehouse = app.get(getModelToken('Warehouse'));
    Inventory = app.get(getModelToken('Inventory'));
    InventorySnapshot = app.get(getModelToken('InventorySnapshot'));
    ReorderAlert = app.get(getModelToken('ReorderAlert'));
    PurchaseOrder = app.get(getModelToken('PurchaseOrder'));
    // Mongoose builds indexes asynchronously at boot; await them so the
    // snapshot unique partial index (idempotency gate) is enforced.
    await Promise.all(
      [Product, Warehouse, Inventory, InventorySnapshot, ReorderAlert, PurchaseOrder].map(
        (model) => model.ensureIndexes()
      )
    );
  }, 240000);

  afterAll(async () => {
    await destroyTestApp(ctx);
  });

  it('increments product stock and creates inventory snapshot', async () => {
    const organization = await Organization.create({ name: 'Tenant One' });
    const orgId = String(organization._id);

    await TenantContext.run({ organizationId: orgId }, async () => {
      const product = await Product.create({
        organization: organization._id,
        name: 'PO Test Product',
        sku: 'PO-SKU-001',
        price: 100,
        stock: 10,
        lowStockThreshold: 5,
        supplierLeadTimeDays: 5
      });
      const warehouse = await Warehouse.create({
        organization: organization._id,
        name: 'Main Warehouse',
        code: 'MAIN'
      });
      const alert = await ReorderAlert.create({
        organization: organization._id,
        product: product._id,
        sku: product.sku,
        stock: 10,
        reorderLevel: 15,
        reorderQuantity: 20,
        triggeredAt: new Date(),
        status: 'ACTIVE'
      });
      const purchaseOrder = await PurchaseOrder.create({
        organization: organization._id,
        supplier: new mongoose.Types.ObjectId(),
        warehouse: warehouse._id,
        items: [
          {
            product: product._id,
            sku: product.sku,
            quantity: 20,
            unitCost: 50,
            totalCost: 1000,
            reorderAlert: alert._id
          }
        ],
        createdBy: new mongoose.Types.ObjectId()
      });

      await service.applyPurchaseOrderToInventory({ purchaseOrder });

      const inventory = await Inventory.findOne({
        organization: organization._id,
        product: product._id,
        warehouse: warehouse._id
      });
      expect(inventory?.quantityOnHand).toBe(20);

      const snapshots = await InventorySnapshot.find({
        organization: organization._id,
        product: product._id,
        purchaseOrder: purchaseOrder._id
      });
      expect(snapshots).toHaveLength(1);

      const updatedAlert = await ReorderAlert.findOne({
        _id: alert._id,
        organization: organization._id
      });
      expect(updatedAlert?.resolved).toBe(true);

      const refreshedProduct = await Product.findOne({
        _id: product._id,
        organization: organization._id
      }).lean();
      expect(Number(refreshedProduct?.stock || 0)).toBe(20);
    });
  });

  it('is idempotent when applied twice', async () => {
    const organization = await Organization.create({ name: 'Tenant Two' });
    const orgId = String(organization._id);

    await TenantContext.run({ organizationId: orgId }, async () => {
      const product = await Product.create({
        organization: organization._id,
        name: 'Idempotent Product',
        sku: 'PO-SKU-002',
        price: 100,
        stock: 5
      });
      const warehouse = await Warehouse.create({
        organization: organization._id,
        name: 'Secondary Warehouse',
        code: 'SECONDARY'
      });
      const purchaseOrder = await PurchaseOrder.create({
        organization: organization._id,
        supplier: new mongoose.Types.ObjectId(),
        warehouse: warehouse._id,
        items: [
          {
            product: product._id,
            sku: product.sku,
            quantity: 10,
            unitCost: 30,
            totalCost: 300
          }
        ],
        createdBy: new mongoose.Types.ObjectId()
      });

      await service.applyPurchaseOrderToInventory({ purchaseOrder });
      await service.applyPurchaseOrderToInventory({ purchaseOrder });

      const inventory = await Inventory.findOne({
        organization: organization._id,
        product: product._id,
        warehouse: warehouse._id
      });
      expect(inventory?.quantityOnHand).toBe(10);

      const snapshots = await InventorySnapshot.find({
        organization: organization._id,
        product: product._id,
        purchaseOrder: purchaseOrder._id
      });
      expect(snapshots).toHaveLength(1);
    });
  });

  it('converts purchase quantities into base units using purchaseToBaseFactor', async () => {
    const organization = await Organization.create({ name: 'Tenant UOM' });
    const orgId = String(organization._id);

    await TenantContext.run({ organizationId: orgId }, async () => {
      const product = await Product.create({
        organization: organization._id,
        name: 'UOM Product',
        sku: 'PO-SKU-UOM-001',
        price: 100,
        stock: 0,
        uom: { base: 'pcs', purchase: 'box', purchaseToBaseFactor: 24 }
      });
      const warehouse = await Warehouse.create({
        organization: organization._id,
        name: 'UOM Warehouse',
        code: 'UOM'
      });
      const purchaseOrder = await PurchaseOrder.create({
        organization: organization._id,
        supplier: new mongoose.Types.ObjectId(),
        warehouse: warehouse._id,
        items: [
          {
            product: product._id,
            sku: product.sku,
            quantity: 2,
            purchaseUom: 'box',
            purchaseToBaseFactor: 24,
            unitCost: 240,
            totalCost: 480
          }
        ],
        createdBy: new mongoose.Types.ObjectId()
      });

      await service.applyPurchaseOrderToInventory({ purchaseOrder });

      const inventory = await Inventory.findOne({
        organization: organization._id,
        product: product._id,
        warehouse: warehouse._id
      }).lean();
      expect(Number(inventory?.quantityOnHand || 0)).toBe(48);

      const refreshedProduct = await Product.findOne({
        _id: product._id,
        organization: organization._id
      }).lean();
      expect(Number(refreshedProduct?.stock || 0)).toBe(48);
    });
  });

  it('throws an error if purchase order is invalid', async () => {
    await expect(
      service.applyPurchaseOrderToInventory({ purchaseOrder: null })
    ).rejects.toThrow('Invalid purchase order supplied to inventory service');
  });
});
