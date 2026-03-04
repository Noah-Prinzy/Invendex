import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    smsLowStockEnabled: {
      type: Boolean,
      default: false
    },
    smsLowStockRecipients: {
      type: [String],
      default: []
    },
    whatsappLowStockEnabled: {
      type: Boolean,
      default: false
    },
    whatsappLowStockRecipients: {
      type: [String],
      default: []
    },
    onboardingSampleSeededAt: {
      type: Date,
      default: null
    },
    onboardingSampleSeedVersion: {
      type: String,
      default: null,
      trim: true
    }
  },
  { timestamps: true }
);

organizationSchema.index({ code: 1 }, { unique: true });

export default mongoose.model('Organization', organizationSchema);
