import mongoose from 'mongoose';
import { VALUATION_METHODS } from './InventoryValuationConfig.js';

const consumedLayerSchema = new mongoose.Schema(
  {
    layerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryCostLayer',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    lineCost: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const cogsEntrySchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
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
    quantitySold: {
      type: Number,
      required: true,
      min: 0
    },
    valuationMethod: {
      type: String,
      enum: VALUATION_METHODS,
      required: true
    },
    totalCogs: {
      type: Number,
      required: true,
      min: 0
    },
    unitCogs: {
      type: Number,
      required: true,
      min: 0
    },
    consumedLayers: {
      type: [consumedLayerSchema],
      default: []
    },
    orderLineIndex: {
      type: Number,
      required: true,
      min: 0
    },
    recordedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

cogsEntrySchema.index(
  { organization: 1, orderId: 1, product: 1, orderLineIndex: 1 },
  { unique: true }
);

cogsEntrySchema.index({ organization: 1, recordedAt: -1 });

export default mongoose.model('CogsEntry', cogsEntrySchema);
