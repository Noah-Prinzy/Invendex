import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },

    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      postalCode: { type: String, trim: true }
    },

    region: {
      type: String,
      trim: true
    },

    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast filtering
warehouseSchema.index({ isActive: 1, isArchived: 1 });
warehouseSchema.index(
  { organization: 1, code: 1 },
  { unique: true }
);

export default mongoose.model('Warehouse', warehouseSchema);
