import mongoose from 'mongoose';

const STOCK_REASONS = ['sale', 'restock', 'adjustment', 'return'];

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
    change: {
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
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
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
      min: 0
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    },

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
      trim: true
    },

    isActive: {
      type: Boolean,
      default: true
    },
    averageDailyUsage: {
      type: Number,
      default: 0
    },

    supplierLeadTimeDays: {
      type: Number,
      default: 7
    },

    safetyStockDays: {
      type: Number,
      default: 3
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
 */
productSchema.methods.adjustStock = async function (
  amount,
  reason,
  userId = null
) {
  if (!STOCK_REASONS.includes(reason)) {
    throw new Error('Invalid stock adjustment reason');
  }

  const newStock = this.stock + amount;

  if (newStock < 0) {
    throw new Error('Insufficient stock');
  }

  this.stockHistory.push({
    previousStock: this.stock,
    newStock,
    change: amount,
    reason,
    changedBy: userId
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
 * 🔍 Indexes (single source of truth)
 */
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ createdAt: -1 });

export default mongoose.model('Product', productSchema);
