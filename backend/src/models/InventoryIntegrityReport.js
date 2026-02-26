import mongoose from 'mongoose';

const inventoryIntegrityReportSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    checkedAt: {
      type: Date,
      required: true,
      index: true
    },
    inventoryRecordsChecked: {
      type: Number,
      required: true,
      min: 0
    },
    driftCount: {
      type: Number,
      required: true,
      min: 0
    },
    issueCounts: {
      type: Map,
      of: Number,
      default: {}
    },
    autoFixAppliedCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    sampleFindings: {
      type: [
        {
          inventoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Inventory',
            default: null
          },
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            default: null
          },
          warehouseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Warehouse',
            default: null
          },
          issueCodes: {
            type: [String],
            default: []
          }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

inventoryIntegrityReportSchema.index({ organization: 1, checkedAt: -1 });

export default mongoose.model(
  'InventoryIntegrityReport',
  inventoryIntegrityReportSchema
);
