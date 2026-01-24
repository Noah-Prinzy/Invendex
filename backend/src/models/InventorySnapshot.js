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
      // ❌ removed index: true (covered by compound index below)
    },

    stock: {
      type: Number,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    /**
     * Logical snapshot timestamp
     * Used for demand & trend analysis
     */
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    /**
     * Source of snapshot creation
     */
    source: {
      type: String,
      enum: ['SYSTEM', 'ADMIN', 'STAFF', 'MANUAL', 'CRON'],
      default: 'SYSTEM'
    }
  },
  {
    timestamps: true // ✅ REQUIRED for analytics
  }
);

/**
 * 🔍 Time-series performance index
 * Optimized for demand calculations
 */
inventorySnapshotSchema.index(
  { sku: 1, recordedAt: 1 }
);

export default mongoose.model(
  'InventorySnapshot',
  inventorySnapshotSchema
);