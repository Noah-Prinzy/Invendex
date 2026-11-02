import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { createTestApp, destroyTestApp, type TestAppContext } from './test-app';

describe('auth + access guardrails e2e (/api/v1)', () => {
  let ctx: TestAppContext;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await createTestApp();
    app = ctx.app;
  }, 240000);

  afterAll(async () => {
    await destroyTestApp(ctx);
  });

  it('registers an owner, logs in, and returns /me', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'owner@example.com',
        password: 'password123',
        name: 'Owner',
        organizationName: 'Acme Ltd'
      });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.data.user.email).toBe('owner@example.com');
    expect(registerRes.body.data.user.role).toBe('owner');
    expect(registerRes.body.data.accessToken).toBeTruthy();
    expect(String(registerRes.headers['set-cookie'])).toContain('refreshToken=');

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@example.com', password: 'password123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.message).toBe('Login successful');
    const token = loginRes.body.data.accessToken as string;

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('owner@example.com');
  });

  it('rejects duplicate registration with a 409 envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'owner@example.com', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      message: 'Email is already registered'
    });
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a missing token with the legacy 401 message', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: 'Not authorized, no token provided'
    });
  });

  it('rejects invalid payloads with a 400 zod error', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('email');
  });

  it('refreshes tokens via the refresh cookie', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@example.com', password: 'password123' });
    const cookie = loginRes.headers['set-cookie'] as unknown as string[];
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .send({});
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
  });

  it('blocks deactivated users (ported access guardrail)', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'deactivated@example.com', password: 'password123' });
    const token = reg.body.data.accessToken as string;
    const User = ctx.app.get(getModelToken('User'));
    await User.updateOne(
      { email: 'deactivated@example.com' },
      { isActive: false }
    ).setOptions({ tenantBypass: true });
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(
      'Account is deactivated. Contact an administrator.'
    );
  });

  it('blocks users whose organization is inactive (ported access guardrail)', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'inactive-org@example.com', password: 'password123' });
    const token = reg.body.data.accessToken as string;
    const orgId = reg.body.data.user.organization as string;
    const Organization = ctx.app.get(getModelToken('Organization'));
    await Organization.updateOne({ _id: orgId }, { isActive: false }).setOptions({
      tenantBypass: true
    });
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(
      'Organization is inactive or no longer available'
    );
  });

  it('blocks users with no organization', async () => {
    const User = ctx.app.get(getModelToken('User'));
    const Organization = ctx.app.get(getModelToken('Organization'));
    const ghostOrg = await Organization.create({ name: 'Ghost Org' });
    const ghost = await User.create({
      email: 'ghost@example.com',
      password: 'password123',
      role: 'staff',
      organization: ghostOrg._id
    });
    await User.updateOne({ _id: ghost._id }, { organization: null }).setOptions({
      tenantBypass: true
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com', password: 'password123' });
    const token = login.body.data.accessToken as string;
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('User is not assigned to an organization');
  });

  it('enforces the RBAC permission guard (staff cannot submit EFRIS invoices)', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'boss@example.com',
        password: 'password123',
        organizationName: 'Boss Org'
      });
    const orgId = reg.body.data.user.organization as string;
    const User = ctx.app.get(getModelToken('User'));
    await User.create({
      email: 'staff@example.com',
      password: 'password123',
      role: 'staff',
      organization: new mongoose.Types.ObjectId(orgId)
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'staff@example.com', password: 'password123' });
    const token = login.body.data.accessToken as string;
    const res = await request(app.getHttpServer())
      .post('/api/v1/efiris/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoiceNo: 'INV-1',
        items: [{ itemCode: 'A', itemName: 'a', quantity: 1, unitPrice: 100 }]
      });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied: insufficient permissions');
  });

  it('serves OpenAPI at /api/v1/openapi.json and /api/v1/health', async () => {
    const spec = await request(app.getHttpServer()).get('/api/v1/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.paths['/api/v1/auth/login']).toBeTruthy();
    expect(spec.body.paths['/api/v1/efiris/invoices']).toBeTruthy();
    expect(spec.body.paths['/api/v1/payments/mobile-money/request-to-pay']).toBeTruthy();

    const health = await request(app.getHttpServer()).get('/api/v1/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({
      success: true,
      message: 'API is healthy',
      status: 'ok'
    });
  });

  it('compresses large JSON responses with Brotli when accepted', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/openapi.json')
      .set('Accept-Encoding', 'gzip, br');
    expect(res.headers['content-encoding']).toBe('br');
    expect(String(res.headers.vary)).toContain('Accept-Encoding');
  });

  it('writes audit logs for auth domain events (event-driven)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@example.com', password: 'password123' });
    const AuditLog = ctx.app.get(getModelToken('AuditLog'));
    const count = await AuditLog.countDocuments({ action: 'AUTH_LOGIN' }).setOptions({
      tenantBypass: true
    });
    expect(count).toBeGreaterThan(0);
  });

  it('exposes multi-currency rates/convert with UGX base (authenticated)', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner@example.com', password: 'password123' });
    const token = login.body.data.accessToken as string;

    const rates = await request(app.getHttpServer())
      .get('/api/v1/currency/rates?base=UGX')
      .set('Authorization', `Bearer ${token}`);
    expect(rates.status).toBe(200);
    expect(rates.body.data.base).toBe('UGX');
    expect(rates.body.data.rates.UGX).toBe(1);

    const convert = await request(app.getHttpServer())
      .get('/api/v1/currency/convert?amount=3700&from=UGX&to=USD')
      .set('Authorization', `Bearer ${token}`);
    expect(convert.status).toBe(200);
    expect(convert.body.data.result).toBeCloseTo(1, 5);
  });

  it('lists supported locales publicly (en/sw/fr/lg)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/i18n/locales');
    expect(res.status).toBe(200);
    expect(res.body.data.supported).toEqual(
      expect.arrayContaining(['en', 'sw', 'fr', 'lg'])
    );
  });
});
