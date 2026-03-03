import mongoose from 'mongoose';

const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

const exchangeRateSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    baseCurrencyCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3
    },
    quoteCurrencyCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3
    },
    rate: {
      type: Number,
      required: true,
      min: 0.000001
    },
    source: {
      type: String,
      enum: ['MANUAL', 'SYSTEM'],
      default: 'MANUAL'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    effectiveAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

exchangeRateSchema.pre('validate', function normalizeExchangeRate(next) {
  this.baseCurrencyCode = String(this.baseCurrencyCode || '')
    .trim()
    .toUpperCase();
  this.quoteCurrencyCode = String(this.quoteCurrencyCode || '')
    .trim()
    .toUpperCase();

  if (!CURRENCY_CODE_REGEX.test(this.baseCurrencyCode)) {
    return next(new Error('baseCurrencyCode must be a 3-letter currency code'));
  }
  if (!CURRENCY_CODE_REGEX.test(this.quoteCurrencyCode)) {
    return next(
      new Error('quoteCurrencyCode must be a 3-letter currency code')
    );
  }
  if (this.baseCurrencyCode === this.quoteCurrencyCode) {
    return next(
      new Error('baseCurrencyCode and quoteCurrencyCode must be different')
    );
  }

  this.rate = Number(this.rate);
  return next();
});

exchangeRateSchema.index(
  { organization: 1, baseCurrencyCode: 1, quoteCurrencyCode: 1 },
  { unique: true }
);

exchangeRateSchema.index({
  organization: 1,
  baseCurrencyCode: 1,
  updatedAt: -1
});

export default mongoose.model('ExchangeRate', exchangeRateSchema);
