import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import Product from '../models/Product.js';
import Organization from '../models/Organization.js';
import ProductSkuSequence from '../models/ProductSkuSequence.js';
import BackgroundJob from '../models/BackgroundJob.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pollBulkImportJob = async ({ jobId, maxAttempts = 40, delayMs = 50 }) => {
  let latest = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await request(app).get(
      `/api/products/bulk-import/jobs/${jobId}`
    );
    expect(response.status).toBe(200);
    latest = response.body?.data || null;

    const status = String(latest?.status || '').toUpperCase();
    if (status === 'COMPLETED' || status === 'FAILED') {
      return latest;
    }

    await sleep(delayMs);
  }

  return latest;
};

describe('product bulk import background jobs', () => {
  beforeAll(async () => {
    process.env.AUTH_TEST_BYPASS = 'true';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(getTestDbUri());
    }
  });

  beforeEach(async () => {
    await Promise.all([
      Product.deleteMany({}),
      ProductSkuSequence.deleteMany({}),
      Organization.deleteMany({}),
      BackgroundJob.deleteMany({})
    ]);

    await Organization.create({
      _id: TEST_ORG_ID,
      name: 'Bulk Job Org',
      code: `BJOB-${Date.now()}`
    });
  });

  afterAll(async () => {
    process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
    await mongoose.connection.close();
  });

  it('queues a bulk import job and processes it to completion', async () => {
    const queueResponse = await request(app)
      .post('/api/products/bulk-import/jobs')
      .send({
        options: {
          duplicatePolicy: 'skip'
        },
        products: [
          { name: 'Background Product A', category: 'Demo', price: 10 },
          { name: 'Background Product B', category: 'Demo', price: 15 }
        ]
      });

    expect(queueResponse.status).toBe(202);
    expect(queueResponse.body?.data?.id).toBeTruthy();

    const jobId = queueResponse.body.data.id;
    const completedJob = await pollBulkImportJob({ jobId });

    expect(String(completedJob?.status || '').toUpperCase()).toBe('COMPLETED');
    expect(Number(completedJob?.result?.createdCount || 0)).toBe(2);
    expect(Number(completedJob?.result?.failedCount || 0)).toBe(0);

    const count = await Product.countDocuments({ organization: TEST_ORG_ID });
    expect(count).toBe(2);
  });

  it('supports validate-only background job without writes', async () => {
    const queueResponse = await request(app)
      .post('/api/products/bulk-import/jobs')
      .send({
        options: {
          validateOnly: true,
          duplicatePolicy: 'skip'
        },
        products: [
          { name: 'Validate Job Product', category: 'Demo', price: 9.5 }
        ]
      });

    expect(queueResponse.status).toBe(202);
    const jobId = queueResponse.body?.data?.id;
    expect(jobId).toBeTruthy();

    const completedJob = await pollBulkImportJob({ jobId });
    expect(String(completedJob?.status || '').toUpperCase()).toBe('COMPLETED');
    expect(completedJob?.result?.dryRun).toBe(true);
    expect(Number(completedJob?.result?.createdCount || 0)).toBe(0);

    const count = await Product.countDocuments({ organization: TEST_ORG_ID });
    expect(count).toBe(0);
  });
});
