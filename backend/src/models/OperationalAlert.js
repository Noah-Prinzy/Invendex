import mongoose from 'mongoose';

const operationalAlertSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARN', 'ERROR', 'CRITICAL'],
      default: 'WARN',
      index: true
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    context: {
      type: Object,
      default: {}
    },
    source: {
      type: String,
      trim: true,
      default: 'system'
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

operationalAlertSchema.index({ severity: 1, createdAt: -1 });
operationalAlertSchema.index({ category: 1, createdAt: -1 });

export default mongoose.model('OperationalAlert', operationalAlertSchema);
