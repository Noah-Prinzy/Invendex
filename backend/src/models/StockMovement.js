import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    movementType: {
      type: String,
      enum: [
        'INBOUND',
        'OUTBOUND',
        'TRANSFER',
        'ALLOCATION',
        'PICK',
        'ADJUSTMENT'
      ],
      required: true,
      index: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    warehouseFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    },
    warehouseTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    },
    binFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseBin',
      default: null
    },
    binTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseBin',
      default: null
    },
    reason: {
      type: String,
      trim: true,
      default: null
    },
    referenceType: {
      type: String,
      enum: ['PURCHASE_ORDER', 'PICK_TICKET', 'MANUAL', 'SYSTEM'],
      default: 'MANUAL'
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    movedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    movedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    metadata: {
      type: Object,
      default: null
    }
  },
  { timestamps: true }
);

stockMovementSchema.index({ organization: 1, movedAt: -1 });
stockMovementSchema.index({ organization: 1, product: 1, movedAt: -1 });

export default mongoose.model('StockMovement', stockMovementSchema);
