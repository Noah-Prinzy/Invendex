import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import BackgroundJob, {
  BACKGROUND_JOB_STATUSES,
  BACKGROUND_JOB_TYPES
} from '../models/BackgroundJob.js';
import Organization from '../models/Organization.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import Warehouse from '../models/Warehouse.js';
import { getTestDbUri } from './testDbUri.js';
import { getBackgroundJobArtifactDirectory } from '../services/jobs/backgroundJobArtifactService.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const TEST_USER_ID = new mongoose.Types.ObjectId('000000000000000000000000');
const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;
const originalArtifactDir = process.env.BACKGROUND_JOB_ARTIFACT_DIR;
const artifactDirectory = path.resolve(
  process.cwd(),
  'tmp',
  'test-report-export-artifacts'
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pollReportExportJob = async ({
  jobId,
  maxAttempts = 40,
  delayMs = 50
}) => {
  let latest = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await request(app).get(
      `/api/reports/export/jobs/${jobId}`
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

describe('operational report export background jobs', () => {
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
      PurchaseOrder.deleteMany({}),
      Supplier.deleteMany({}),
      Warehouse.deleteMany({}),
      Organization.deleteMany({})
    ]);

    await fs.rm(getBackgroundJobArtifactDirectory(), {
      recursive: true,
      force: true
    });

    await Organization.create({
      _id: TEST_ORG_ID,
      name: 'Report Export Org',
      code: `RPTX-${Date.now()}`
    });

    const supplier = await Supplier.create({
      organization: TEST_ORG_ID,
      name: 'Acme Supplier'
    });

    const warehouse = await Warehouse.create({
      organization: TEST_ORG_ID,
      name: 'Main Warehouse',
      code: 'WH-MAIN'
    });

    await PurchaseOrder.create([
      {
        organization: TEST_ORG_ID,
        supplier: supplier._id,
        warehouse: warehouse._id,
        status: 'DRAFT',
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            sku: 'SKU-DRAFT',
            quantity: 2,
            unitCost: 50,
            totalCost: 100
          }
        ],
        totalQuantity: 2,
        totalAmount: 100,
        createdBy: TEST_USER_ID
      },
      {
        organization: TEST_ORG_ID,
        supplier: supplier._id,
        warehouse: warehouse._id,
        status: 'RECEIVED',
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            sku: 'SKU-REC',
            quantity: 3,
            unitCost: 40,
            totalCost: 120
          }
        ],
        totalQuantity: 3,
        totalAmount: 120,
        createdBy: TEST_USER_ID
      }
    ]);
  });

  afterAll(async () => {
    process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
    process.env.BACKGROUND_JOB_ARTIFACT_DIR = originalArtifactDir;
    await fs.rm(artifactDirectory, { recursive: true, force: true });
    await mongoose.connection.close();
  });

  it('queues and downloads purchase-order status summary export', async () => {
    const queueResponse = await request(app)
      .post('/api/reports/export/jobs')
      .send({
        reportType: 'PURCHASE_ORDER_STATUS_SUMMARY',
        format: 'xlsx'
      });

    expect(queueResponse.status).toBe(202);
    const jobId = queueResponse.body?.data?.id;
    expect(jobId).toBeTruthy();

    const completedJob = await pollReportExportJob({ jobId });
    expect(String(completedJob?.status || '').toUpperCase()).toBe('COMPLETED');
    expect(String(completedJob?.type || '')).toBe(
      BACKGROUND_JOB_TYPES.REPORT_EXPORT
    );
    expect(String(completedJob?.payload?.reportType || '')).toBe(
      'PURCHASE_ORDER_STATUS_SUMMARY'
    );

    const downloadResponse = await request(app).get(
      `/api/reports/export/jobs/${jobId}/download`
    );
    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });

  it('queues and downloads full summary csv export', async () => {
    const queueResponse = await request(app)
      .post('/api/reports/export/jobs')
      .send({
        reportType: 'FULL_SUMMARY',
        format: 'csv'
      });

    expect(queueResponse.status).toBe(202);
    const jobId = queueResponse.body?.data?.id;
    expect(jobId).toBeTruthy();

    const completedJob = await pollReportExportJob({ jobId });
    expect(String(completedJob?.status || '').toUpperCase()).toBe('COMPLETED');
    expect(String(completedJob?.payload?.reportType || '')).toBe(
      'FULL_SUMMARY'
    );

    const downloadResponse = await request(app).get(
      `/api/reports/export/jobs/${jobId}/download`
    );
    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers['content-type']).toContain('text/csv');
    expect(downloadResponse.text).toContain('summary');
    expect(downloadResponse.text).toContain('spend_by_supplier');
  });

  it('queues and downloads purchase-order status summary pdf export', async () => {
    const queueResponse = await request(app)
      .post('/api/reports/export/jobs')
      .send({
        reportType: 'PURCHASE_ORDER_STATUS_SUMMARY',
        format: 'pdf'
      });

    expect(queueResponse.status).toBe(202);
    const jobId = queueResponse.body?.data?.id;
    expect(jobId).toBeTruthy();

    const completedJob = await pollReportExportJob({ jobId });
    expect(String(completedJob?.status || '').toUpperCase()).toBe('COMPLETED');

    const downloadResponse = await request(app).get(
      `/api/reports/export/jobs/${jobId}/download`
    );
    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers['content-type']).toContain(
      'application/pdf'
    );
    expect(
      String(downloadResponse.headers['content-disposition'] || '')
    ).toContain('.pdf');
  });

  it('queues and downloads full summary pdf export', async () => {
    const queueResponse = await request(app)
      .post('/api/reports/export/jobs')
      .send({
        reportType: 'FULL_SUMMARY',
        format: 'pdf'
      });

    expect(queueResponse.status).toBe(202);
    const jobId = queueResponse.body?.data?.id;
    expect(jobId).toBeTruthy();

    const completedJob = await pollReportExportJob({ jobId });
    expect(String(completedJob?.status || '').toUpperCase()).toBe('COMPLETED');

    const downloadResponse = await request(app).get(
      `/api/reports/export/jobs/${jobId}/download`
    );
    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers['content-type']).toContain(
      'application/pdf'
    );
    expect(
      String(downloadResponse.headers['content-disposition'] || '')
    ).toContain('.pdf');
  });
});
