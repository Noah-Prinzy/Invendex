import mongoose from 'mongoose';

const stocktakeLineSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    sku: {
      type: String,
      required: true,
      trim: true
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    expectedQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    countedQuantity: {
      type: Number,
      default: null,
      min: 0
    },
    variance: {
      type: Number,
      default: null
    },
    countedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    countedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const stocktakeAdjustmentSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    sku: {
      type: String,
      required: true,
      trim: true
    },
    expectedQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    currentQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    countedQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    appliedDelta: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const STOCKTAKE_STATUSES = ['OPEN', 'IN_REVIEW', 'APPROVED', 'CANCELLED'];

const stocktakeSessionSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },
    status: {
      type: String,
      enum: STOCKTAKE_STATUSES,
      default: 'OPEN',
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    lines: {
      type: [stocktakeLineSchema],
      default: []
    },
    countedLines: {
      type: Number,
      default: 0,
      min: 0
    },
    totalLines: {
      type: Number,
      default: 0,
      min: 0
    },
    varianceLines: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAbsoluteVariance: {
      type: Number,
      default: 0,
      min: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    appliedAdjustments: {
      type: [stocktakeAdjustmentSchema],
      default: []
    }
  },
  { timestamps: true }
);

stocktakeSessionSchema.pre('save', function computeSummary(next) {
  const lines = Array.isArray(this.lines) ? this.lines : [];
  this.totalLines = lines.length;

  const countedLines = lines.filter((line) =>
    Number.isFinite(Number(line.countedQuantity))
  );
  this.countedLines = countedLines.length;

  const varianceLines = countedLines.filter(
    (line) => Number(line.variance || 0) !== 0
  );
  this.varianceLines = varianceLines.length;
  this.totalAbsoluteVariance = varianceLines.reduce(
    (sum, line) => sum + Math.abs(Number(line.variance || 0)),
    0
  );

  next();
});

stocktakeSessionSchema.index({ organization: 1, warehouse: 1, createdAt: -1 });

export { STOCKTAKE_STATUSES };
export default mongoose.model('StocktakeSession', stocktakeSessionSchema);
