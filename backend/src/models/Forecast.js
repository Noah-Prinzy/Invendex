import mongoose from 'mongoose';

const forecastSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },

    horizonDays: {
      type: Number,
      required: true,
      min: 1
    },

    expectedDemand: {
      type: Number,
      required: true,
      min: 0
    },

    avgDailyDemand: {
      type: Number,
      required: true,
      min: 0
    },

    volatility: {
      type: Number,
      required: true,
      min: 0
    },

    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },

    modelUsed: {
      type: String,
      required: true,
      trim: true
    },

    generatedAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

/**
 * ❗ Prevent duplicate forecasts for same product & timestamp
 */
forecastSchema.index(
  { organization: 1, product: 1, generatedAt: 1 },
  { unique: true }
);

/**
 * ⚡ Optimized query for "latest forecast per product"
 */
forecastSchema.index({ organization: 1, product: 1, generatedAt: -1 });

export default mongoose.model('Forecast', forecastSchema);
