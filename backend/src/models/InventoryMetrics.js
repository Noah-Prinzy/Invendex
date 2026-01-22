import mongoose from 'mongoose';

const inventoryMetricsSchema = new mongoose.Schema(
  {
    /**
     * 📅 Metrics date (normalized to day)
     * One record per day
     */
    date: {
      type: Date,
      required: true
    },

    /**
     * 📦 Total stock across all active products
     */
    totalStock: {
      type: Number,
      required: true,
      min: 0
    },

    /**
     * 💰 Total inventory value (stock × price)
     */
    totalInventoryValue: {
      type: Number,
      required: true,
      min: 0
    },

    /**
     * 🧮 Number of active SKUs
     */
    skuCount: {
      type: Number,
      required: true,
      min: 0
    },

    /**
     * 📊 Average inventory value per SKU
     */
    avgValuePerSku: {
      type: Number,
      required: true,
      min: 0
    },

    /**
     * 👤 Source of generation (cron / admin / system)
     */
    generatedBy: {
      type: String,
      default: 'cron'
    }
  },
  {
    timestamps: true
  }
);

/**
 * 🔍 Indexes
 * One metrics record per day
 */
inventoryMetricsSchema.index({ date: 1 }, { unique: true });

export default mongoose.model(
  'InventoryMetrics',
  inventoryMetricsSchema
);