import mongoose from 'mongoose';

const supplierProductSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true
    },
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
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    leadTimeDays: {
      type: Number,
      required: true,
      min: 0
    },
    isPreferred: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

/**
 * ❗ Prevent duplicate supplier-product links
 */
supplierProductSchema.index(
  { supplier: 1, product: 1 },
  { unique: true }
);

export default mongoose.model(
  'SupplierProduct',
  supplierProductSchema
);