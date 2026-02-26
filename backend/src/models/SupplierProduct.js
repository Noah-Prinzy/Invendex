import mongoose from 'mongoose';

const supplierProductSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },

    /**
     * 🔁 Denormalized for fast access
     * Must match Product.sku
     */
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },

    unitCost: {
      type: Number,
      required: true,
      min: 0
    },

    /**
     * ⏱️ Supplier lead time
     * Optional — Product fallback applies
     */
    leadTimeDays: {
      type: Number,
      default: null,
      min: 0
    },

    /**
     * 📦 Minimum order quantity (MOQ)
     * Enforced by reorder engine
     */
    minimumOrderQuantity: {
      type: Number,
      default: 1,
      min: 1
    },

    /**
     * ⭐ Preferred supplier for this product
     */
    isPreferred: {
      type: Boolean,
      default: false
    },

    /**
     * 🔄 Soft disable supplier links
     */
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

/**
 * ❗ Prevent duplicate supplier-product links
 */
supplierProductSchema.index(
  { organization: 1, supplier: 1, product: 1 },
  { unique: true }
);

/**
 * ⚡ Fast active supplier resolution
 */
supplierProductSchema.index({
  product: 1,
  isActive: 1
});

export default mongoose.model('SupplierProduct', supplierProductSchema);
