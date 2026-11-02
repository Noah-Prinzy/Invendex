import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { createTestApp, destroyTestApp, type TestAppContext } from './test-app';
import { TenantContext } from '../src/tenant/tenant-context';

describe('purchase-orders + inventory e2e (/api/v1)', () => {
  let ctx: TestAppContext;
  let app: INestApplication;
  let token: string;
  let orgId: string;
  let warehouseId: string;
  let supplierId: string;
  let productId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'po-owner@example.com',
        password: 'password123',
        organizationName: 'PO Org'
      });
    expect(reg.status).toBe(201);
    token = reg.body.data.accessToken as string;
    orgId = reg.body.data.user.organization as string;

    const Warehouse = app.get(getModelToken('Warehouse'));
    const Supplier = app.get(getModelToken('Supplier'));
    const Product = app.get(getModelToken('Product'));

    await TenantContext.run({ organizationId: orgId }, async () => {
      const warehouse = await Warehouse.create({
        organization: new mongoose.Types.ObjectId(orgId),
        name: 'Main',
        code: 'MAIN'
      });
      warehouseId = String(warehouse._id);
      const supplier = await Supplier.create({
        organization: new mongoose.Types.ObjectId(orgId),
        name: 'Supplier Co'
      });
      supplierId = String(supplier._id);
      const product = await Product.create({
        organization: new mongoose.Types.ObjectId(orgId),
        name: 'Widget',
        sku: 'WIDGET-1',
        price: 100,
        stock: 0
      });
      productId = String(product._id);
    });

    await Promise.all(
      ['Warehouse', 'Supplier', 'Product', 'PurchaseOrder', 'Inventory', 'InventorySnapshot'].map(
        (name) => app.get(getModelToken(name)).ensureIndexes()
      )
    );
  }, 240000);

  afterAll(async () => {
    await destroyTestApp(ctx);
  });

  it('creates a PO, receives it, and inventory reflects the quantity', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplier: supplierId,
        warehouse: warehouseId,
        items: [{ product: productId, quantity: 15, unitCost: 40 }]
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const po = createRes.body.data.purchaseOrder;
    expect(po.poNumber).toMatch(/^PO-/);
    expect(po.status).toBe('DRAFT');
    expect(po.totalCost).toBe(600);

    const receiveRes = await request(app.getHttpServer())
      .patch(`/api/v1/purchase-orders/${po._id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.data.purchaseOrder.status).toBe('RECEIVED');

    const inventoryRes = await request(app.getHttpServer())
      .get(`/api/v1/inventory?product=${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(inventoryRes.status).toBe(200);
    expect(inventoryRes.body.data).toHaveLength(1);
    expect(inventoryRes.body.data[0].quantityOnHand).toBe(15);
    expect(inventoryRes.body.meta.total).toBe(1);

    // Receiving again is idempotent — no double count.
    const again = await request(app.getHttpServer())
      .patch(`/api/v1/purchase-orders/${po._id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(again.status).toBe(200);
    const inventoryRes2 = await request(app.getHttpServer())
      .get(`/api/v1/inventory?product=${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(inventoryRes2.body.data[0].quantityOnHand).toBe(15);
  });

  it('lists purchase orders with pagination meta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/purchase-orders?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 10, total: 1 });
    expect(res.body.data[0].poNumber).toMatch(/^PO-/);
  });

  it('blocks staff from creating purchase orders (RBAC)', async () => {
    const User = app.get(getModelToken('User'));
    await User.create({
      email: 'po-staff@example.com',
      password: 'password123',
      role: 'staff',
      organization: new mongoose.Types.ObjectId(orgId)
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'po-staff@example.com', password: 'password123' });
    const staffToken = login.body.data.accessToken as string;
    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        supplier: supplierId,
        warehouse: warehouseId,
        items: [{ product: productId, quantity: 1, unitCost: 10 }]
      });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied: insufficient permissions');
  });

  it('blocks cross-tenant access to a purchase order', async () => {
    const other = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'other-owner@example.com', password: 'password123' });
    const otherToken = other.body.data.accessToken as string;
    const poList = await request(app.getHttpServer())
      .get('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${token}`);
    const poId = poList.body.data[0]._id as string;

    const res = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('adjusts stock manually and keeps product stock in sync', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({
        product: productId,
        warehouse: warehouseId,
        delta: -5,
        reason: 'damaged'
      });
    expect(res.status).toBe(201);
    expect(res.body.data.inventory.quantityOnHand).toBe(10);

    const Product = app.get(getModelToken('Product'));
    await TenantContext.run({ organizationId: orgId }, async () => {
      const product = await Product.findOne({
        _id: productId,
        organization: orgId
      }).lean();
      expect(product?.stock).toBe(10);
    });

    const tooMuch = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({
        product: productId,
        warehouse: warehouseId,
        delta: -999,
        reason: 'damaged'
      });
    expect(tooMuch.status).toBe(400);
  });
});
