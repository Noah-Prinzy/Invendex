import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
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
    email: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String
    }
  },
  { timestamps: true }
);

supplierSchema.index({ organization: 1, name: 1 }, { unique: true });

export default mongoose.model('Supplier', supplierSchema);
