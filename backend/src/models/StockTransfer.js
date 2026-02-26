import mongoose from 'mongoose';

const STOCK_TRANSFER_STATUSES = Object.freeze([
  'REQUESTED',
  'IN_TRANSIT',
  'COMPLETED',
  'CANCELLED'
]);

const STOCK_TRANSFER_REFERENCE_TYPES = Object.freeze([
  'MANUAL',
  'ORDER',
  'PICK_TICKET',
  'SYSTEM'
]);

const stockTransferSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    fromWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
      index: true
    },
    toWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: STOCK_TRANSFER_STATUSES,
      default: 'COMPLETED',
      index: true
    },
    reason: {
      type: String,
      trim: true,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: null
    },
    referenceType: {
      type: String,
      enum: STOCK_TRANSFER_REFERENCE_TYPES,
      default: 'MANUAL'
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: null
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

stockTransferSchema.pre('validate', function validateWarehouses(next) {
  if (
    this.fromWarehouse &&
    this.toWarehouse &&
    String(this.fromWarehouse) === String(this.toWarehouse)
  ) {
    this.invalidate(
      'toWarehouse',
      'toWarehouse must be different from fromWarehouse'
    );
  }
  next();
});

stockTransferSchema.index(
  { organization: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $exists: true, $ne: null } }
  }
);
stockTransferSchema.index({
  organization: 1,
  fromWarehouse: 1,
  toWarehouse: 1,
  createdAt: -1
});

export default mongoose.model('StockTransfer', stockTransferSchema);
