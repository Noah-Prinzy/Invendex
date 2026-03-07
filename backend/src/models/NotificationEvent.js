import mongoose from 'mongoose';

const notificationReadSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const notificationEventSchema = new mongoose.Schema(
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
      default: null,
      index: true
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info'
    },
    entityType: {
      type: String,
      trim: true,
      default: null
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    actorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    readBy: {
      type: [notificationReadSchema],
      default: []
    }
  },
  { timestamps: true }
);

notificationEventSchema.index({ organization: 1, createdAt: -1 });
notificationEventSchema.index({ organization: 1, warehouse: 1, createdAt: -1 });
notificationEventSchema.index({ organization: 1, type: 1, createdAt: -1 });
notificationEventSchema.index({
  organization: 1,
  warehouse: 1,
  type: 1,
  createdAt: -1
});
notificationEventSchema.index({ organization: 1, 'readBy.user': 1 });

export default mongoose.model('NotificationEvent', notificationEventSchema);
