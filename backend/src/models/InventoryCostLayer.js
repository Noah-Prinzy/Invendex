import mongoose from 'mongoose';

export const COST_LAYER_SOURCE_TYPES = Object.freeze([
  'PURCHASE_ORDER',
  'OPENING_BALANCE',
  'ADJUSTMENT'
]);

const inventoryCostLayerSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
      index: true
    },
    sourceType: {
      type: String,
      enum: COST_LAYER_SOURCE_TYPES,
      required: true,
      default: 'PURCHASE_ORDER'
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    quantityReceived: {
      type: Number,
      required: true,
      min: 0
    },
    quantityRemaining: {
      type: Number,
      required: true,
      min: 0
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

inventoryCostLayerSchema.index({
  organization: 1,
  product: 1,
  warehouse: 1,
  receivedAt: 1
});

inventoryCostLayerSchema.index({
  organization: 1,
  product: 1,
  warehouse: 1,
  quantityRemaining: 1
});

export default mongoose.model('InventoryCostLayer', inventoryCostLayerSchema);
