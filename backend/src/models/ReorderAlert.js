import mongoose from 'mongoose';

const reorderAlertSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    sku: {
      type: String,
      required: true,
      index: true
    },

    stock: {
      type: Number,
      required: true
    },

    reorderLevel: {
      type: Number,
      required: true
    },

    triggeredAt: {
      type: Date,
      required: true
    },

    source: {
      type: String,
      enum: ['cron', 'manual', 'system'],
      default: 'cron'
    },

    /* 🆕 Supplier snapshot (A19.2.x) */
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null
    },

    supplierLeadTimeDays: {
      type: Number,
      default: null
    },

    supplierUnitCost: {
      type: Number,
      default: null
    },

    /* 🆕 A20.1 — Purchase Order linkage */
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null
    },

    orderedQuantity: {
      type: Number,
      default: null
    },

    isLocked: {
      type: Boolean,
      default: false
    },

    /* ✅ Resolution tracking */
    resolved: {
      type: Boolean,
      default: false
    },

    resolvedAt: {
      type: Date,
      default: null
    },

    resolutionReason: {
      type: String,
      trim: true,
      default: null
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
usedInPurchaseOrder: {
  type: Boolean,
  default: false
},
usedInPurchaseOrderAt: {
  type: Date
},
processed: {
  type: Boolean,
  default: false
},
processedAt: {
  type: Date
}

  },
  { timestamps: true }
);

/**
 * ❗ Prevent duplicate alerts per product per day
 */
reorderAlertSchema.index(
  { product: 1, triggeredAt: 1 },
  { unique: true }
);

export default mongoose.model('ReorderAlert', reorderAlertSchema);