import mongoose from 'mongoose';
import BackgroundJob, {
  BACKGROUND_JOB_TYPES
} from '../models/BackgroundJob.js';
import Organization from '../models/Organization.js';
import Product from '../models/Product.js';
import InventorySnapshot from '../models/InventorySnapshot.js';
import InventoryMetrics from '../models/InventoryMetrics.js';
import { processQueuedBackgroundJob } from '../services/jobs/backgroundJobProcessor.js';
import { getTestDbUri } from './testDbUri.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    BackgroundJob.deleteMany({}),
    InventorySnapshot.deleteMany({}),
    InventoryMetrics.deleteMany({}),
    Product.deleteMany({}),
    Organization.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('background scheduled jobs', () => {
  it('processes inventory snapshot daily jobs', async () => {
    const organization = await Organization.create({
      name: 'Snapshot Org',
      code: 'SNAPSHOT_ORG'
    });

    await Product.create({
      organization: organization._id,
      name: 'Snapshot Product',
      sku: 'SNAP-001',
      stock: 9,
      price: 15
    });

    const snapshotDate = new Date('2026-03-02T00:00:00.000Z');
    const job = await BackgroundJob.create({
      organization: organization._id,
      type: BACKGROUND_JOB_TYPES.INVENTORY_SNAPSHOT_DAILY,
      payload: { snapshotDate: snapshotDate.toISOString() }
    });

    await processQueuedBackgroundJob(job._id.toString());

    const refreshedJob = await BackgroundJob.findById(job._id).lean();
    expect(refreshedJob?.status).toBe('COMPLETED');
    expect(Number(refreshedJob?.result?.createdCount || 0)).toBe(1);

    const snapshot = await InventorySnapshot.findOne({
      organization: organization._id,
      source: 'CRON'
    }).lean();
    expect(snapshot).toBeTruthy();
    expect(Number(snapshot?.stock || 0)).toBe(9);
  });

  it('processes inventory metrics daily jobs', async () => {
    const organization = await Organization.create({
      name: 'Metrics Org',
      code: 'METRICS_ORG'
    });

    await Product.create({
      organization: organization._id,
      name: 'Metrics Product',
      sku: 'MET-001',
      stock: 4,
      price: 50
    });

    const targetDate = new Date('2026-03-02T00:00:00.000Z');
    const job = await BackgroundJob.create({
      organization: organization._id,
      type: BACKGROUND_JOB_TYPES.INVENTORY_METRICS_DAILY,
      payload: { targetDate: targetDate.toISOString() }
    });

    await processQueuedBackgroundJob(job._id.toString());

    const refreshedJob = await BackgroundJob.findById(job._id).lean();
    expect(refreshedJob?.status).toBe('COMPLETED');
    expect(Number(refreshedJob?.result?.skuCount || 0)).toBe(1);

    const metrics = await InventoryMetrics.findOne({
      organization: organization._id
    }).lean();
    expect(metrics).toBeTruthy();
    expect(Number(metrics?.totalStock || 0)).toBe(4);
  });

  it('processes email notification jobs with disabled SMTP as skipped', async () => {
    const originalEmailToggle = process.env.EMAIL_NOTIFICATIONS_ENABLED;
    process.env.EMAIL_NOTIFICATIONS_ENABLED = 'false';

    try {
      const organization = await Organization.create({
        name: 'Email Org',
        code: 'EMAIL_ORG'
      });

      const job = await BackgroundJob.create({
        organization: organization._id,
        type: BACKGROUND_JOB_TYPES.EMAIL_NOTIFICATION,
        payload: {
          to: 'employee@example.com',
          subject: 'Test subject',
          text: 'Test message'
        }
      });

      await processQueuedBackgroundJob(job._id.toString());

      const refreshedJob = await BackgroundJob.findById(job._id).lean();
      expect(refreshedJob?.status).toBe('COMPLETED');
      expect(Number(refreshedJob?.result?.skippedCount || 0)).toBe(1);
      expect(refreshedJob?.result?.delivery?.skipped).toBe(true);
    } finally {
      process.env.EMAIL_NOTIFICATIONS_ENABLED = originalEmailToggle;
    }
  });
});
