import mongoose from 'mongoose';

const offlineSyncMutationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    deviceId: {
      type: String,
      required: true,
      trim: true
    },
    mutationId: {
      type: String,
      required: true,
      trim: true
    },
    mutationType: {
      type: String,
      required: true,
      trim: true
    },
    payload: {
      type: Object,
      default: {}
    },
    status: {
      type: String,
      enum: ['APPLIED', 'FAILED', 'IGNORED'],
      default: 'APPLIED'
    },
    result: {
      type: Object,
      default: null
    },
    errorMessage: {
      type: String,
      trim: true,
      default: null
    },
    appliedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

offlineSyncMutationSchema.index(
  { organization: 1, deviceId: 1, mutationId: 1 },
  { unique: true }
);
offlineSyncMutationSchema.index({ organization: 1, appliedAt: -1 });

export default mongoose.model('OfflineSyncMutation', offlineSyncMutationSchema);
