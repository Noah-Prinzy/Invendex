import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import InventoryIntegrityReport from '../models/InventoryIntegrityReport.js';
import Organization from '../models/Organization.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const originalAuthBypass = process.env.AUTH_TEST_BYPASS;

beforeAll(async () => {
  process.env.AUTH_TEST_BYPASS = 'true';

  if (!process.env.JWT_ACCESS_SECRET) {
    process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    InventoryIntegrityReport.deleteMany({}),
    Organization.deleteMany({})
  ]);

  await Organization.create({
    _id: TEST_ORG_ID,
    name: 'Observability Org',
    code: `OBS-${Date.now()}`
  });
});

afterAll(async () => {
  process.env.AUTH_TEST_BYPASS = originalAuthBypass;
  await mongoose.connection.close();
});

describe('inventory integrity history API', () => {
  it('returns organization-scoped integrity history summaries', async () => {
    await InventoryIntegrityReport.create({
      organization: TEST_ORG_ID,
      checkedAt: new Date(),
      inventoryRecordsChecked: 12,
      driftCount: 2,
      issueCounts: {
        BIN_ON_HAND_DRIFT: 1,
        PRODUCT_STOCK_DRIFT: 1
      },
      autoFixAppliedCount: 0,
      sampleFindings: []
    });

    const response = await request(app).get(
      '/api/observability/inventory-integrity/history?days=30&limit=10'
    );

    expect(response.status).toBe(200);
    expect(response.body?.success).toBe(true);
    expect(response.body?.data?.count).toBe(1);
    expect(response.body?.data?.reports?.[0]?.driftCount).toBe(2);
  });
});
