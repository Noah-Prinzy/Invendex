import mongoose from 'mongoose';

const taxConfigurationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    countryCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'UG'
    },
    currencyCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'UGX'
    },
    vatEnabled: {
      type: Boolean,
      default: true
    },
    vatRate: {
      type: Number,
      default: 18,
      min: 0,
      max: 100
    },
    taxInclusivePricing: {
      type: Boolean,
      default: false
    },
    roundingMode: {
      type: String,
      enum: ['HALF_UP'],
      default: 'HALF_UP'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lastReviewedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

taxConfigurationSchema.index({ organization: 1 }, { unique: true });

export default mongoose.model('TaxConfiguration', taxConfigurationSchema);
