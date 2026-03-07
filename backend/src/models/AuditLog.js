import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true
    },
    /* 👤 Who performed the action */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },

    /* 🔑 What happened */
    action: {
      type: String,
      required: true,
      index: true,
      trim: true
    },

    /* 🧱 What was affected */
    entity: {
      type: String,
      required: true,
      index: true
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },

    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
      index: true
    },

    /* 🔄 State tracking (optional but critical) */
    before: {
      type: Object,
      default: null
    },

    after: {
      type: Object,
      default: null
    },

    /* 🌐 Request context */
    method: {
      type: String,
      maxlength: 10
    },

    path: {
      type: String,
      maxlength: 2048
    },

    ip: {
      type: String,
      maxlength: 45 // IPv6 safe
    },

    userAgent: {
      type: String,
      maxlength: 512
    },

    /* ⚙️ Origin */
    source: {
      type: String,
      enum: ['api', 'cron', 'system'],
      default: 'api',
      index: true
    },

    /* ✅ Outcome */
    success: {
      type: Boolean,
      default: true,
      index: true
    },

    /* 🧩 Extra data */
    meta: {
      type: Object,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

/* 🚀 Performance & audit-grade indexing */
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ organization: 1, createdAt: -1 });
auditLogSchema.index({ organization: 1, warehouse: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
