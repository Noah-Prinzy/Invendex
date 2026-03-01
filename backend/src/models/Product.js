import mongoose from 'mongoose';

export const STOCK_REASONS = [
  'sale',
  'restock',
  'adjustment',
  'return',
  'damaged',
  'expired',
  'stolen',
  'correction',
  'supplier_return'
];

export const STOCK_REASON_POLICIES = Object.freeze({
  sale: Object.freeze({
    direction: 'decrease',
    sensitive: false
  }),
  restock: Object.freeze({
    direction: 'increase',
    sensitive: false
  }),
  adjustment: Object.freeze({
    direction: 'any',
    sensitive: false
  }),
  return: Object.freeze({
    direction: 'increase',
    sensitive: false
  }),
  damaged: Object.freeze({
    direction: 'decrease',
    sensitive: true
  }),
  expired: Object.freeze({
    direction: 'decrease',
    sensitive: true
  }),
  stolen: Object.freeze({
    direction: 'decrease',
    sensitive: true
  }),
  correction: Object.freeze({
    direction: 'any',
    sensitive: true
  }),
  supplier_return: Object.freeze({
    direction: 'decrease',
    sensitive: true
  })
});

export const SENSITIVE_STOCK_REASONS = STOCK_REASONS.filter(
  (reason) => STOCK_REASON_POLICIES[reason]?.sensitive === true
);

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

    barcode: {
      type: String,
      trim: true,
      maxlength: 128,
      default: null
    },

    barcodeType: {
      type: String,
      enum: ['CODE128', 'EAN13', 'UPC', 'QR', 'OTHER', null],
      default: null
    },

    price: {
      type: Number,
      required: true,
      min: 0,
      set: (v) => Math.round(v * 100) / 100
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

    isVariant: {
      type: Boolean,
      default: false,
      index: true
    },

    parentProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
      index: true
    },

    variantAttributes: {
      type: Map,
      of: String,
      default: {}
    },

    uom: {
      base: {
        type: String,
        trim: true,
        lowercase: true,
        default: 'pcs'
      },
      purchase: {
        type: String,
        trim: true,
        lowercase: true,
        default: 'pcs'
      },
      purchaseToBaseFactor: {
        type: Number,
        min: 1,
        default: 1
      }
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    deleteStatus: {
      type: String,
      enum: ['active', 'pending_admin_review'],
      default: 'active',
      index: true
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    deletedByRole: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'staff', null],
      default: null
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
      flattenMaps: true,
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
 * NOTE:
 * Product.stock is now a derived compatibility cache from warehouse Inventory.
 * Direct mutation is intentionally blocked.
 */
productSchema.methods.adjustStock = async function (
  amount,
  reason,
  userId = null
) {
  void amount;
  void reason;
  void userId;
  throw new Error(
    'Direct Product.adjustStock is disabled. Use warehouse inventory adjustment service with warehouseId.'
  );
};

productSchema.pre('validate', function validateVariantAndUom(next) {
  if (this.isVariant && !this.parentProduct) {
    this.invalidate('parentProduct', 'parentProduct is required for variants');
  }

  if (!this.isVariant) {
    this.parentProduct = null;
  }

  if (!this.uom || typeof this.uom !== 'object') {
    this.uom = {
      base: 'pcs',
      purchase: 'pcs',
      purchaseToBaseFactor: 1
    };
  }

  const base = String(this.uom.base || '')
    .trim()
    .toLowerCase();
  const purchase = String(this.uom.purchase || '')
    .trim()
    .toLowerCase();
  const factor = Number(this.uom.purchaseToBaseFactor || 1);

  this.uom.base = base || 'pcs';
  this.uom.purchase = purchase || this.uom.base;
  this.uom.purchaseToBaseFactor =
    Number.isInteger(factor) && factor >= 1 ? factor : 1;

  next();
});

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
productSchema.index(
  { organization: 1, barcode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      barcode: { $type: 'string', $gt: '' }
    }
  }
);
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ organization: 1, isActive: 1, deleteStatus: 1 });
productSchema.index({ organization: 1, parentProduct: 1, isVariant: 1 });
productSchema.index({ createdAt: -1 });

export default mongoose.model('Product', productSchema);
