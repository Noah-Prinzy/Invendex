import mongoose from 'mongoose';

export const BACKGROUND_JOB_TYPES = Object.freeze({
  PRODUCT_BULK_IMPORT: 'PRODUCT_BULK_IMPORT',
  REPORT_EXPORT: 'REPORT_EXPORT',
  INVENTORY_SNAPSHOT_DAILY: 'INVENTORY_SNAPSHOT_DAILY',
  INVENTORY_METRICS_DAILY: 'INVENTORY_METRICS_DAILY',
  FORECAST_GENERATION_DAILY: 'FORECAST_GENERATION_DAILY',
  FORECAST_REORDER_DAILY: 'FORECAST_REORDER_DAILY',
  EMAIL_NOTIFICATION: 'EMAIL_NOTIFICATION'
});

export const BACKGROUND_JOB_STATUSES = Object.freeze({
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
});

const backgroundJobSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(BACKGROUND_JOB_TYPES),
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(BACKGROUND_JOB_STATUSES),
      required: true,
      default: BACKGROUND_JOB_STATUSES.QUEUED,
      index: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    dedupeKey: {
      type: String,
      default: null,
      trim: true,
      maxlength: 200,
      index: true
    },
    progress: {
      percent: { type: Number, default: 0, min: 0, max: 100 },
      totalRows: { type: Number, default: 0, min: 0 },
      processedRows: { type: Number, default: 0, min: 0 },
      createdCount: { type: Number, default: 0, min: 0 },
      updatedCount: { type: Number, default: 0, min: 0 },
      skippedCount: { type: Number, default: 0, min: 0 },
      failedCount: { type: Number, default: 0, min: 0 }
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    error: {
      message: { type: String, default: null },
      code: { type: String, default: null }
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  },
  {
    timestamps: true
  }
);

backgroundJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
backgroundJobSchema.index({ organization: 1, createdAt: -1 });
backgroundJobSchema.index({
  organization: 1,
  type: 1,
  dedupeKey: 1,
  status: 1
});

export default mongoose.model('BackgroundJob', backgroundJobSchema);
