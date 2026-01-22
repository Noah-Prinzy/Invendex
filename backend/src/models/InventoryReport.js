import mongoose from 'mongoose';

const inventoryReportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['daily', 'range', 'low-stock', 'drops'],
      required: true
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    filters: {
      type: Object,
      default: {}
    },

    recordCount: {
      type: Number,
      required: true
    },

    format: {
      type: String,
      enum: ['csv', 'xlsx'],
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('InventoryReport', inventoryReportSchema);
