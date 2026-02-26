import mongoose from 'mongoose';

export const IDEMPOTENCY_SCOPES = [
  'MANUAL_STOCK_ADJUSTMENT',
  'RECEIVE_PURCHASE_ORDER'
];

export const IDEMPOTENCY_STATUSES = ['PROCESSING', 'COMPLETED', 'FAILED'];

const idempotencyRequestSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    scope: {
      type: String,
      required: true,
      enum: IDEMPOTENCY_SCOPES,
      index: true
    },
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128
    },
    requestHash: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: IDEMPOTENCY_STATUSES,
      default: 'PROCESSING',
      index: true
    },
    responseData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    errorMessage: {
      type: String,
      default: null,
      maxlength: 500
    },
    completedAt: {
      type: Date,
      default: null
    },
    failedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

idempotencyRequestSchema.index(
  { organization: 1, scope: 1, key: 1 },
  { unique: true }
);
idempotencyRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('IdempotencyRequest', idempotencyRequestSchema);
