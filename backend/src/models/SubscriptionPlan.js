import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    monthlyPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    limits: {
      apiRequestsPer15Min: {
        type: Number,
        min: 10,
        default: 300
      },
      maxUsers: {
        type: Number,
        min: 1,
        default: 5
      },
      maxWarehouses: {
        type: Number,
        min: 1,
        default: 1
      }
    },
    features: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

subscriptionPlanSchema.index({ code: 1 }, { unique: true });

subscriptionPlanSchema.pre('validate', function normalizePlan(next) {
  this.code = String(this.code || '')
    .trim()
    .toUpperCase();
  this.features = Array.isArray(this.features)
    ? this.features
        .map((feature) =>
          String(feature || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    : [];
  return next();
});

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
