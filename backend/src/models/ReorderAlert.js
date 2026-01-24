import mongoose from 'mongoose';

const REORDER_SOURCES = Object.freeze([
  'cron',
  'manual',
  'system',
  'static',
  'forecast'
]);

const ALERT_STATUSES = Object.freeze([
  'ACTIVE',
  'RESOLVED',
  'CANCELLED'
]);

const reorderAlertSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
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

    /**
     * 🔢 Quantity suggested to reorder
     */
    reorderQuantity: {
      type: Number,
      required: true,
      min: 0
    },

    /**
     * 🚦 Alert lifecycle status
     */
    status: {
      type: String,
      enum: ALERT_STATUSES,
      default: 'ACTIVE',
      index: true
    },

    triggeredAt: {
      type: Date,
      required: true,
      index: true
    },

    /**
     * Source of alert generation
     * Always stored lowercase
     */
    source: {
      type: String,
      enum: REORDER_SOURCES,
      default: 'cron',
      lowercase: true,
      trim: true
    },

    /**
     * Optional engine metadata
     */
    metadata: {
      type: Object,
      default: null
    },

    /* 🧊 Supplier snapshot */
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

    /* 🆕 Purchase Order linkage */
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
      default: false,
      index: true
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

    /* 🧾 Purchase order usage tracking */
    usedInPurchaseOrder: {
      type: Boolean,
      default: false
    },

    usedInPurchaseOrderAt: {
      type: Date,
      default: null
    },

    processed: {
      type: Boolean,
      default: false
    },

    processedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

/**
 * ❗ Prevent duplicate ACTIVE alerts per product per day
 */
reorderAlertSchema.index(
  {
    product: 1,
    triggeredAt: 1,
    resolved: 1
  },
  {
    unique: true,
    partialFilterExpression: { resolved: false }
  }
);

export default mongoose.model('ReorderAlert', reorderAlertSchema);