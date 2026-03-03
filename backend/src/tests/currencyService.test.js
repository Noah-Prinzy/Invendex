import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import ExchangeRate from '../models/ExchangeRate.js';
import { getTestDbUri } from './testDbUri.js';
import {
  convertCurrencyAmount,
  getExchangeRates,
  upsertExchangeRates
} from '../services/finance/currencyService.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }
});

beforeEach(async () => {
  await Promise.all([
    Organization.deleteMany({}),
    OrganizationSettings.deleteMany({}),
    ExchangeRate.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('currencyService', () => {
  it('upserts rates and converts with direct, inverse, and cross paths', async () => {
    const organization = await Organization.create({
      name: 'Currency Org',
      code: 'CURRENCY_ORG'
    });

    await OrganizationSettings.create({
      organization: organization._id,
      companyProfile: {
        currencyCode: 'UGX'
      }
    });

    await upsertExchangeRates({
      organizationId: organization._id,
      rates: [
        { quoteCurrencyCode: 'USD', rate: 0.00027 },
        { quoteCurrencyCode: 'KES', rate: 0.036 }
      ]
    });

    const rates = await getExchangeRates({
      organizationId: organization._id
    });
    expect(rates.baseCurrencyCode).toBe('UGX');
    expect(rates.rates).toHaveLength(2);

    const direct = await convertCurrencyAmount({
      organizationId: organization._id,
      amount: 100000,
      fromCurrencyCode: 'UGX',
      toCurrencyCode: 'USD'
    });
    expect(direct.convertedAmount).toBe(27);
    expect(direct.rate).toBe(0.00027);

    const inverse = await convertCurrencyAmount({
      organizationId: organization._id,
      amount: 27,
      fromCurrencyCode: 'USD',
      toCurrencyCode: 'UGX'
    });
    expect(inverse.convertedAmount).toBe(100000);

    const cross = await convertCurrencyAmount({
      organizationId: organization._id,
      amount: 10,
      fromCurrencyCode: 'USD',
      toCurrencyCode: 'KES'
    });
    expect(cross.convertedAmount).toBe(1333.33);
  });
});
