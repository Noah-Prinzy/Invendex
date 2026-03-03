import mongoose from 'mongoose';

const organizationSubscriptionSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    planCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'FREE'
    },
    status: {
      type: String,
      enum: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED'],
      default: 'ACTIVE',
      index: true
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now
    },
    currentPeriodEnd: {
      type: Date,
      default: null
    },
    trialEndsAt: {
      type: Date,
      default: null
    },
    canceledAt: {
      type: Date,
      default: null
    },
    usage: {
      apiRequestsCurrentWindow: {
        type: Number,
        min: 0,
        default: 0
      },
      apiWindowStartedAt: {
        type: Date,
        default: Date.now
      }
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

organizationSubscriptionSchema.index({ organization: 1 }, { unique: true });

organizationSubscriptionSchema.pre(
  'validate',
  function normalizeSubscription(next) {
    this.planCode = String(this.planCode || 'FREE')
      .trim()
      .toUpperCase();
    return next();
  }
);

export default mongoose.model(
  'OrganizationSubscription',
  organizationSubscriptionSchema
);
