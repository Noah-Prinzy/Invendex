import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import ExchangeRate from '../models/ExchangeRate.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import TaxConfiguration from '../models/TaxConfiguration.js';
import InventoryValuationConfig from '../models/InventoryValuationConfig.js';
import { getTestDbUri } from './testDbUri.js';

const TEST_ORG_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const originalTestDbUri = process.env.MONGO_TEST_URI;

beforeAll(async () => {
  process.env.AUTH_TEST_BYPASS = 'true';
  process.env.MONGO_TEST_URI =
    'mongodb://127.0.0.1:27017/invendex_test_finance_currency_api';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    ExchangeRate.deleteMany({}),
    OrganizationSettings.deleteMany({}),
    TaxConfiguration.deleteMany({}),
    InventoryValuationConfig.deleteMany({})
  ]);

  await OrganizationSettings.create({
    organization: TEST_ORG_ID,
    companyProfile: {
      currencyCode: 'UGX'
    }
  });
});

afterAll(async () => {
  await mongoose.connection.close();
  process.env.MONGO_TEST_URI = originalTestDbUri;
});

describe('finance currency APIs', () => {
  it('stores exchange rates and converts valuation responses into target currency', async () => {
    const upsertResponse = await request(app)
      .put('/api/finance/exchange-rates')
      .send({
        rates: [
          {
            quoteCurrencyCode: 'USD',
            rate: 0.00027
          }
        ]
      });
    expect(upsertResponse.status).toBe(200);
    expect(upsertResponse.body?.success).toBe(true);
    expect(upsertResponse.body?.data?.baseCurrencyCode).toBe('UGX');
    expect(upsertResponse.body?.data?.rates?.[0]?.quoteCurrencyCode).toBe(
      'USD'
    );

    const listResponse = await request(app).get('/api/finance/exchange-rates');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body?.data?.rates?.length).toBe(1);

    const convertResponse = await request(app)
      .post('/api/finance/convert-currency')
      .send({
        amount: 100000,
        fromCurrencyCode: 'UGX',
        toCurrencyCode: 'USD'
      });
    expect(convertResponse.status).toBe(200);
    expect(convertResponse.body?.data?.convertedAmount).toBe(27);
    expect(convertResponse.body?.data?.rate).toBe(0.00027);

    const valuationResponse = await request(app).get(
      '/api/finance/valuation?currencyCode=USD'
    );
    expect(valuationResponse.status).toBe(200);
    expect(valuationResponse.body?.data?.currencyCode).toBe('USD');
    expect(valuationResponse.body?.data?.baseCurrencyCode).toBe('UGX');
    expect(valuationResponse.body?.data?.exchangeRate).toBe(0.00027);
  });
});
