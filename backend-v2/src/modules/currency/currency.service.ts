import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import type { IExchangeRate } from '../../persistence/schemas/exchange-rate.schema';

/** Fiat currencies Invendex supports; UGX is the default/base for Uganda. */
export const FIAT_CURRENCIES = [
  'UGX',
  'USD',
  'EUR',
  'GBP',
  'KES',
  'TZS',
  'RWF',
  'NGN',
  'GHS',
  'ZAR',
  'CNY'
] as const;

/**
 * Static fallback rates against UGX (approximate, for cold start only —
 * real rates come from the ExchangeRate collection fed by an FX source).
 */
const STATIC_UGX_RATES: Record<string, number> = {
  UGX: 1,
  USD: 1 / 3700,
  EUR: 1 / 4000,
  GBP: 1 / 4700,
  KES: 1 / 28.5,
  TZS: 1 / 9.2,
  RWF: 1 / 2.6,
  NGN: 1 / 2.45,
  GHS: 1 / 310,
  ZAR: 1 / 205,
  CNY: 1 / 520
};

export interface ExchangeRatesResult {
  base: string;
  rates: Record<string, number>;
  asOf: Date;
  source: string;
}

@Injectable()
export class CurrencyService {
  constructor(
    @InjectModel('ExchangeRate')
    private readonly exchangeRateModel: Model<IExchangeRate>
  ) {}

  supportedCurrencies(): string[] {
    return [...FIAT_CURRENCIES];
  }

  async getRates(base: string): Promise<ExchangeRatesResult> {
    const normalizedBase = base.toUpperCase();
    const doc = await this.exchangeRateModel
      .findOne({ base: normalizedBase })
      .setOptions({ tenantBypass: true })
      .sort({ asOf: -1 })
      .lean();
    if (doc) {
      return {
        base: normalizedBase,
        rates: { ...(doc.rates as unknown as Record<string, number>) },
        asOf: doc.asOf,
        source: doc.source
      };
    }
    const rates =
      normalizedBase === 'UGX'
        ? STATIC_UGX_RATES
        : this.invertAgainstUgx(normalizedBase);
    return {
      base: normalizedBase,
      rates,
      asOf: new Date(),
      source: 'static-fallback'
    };
  }

  async convert(
    amount: number,
    from: string,
    to: string
  ): Promise<{ amount: number; from: string; to: string; rate: number; result: number }> {
    const { rates } = await this.getRates(from);
    const rate = rates[to.toUpperCase()];
    if (!rate) {
      throw new AppError(`No exchange rate available for ${to}`, 400);
    }
    return {
      amount,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate,
      result: amount * rate
    };
  }

  private invertAgainstUgx(base: string): Record<string, number> {
    const baseToUgx = STATIC_UGX_RATES[base];
    if (!baseToUgx) return { [base]: 1 };
    const rates: Record<string, number> = {};
    for (const [currency, ugxRate] of Object.entries(STATIC_UGX_RATES)) {
      rates[currency] = ugxRate / baseToUgx;
    }
    return rates;
  }
}
