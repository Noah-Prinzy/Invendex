import mongoose from 'mongoose';

export const STOCK_REASONS = [
  'sale',
  'restock',
  'adjustment',
  'return'
];

const stockHistorySchema = new mongoose.Schema(
  {
    previousStock: {
      type: Number,
      required: true
    },
    newStock: {
      type: Number,
      required: true
    },
    changeAmount: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true,
      enum: STOCK_REASONS
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 50
      // ❌ removed index:true (duplicate)
    },

    price: {
      type: Number,
      required: true,
      min: 0,
      set: v => Math.round(v * 100) / 100
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
      index: true
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    },

    /**
     * 🧾 Historical stock changes (audit-level)
     * NOT used for demand calculation
     */
    stockHistory: {
      type: [stockHistorySchema],
      default: []
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },

    category: {
      type: String,
      trim: true,
      index: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    /**
     * ⚠️ Cached / derived metric
     * Source of truth = InventorySnapshot analytics
     */
    averageDailyUsage: {
      type: Number,
      default: 0
    },

    /**
     * 🏭 Fallback supplier lead time
     * SupplierProduct takes precedence
     */
    supplierLeadTimeDays: {
      type: Number,
      default: 7
    },

    safetyStockDays: {
      type: Number,
      default: 3
    },

    /**
     * 🔮 Forecast Trust Score
     */
    forecastTrustScore: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      }
    }
  }
);

/**
 * 📦 Adjust stock safely
 * NOTE: InventorySnapshot must be created by caller
 */
productSchema.methods.adjustStock = async function (
  amount,
  reason,
  userId = null
) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error('Stock adjustment amount must be a non-zero integer');
  }

  const normalizedReason = String(reason).trim().toLowerCase();

  if (!STOCK_REASONS.includes(normalizedReason)) {
    throw new Error('Invalid stock adjustment reason');
  }

  const newStock = this.stock + amount;

  if (newStock < 0) {
    throw new Error('Insufficient stock');
  }

  this.stockHistory.push({
    previousStock: this.stock,
    newStock,
    changeAmount: amount,
    reason: normalizedReason,
    changedBy: userId,
    changedAt: new Date()
  });

  if (this.stockHistory.length > 100) {
    this.stockHistory.shift();
  }

  this.stock = newStock;
  return this.save();
};

/**
 * ⚠️ Virtual: low stock indicator
 */
productSchema.virtual('isLowStock').get(function () {
  return this.stock <= this.lowStockThreshold;
});

/**
 * 🔍 Indexes
 */
productSchema.index({ organization: 1, sku: 1 }, { unique: true });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });

export default mongoose.model('Product', productSchema);
