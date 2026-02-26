import mongoose from 'mongoose';

const forecastResultSchema = new mongoose.Schema(
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
      index: true
    },

    expectedDemand: {
      type: Number,
      required: true
    },

    avgDailyDemand: {
      type: Number,
      required: true
    },

    volatility: {
      type: Number,
      required: true
    },

    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },

    modelUsed: {
      type: String,
      default: 'moving-average'
    },

    generatedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate forecasts for same product + horizon + time window
forecastResultSchema.index({
  organization: 1,
  product: 1,
  horizonDays: 1,
  generatedAt: -1
});

export default mongoose.model('ForecastResult', forecastResultSchema);
