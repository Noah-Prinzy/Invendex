import mongoose from 'mongoose';

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    sku: {
      type: String,
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    unitCost: {
      type: Number,
      required: true,
      min: 0
    },

    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    trackingType: {
      type: String,
      enum: ['NONE', 'BATCH', 'SERIAL'],
      default: 'NONE'
    },
    lotNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null
    },
    expiryDate: {
      type: Date,
      default: null
    },
    serialNumbers: {
      type: [String],
      default: []
    },

    reorderAlert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReorderAlert',
      default: null
    }
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    poNumber: {
      type: String,
      unique: true,
      index: true
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true
    },

    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'RECEIVED', 'CLOSED', 'CANCELLED'],
      default: 'DRAFT',
      index: true
    },

    /**
     * 🆕 Origin of PO
     */
    source: {
      type: String,
      enum: ['REORDER_ENGINE', 'MANUAL'],
      default: 'MANUAL',
      index: true
    },

    /**
     * 🆕 Linked reorder alerts
     */
    reorderAlerts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReorderAlert'
      }
    ],

    items: {
      type: [purchaseOrderItemSchema],
      required: true
    },

    totalQuantity: {
      type: Number,
      min: 1
    },

    /**
     * Canonical total used by services
     */
    totalCost: {
      type: Number,
      min: 0
    },

    /**
     * Backward compatibility
     */
    totalAmount: {
      type: Number,
      min: 0
    },

    expectedDeliveryDate: {
      type: Date,
      default: null
    },

    notes: {
      type: String,
      trim: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    sentAt: {
      type: Date,
      default: null
    },

    receivedAt: {
      type: Date,
      default: null
    },

    closedAt: {
      type: Date,
      default: null
    },

    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

/**
 * 🔢 Auto-generate PO number
 * 🔁 Keep totals in sync
 */
purchaseOrderSchema.pre('save', function (next) {
  if (!this.poNumber) {
    this.poNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  // 🧮 Recalculate item totals (safety)
  if (Array.isArray(this.items)) {
    for (const item of this.items) {
      item.totalCost = item.quantity * item.unitCost;

      const trackingType = String(item.trackingType || 'NONE')
        .trim()
        .toUpperCase();
      item.trackingType = trackingType;

      if (trackingType === 'BATCH' && !item.lotNumber) {
        return next(
          new Error(`lotNumber is required for BATCH item ${item.sku || ''}`)
        );
      }

      if (trackingType === 'SERIAL') {
        const serials = Array.isArray(item.serialNumbers)
          ? item.serialNumbers
              .map(value => String(value || '').trim().toUpperCase())
              .filter(Boolean)
          : [];

        if (serials.length !== item.quantity) {
          return next(
            new Error(
              `serialNumbers count must equal quantity for SERIAL item ${
                item.sku || ''
              }`
            )
          );
        }

        if (new Set(serials).size !== serials.length) {
          return next(
            new Error(`serialNumbers must be unique for SERIAL item ${item.sku || ''}`)
          );
        }

        item.serialNumbers = serials;
      }
    }

    this.totalQuantity = this.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    this.totalCost = this.items.reduce(
      (sum, item) => sum + item.totalCost,
      0
    );
  }

  // Backward compatibility
  if (this.totalCost != null && this.totalAmount == null) {
    this.totalAmount = this.totalCost;
  }

  if (this.totalAmount != null && this.totalCost == null) {
    this.totalCost = this.totalAmount;
  }

  next();
});

/**
 * 🔍 Fast supplier + status queries
 */
purchaseOrderSchema.index({ supplier: 1, status: 1 });
purchaseOrderSchema.index({ organization: 1, status: 1 });

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
