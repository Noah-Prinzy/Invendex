import mongoose from 'mongoose';

const inventorySnapshotSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },

    sku: {
      type: String,
      required: true
    },

    stock: {
      type: Number,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    recordedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    source: {
      type: String,
      enum: ['SYSTEM', 'ADMIN', 'STAFF'],
      default: 'SYSTEM'
    }
  },
  { timestamps: false }
);

export default mongoose.model(
  'InventorySnapshot',
  inventorySnapshotSchema
);
