import mongoose from 'mongoose';

const inventorySerialSchema = new mongoose.Schema(
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
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryBatch',
      default: null,
      index: true
    },
    lotNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null
    },
    serialNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    status: {
      type: String,
      enum: [
        'AVAILABLE',
        'RESERVED',
        'SOLD',
        'DAMAGED',
        'RETURNED',
        'RECALL_HOLD'
      ],
      default: 'AVAILABLE',
      index: true
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
    receivedAt: {
      type: Date,
      default: Date.now
    },
    expiryDate: {
      type: Date,
      default: null
    },
    recallReason: {
      type: String,
      trim: true,
      default: null
    },
    recalledAt: {
      type: Date,
      default: null
    },
    recalledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    soldAt: {
      type: Date,
      default: null
    },
    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    soldReferenceType: {
      type: String,
      enum: ['ORDER', 'PICK_TICKET', 'MANUAL', 'SYSTEM'],
      default: null
    },
    soldReferenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    reservedAt: {
      type: Date,
      default: null
    },
    reservedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reservedReferenceType: {
      type: String,
      enum: ['ORDER', 'PICK_TICKET', 'MANUAL', 'SYSTEM'],
      default: null
    },
    reservedReferenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  { timestamps: true }
);

inventorySerialSchema.index(
  { organization: 1, product: 1, serialNumber: 1 },
  { unique: true }
);
inventorySerialSchema.index({ organization: 1, warehouse: 1, status: 1 });
inventorySerialSchema.index({ organization: 1, lotNumber: 1, status: 1 });

export default mongoose.model('InventorySerial', inventorySerialSchema);
