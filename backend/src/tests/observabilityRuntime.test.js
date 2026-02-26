import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { getTestDbUri } from './testDbUri.js';

const originalTestDbUri = process.env.MONGO_TEST_URI;

beforeAll(async () => {
  process.env.AUTH_TEST_BYPASS = 'true';
  process.env.MONGO_TEST_URI =
    'mongodb://127.0.0.1:27017/ledgerly_test_observability_runtime';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

afterAll(async () => {
  await mongoose.connection.close();
  process.env.MONGO_TEST_URI = originalTestDbUri;
});

describe('observability runtime', () => {
  it('returns runtime and scaling status details', async () => {
    const response = await request(app).get('/api/observability/runtime');

    expect(response.status).toBe(200);
    expect(response.body?.success).toBe(true);
    expect(response.body?.data?.runtime?.nodeVersion).toBeTruthy();
    expect(typeof response.body?.data?.realtime?.enabled).toBe('boolean');
    expect(response.body?.data?.realtime?.redisAdapter).toBeTruthy();
    expect(response.body?.data?.rateLimiting?.store).toBeTruthy();
  });
});
