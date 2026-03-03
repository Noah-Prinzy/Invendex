import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import BackgroundJob, {
  BACKGROUND_JOB_STATUSES,
  BACKGROUND_JOB_TYPES
} from '../models/BackgroundJob.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import InventoryReport from '../models/InventoryReport.js';
import { getTestDbUri } from './testDbUri.js';
import { getBackgroundJobArtifactDirectory } from '../services/jobs/backgroundJobArtifactService.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;
const originalArtifactDir = process.env.BACKGROUND_JOB_ARTIFACT_DIR;
const artifactDirectory = path.resolve(
  process.cwd(),
  'tmp',
  'test-background-job-artifacts'
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pollInventoryReportExportJob = async ({
  jobId,
  maxAttempts = 40,
  delayMs = 50
}) => {
  let latest = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await request(app).get(
      `/api/inventory-reports/export/jobs/${jobId}`
    );
    expect(response.status).toBe(200);
    latest = response.body?.data || null;

    const status = String(latest?.status || '').toUpperCase();
    if (status === BACKGROUND_JOB_STATUSES.COMPLETED || status === 'FAILED') {
      return latest;
    }

    await sleep(delayMs);
  }

  return latest;
};

describe('inventory report export background jobs', () => {
  beforeAll(async () => {
    process.env.AUTH_TEST_BYPASS = 'true';
    process.env.BACKGROUND_JOB_ARTIFACT_DIR = artifactDirectory;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(getTestDbUri());
    }
  });

  beforeEach(async () => {
    await Promise.all([
      BackgroundJob.deleteMany({}),
      InventorySnapshot.deleteMany({}),
      InventoryReport.deleteMany({}),
      Product.deleteMany({}),
      Organization.deleteMany({})
    ]);

    await fs.rm(getBackgroundJobArtifactDirectory(), {
      recursive: true,
      force: true
    });

    await Organization.create({
      _id: TEST_ORG_ID,
      name: 'Inventory Export Org',
      code: `EXJOB-${Date.now()}`
    });
  });

  afterAll(async () => {
    process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
    process.env.BACKGROUND_JOB_ARTIFACT_DIR = originalArtifactDir;
    await fs.rm(artifactDirectory, { recursive: true, force: true });
    await mongoose.connection.close();
  });

  it('queues and downloads an inventory export job artifact', async () => {
    const product = await Product.create({
      organization: TEST_ORG_ID,
      name: 'Inventory Export Product',
      sku: 'INV-EXPORT-001',
      price: 12.5,
      stock: 8
    });

    await InventorySnapshot.create({
      organization: TEST_ORG_ID,
      product: product._id,
      sku: product.sku,
      stock: 8,
      price: 12.5,
      recordedAt: new Date('2026-03-01T00:00:00.000Z'),
      source: 'SYSTEM'
    });

    const queueResponse = await request(app)
      .post('/api/inventory-reports/export/jobs')
      .send({
        format: 'csv'
      });

    expect(queueResponse.status).toBe(202);
    expect(queueResponse.body?.data?.id).toBeTruthy();

    const jobId = queueResponse.body.data.id;
    const completedJob = await pollInventoryReportExportJob({ jobId });

    expect(String(completedJob?.status || '').toUpperCase()).toBe('COMPLETED');
    expect(String(completedJob?.type || '')).toBe(
      BACKGROUND_JOB_TYPES.REPORT_EXPORT
    );
    expect(String(completedJob?.payload?.reportType || '')).toBe(
      'INVENTORY_REPORT'
    );
    expect(String(completedJob?.result?.artifact?.fileName || '')).toContain(
      `job-${jobId}.csv`
    );

    const downloadResponse = await request(app).get(
      `/api/inventory-reports/export/jobs/${jobId}/download`
    );
    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers['content-type']).toContain('text/csv');
    expect(downloadResponse.text).toContain('sku');
    expect(downloadResponse.text).toContain('INV-EXPORT-001');
  });

  it('rejects download when report export job is not completed', async () => {
    const job = await BackgroundJob.create({
      organization: TEST_ORG_ID,
      createdBy: new mongoose.Types.ObjectId('000000000000000000000000'),
      type: BACKGROUND_JOB_TYPES.REPORT_EXPORT,
      status: BACKGROUND_JOB_STATUSES.QUEUED,
      payload: {
        reportType: 'INVENTORY_REPORT',
        format: 'csv'
      }
    });

    const response = await request(app).get(
      `/api/inventory-reports/export/jobs/${job._id.toString()}/download`
    );

    expect(response.status).toBe(409);
    expect(String(response.body?.message || '')).toMatch(/not completed/i);
  });
});
