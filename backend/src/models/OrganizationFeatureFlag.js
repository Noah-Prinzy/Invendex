import mongoose from 'mongoose';

const featureFlagItemSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    enabled: {
      type: Boolean,
      default: false
    },
    rolloutPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const organizationFeatureFlagSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    flags: {
      type: [featureFlagItemSchema],
      default: []
    }
  },
  { timestamps: true }
);

organizationFeatureFlagSchema.index({ organization: 1 }, { unique: true });

organizationFeatureFlagSchema.pre(
  'validate',
  function validateUniqueKeys(next) {
    const seen = new Set();
    for (const entry of this.flags || []) {
      const normalizedKey = String(entry?.key || '')
        .trim()
        .toLowerCase();
      if (!normalizedKey) {
        return next(new Error('Feature flag key is required'));
      }
      if (seen.has(normalizedKey)) {
        return next(
          new Error(`Duplicate feature flag key detected: ${normalizedKey}`)
        );
      }
      entry.key = normalizedKey;
      seen.add(normalizedKey);
    }
    return next();
  }
);

export default mongoose.model(
  'OrganizationFeatureFlag',
  organizationFeatureFlagSchema
);
