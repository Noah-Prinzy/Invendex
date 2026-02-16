import mongoose from 'mongoose';

const binInventorySchema = new mongoose.Schema(
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
    bin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseBin',
      required: true,
      index: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
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
    }
  },
  { timestamps: true }
);

binInventorySchema.index(
  { organization: 1, warehouse: 1, bin: 1, product: 1 },
  { unique: true }
);

binInventorySchema.virtual('quantityAvailable').get(function getAvailable() {
  return this.quantityOnHand - this.quantityReserved;
});

binInventorySchema.set('toJSON', { virtuals: true });
binInventorySchema.set('toObject', { virtuals: true });

export default mongoose.model('BinInventory', binInventorySchema);
