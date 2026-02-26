import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

/**
 * 🧪 Inventory Routes – Auth guard tests (ESM-safe)
 * - No database
 * - No real controllers
 * - Auth must reject immediately
 */

/* ======================================================
   MOCKS (MUST COME FIRST)
====================================================== */

// 🔐 Auth middleware (blocks immediately)
await jest.unstable_mockModule('../middlewares/authMiddleware.js', () => ({
  protect: (req, res, _next) => {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  },
  auditMiddleware: () => (req, res, next) => next()
}));

// 🛡️ Role middleware (noop)
await jest.unstable_mockModule('../middlewares/requireRoles.js', () => ({
  default: () => (req, res, next) => next()
}));

// 🚦 Rate limiters (noop)
await jest.unstable_mockModule('../middlewares/rateLimiter.js', () => ({
  manualReorderAlertLimiter: (req, res, next) => next(),
  resolveReorderAlertLimiter: (req, res, next) => next(),
  runReorderEngineLimiter: (req, res, next) => next()
}));

/* ======================================================
   IMPORT ROUTES AFTER MOCKS
====================================================== */

const inventoryRoutes = (await import('../routes/inventoryRoutes.js')).default;

/* ======================================================
   TEST APP
====================================================== */

const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRoutes);

/* ======================================================
   TESTS
====================================================== */

describe('Inventory API – auth protection', () => {
  it('blocks active reorder alerts without token', async () => {
    const res = await request(app).get('/api/inventory/alerts/reorder/active');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('blocks reorder intelligence without token', async () => {
    const res = await request(app).get('/api/inventory/reorder-intelligence');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('blocks reorder alert trend without token', async () => {
    const res = await request(app).get('/api/inventory/alerts/reorder/trend');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
