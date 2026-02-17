import mongoose from 'mongoose';

const inventoryBatchSchema = new mongoose.Schema(
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
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
      index: true
    },
    lotNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    expiryDate: {
      type: Date,
      default: null
    },
    quantityOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    quantityReserved: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    quantityRecalled: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    sourceType: {
      type: String,
      enum: ['PURCHASE_ORDER', 'MANUAL', 'SYSTEM'],
      default: 'MANUAL'
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    lastMovementAt: {
      type: Date,
      default: Date.now
    },
    isRecalled: {
      type: Boolean,
      default: false,
      index: true
    },
    recalledAt: {
      type: Date,
      default: null
    },
    recallReason: {
      type: String,
      trim: true,
      default: null
    },
    recalledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

inventoryBatchSchema.index(
  { organization: 1, product: 1, warehouse: 1, lotNumber: 1 },
  { unique: true }
);
inventoryBatchSchema.index({ organization: 1, expiryDate: 1 });
inventoryBatchSchema.index({ organization: 1, isRecalled: 1, updatedAt: -1 });

inventoryBatchSchema.virtual('quantityAvailable').get(function getAvailable() {
  return this.quantityOnHand - this.quantityReserved;
});

inventoryBatchSchema.set('toJSON', { virtuals: true });
inventoryBatchSchema.set('toObject', { virtuals: true });

export default mongoose.model('InventoryBatch', inventoryBatchSchema);
