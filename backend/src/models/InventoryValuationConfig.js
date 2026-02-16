import mongoose from 'mongoose';

export const VALUATION_METHODS = Object.freeze([
  'FIFO',
  'LIFO',
  'WEIGHTED_AVG'
]);

const inventoryValuationConfigSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    defaultMethod: {
      type: String,
      enum: VALUATION_METHODS,
      default: 'WEIGHTED_AVG',
      required: true
    },
    allowMethodOverride: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

inventoryValuationConfigSchema.index({ organization: 1 }, { unique: true });

export default mongoose.model(
  'InventoryValuationConfig',
  inventoryValuationConfigSchema
);
