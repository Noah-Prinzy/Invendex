import mongoose from 'mongoose';
import request from 'supertest';

import app from '../app.js';
import OrganizationFeatureFlag from '../models/OrganizationFeatureFlag.js';
import OrganizationSubscription from '../models/OrganizationSubscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const originalAuthBypassValue = process.env.AUTH_TEST_BYPASS;

describe('api versioning, docs, feature flags, and subscriptions', () => {
  beforeAll(async () => {
    process.env.AUTH_TEST_BYPASS = 'true';
    await mongoose.connect(getTestDbUri());
  });

  afterAll(async () => {
    process.env.AUTH_TEST_BYPASS = originalAuthBypassValue;
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Promise.all([
      OrganizationFeatureFlag.deleteMany({}),
      OrganizationSubscription.deleteMany({}),
      SubscriptionPlan.deleteMany({})
    ]);
  });

  it('serves health and docs for both unversioned and v1 APIs', async () => {
    const legacyHealth = await request(app).get('/api/health');
    expect(legacyHealth.status).toBe(200);
    expect(legacyHealth.body?.success).toBe(true);

    const v1Health = await request(app).get('/api/v1/health');
    expect(v1Health.status).toBe(200);
    expect(v1Health.body?.success).toBe(true);
    expect(v1Health.headers['x-api-version']).toBe('v1');

    const openApi = await request(app).get('/api/v1/openapi.json');
    expect(openApi.status).toBe(200);
    expect(openApi.body?.openapi).toBe('3.0.3');
    expect(openApi.body?.paths).toBeTruthy();
  });

  it('exposes feature-flag and subscription controls', async () => {
    const featureList = await request(app).get('/api/feature-flags');
    expect(featureList.status).toBe(200);
    expect(Array.isArray(featureList.body?.data)).toBe(true);

    const patchFeature = await request(app)
      .patch('/api/feature-flags/dashboard_intelligence')
      .send({
        enabled: false,
        rolloutPercentage: 100
      });

    expect(patchFeature.status).toBe(200);
    expect(patchFeature.body?.data?.key).toBe('dashboard_intelligence');
    expect(patchFeature.body?.data?.enabled).toBe(false);

    const currentSubscription = await request(app).get(
      '/api/subscriptions/current'
    );
    expect(currentSubscription.status).toBe(200);
    expect(currentSubscription.body?.data?.plan?.code).toBe('FREE');

    const patchSubscription = await request(app)
      .patch('/api/subscriptions/current')
      .send({
        planCode: 'PRO'
      });

    expect(patchSubscription.status).toBe(200);
    expect(patchSubscription.body?.data?.plan?.code).toBe('PRO');

    const subscriptionDoc = await OrganizationSubscription.findOne({
      organization: TEST_ORG_ID
    }).lean();
    expect(subscriptionDoc).toBeTruthy();
    expect(String(subscriptionDoc.planCode)).toBe('PRO');
  });
});
