import mongoose from 'mongoose';

const productSkuSequenceSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    prefix: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 24
    },
    nextValue: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    }
  },
  { timestamps: true }
);

productSkuSequenceSchema.index(
  { organization: 1, prefix: 1 },
  { unique: true }
);

export default mongoose.model('ProductSkuSequence', productSkuSequenceSchema);
