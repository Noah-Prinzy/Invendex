import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
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
    quantityOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    quantityReserved: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    reorderPoint: {
      type: Number,
      default: 0,
      min: 0
    },
    reorderQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    lastMovementAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

inventorySchema.pre('validate', function validateReservedVsOnHand(next) {
  if (Number(this.quantityReserved || 0) > Number(this.quantityOnHand || 0)) {
    this.invalidate(
      'quantityReserved',
      'quantityReserved cannot exceed quantityOnHand'
    );
  }
  next();
});

inventorySchema.index(
  { organization: 1, product: 1, warehouse: 1 },
  { unique: true }
);

inventorySchema.virtual('quantityAvailable').get(function () {
  return this.quantityOnHand - this.quantityReserved;
});

inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

export default mongoose.model('Inventory', inventorySchema);
