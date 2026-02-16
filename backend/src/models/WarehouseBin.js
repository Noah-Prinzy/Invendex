import mongoose from 'mongoose';

const warehouseBinSchema = new mongoose.Schema(
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
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    zone: {
      type: String,
      trim: true,
      default: null
    },
    aisle: {
      type: String,
      trim: true,
      default: null
    },
    rack: {
      type: String,
      trim: true,
      default: null
    },
    shelf: {
      type: String,
      trim: true,
      default: null
    },
    binType: {
      type: String,
      enum: ['STORAGE', 'PICK_FACE', 'STAGING', 'QUARANTINE'],
      default: 'STORAGE'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

warehouseBinSchema.index(
  { organization: 1, warehouse: 1, code: 1 },
  { unique: true }
);

export default mongoose.model('WarehouseBin', warehouseBinSchema);
