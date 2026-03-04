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
    importTaxEnabled: {
      type: Boolean,
      default: false
    },
    importTaxRate: {
      type: Number,
      default: 0,
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
    regionProfile: {
      taxAuthorityName: {
        type: String,
        trim: true,
        default: ''
      },
      taxRegistrationNumber: {
        type: String,
        trim: true,
        default: ''
      },
      regime: {
        type: String,
        enum: ['STANDARD_VAT', 'SIMPLIFIED', 'ZERO_RATED', 'EXEMPT'],
        default: 'STANDARD_VAT'
      },
      defaultTaxCategory: {
        type: String,
        enum: ['STANDARD', 'REDUCED', 'ZERO', 'EXEMPT'],
        default: 'STANDARD'
      }
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
