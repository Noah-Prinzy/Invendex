import mongoose from 'mongoose';

const forecastSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },

    horizonDays: {
      type: Number,
      required: true
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
      min: 0,
      max: 1,
      required: true
    },

    modelUsed: {
      type: String,
      required: true
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

// Prevent duplicate forecasts for same product & timestamp
forecastSchema.index(
  { product: 1, generatedAt: 1 },
  { unique: true }
);

export default mongoose.model('Forecast', forecastSchema);