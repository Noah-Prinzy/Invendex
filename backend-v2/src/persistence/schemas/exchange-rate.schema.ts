import { Schema, type Document } from 'mongoose';

export interface IExchangeRate extends Document {
  base: string;
  rates: Record<string, number>;
  asOf: Date;
  source: string;
  createdAt: Date;
}

/**
 * Global (non-tenant) FX table. System queries must use `{ tenantBypass: true }`.
 */
export const ExchangeRateSchema = new Schema<IExchangeRate>(
  {
    base: { type: String, required: true, uppercase: true, trim: true },
    rates: { type: Map, of: Number, default: {} },
    asOf: { type: Date, required: true },
    source: { type: String, default: 'static', trim: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ExchangeRateSchema.index({ base: 1, asOf: -1 });
