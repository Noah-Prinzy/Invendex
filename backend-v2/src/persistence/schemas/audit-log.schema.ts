import mongoose, { Schema, type Document } from 'mongoose';

const DEFAULT_TTL_DAYS = 180;

const ttlSeconds =
  Number(process.env.AUDIT_LOG_TTL_DAYS ?? DEFAULT_TTL_DAYS) * 24 * 60 * 60;

export interface IAuditLog extends Document {
  organization: mongoose.Types.ObjectId | null;
  user: mongoose.Types.ObjectId | null;
  action: string;
  resource: string;
  resourceId: string | null;
  success: boolean;
  meta: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * Audit trail with TTL archival: documents expire automatically after
 * AUDIT_LOG_TTL_DAYS (rollup jobs for long-term analytics land with the
 * metrics module).
 */
export const AuditLogSchema = new Schema<IAuditLog>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true, trim: true },
    resource: { type: String, required: true, trim: true },
    resourceId: { type: String, default: null, trim: true },
    success: { type: Boolean, default: true },
    meta: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null, trim: true },
    userAgent: { type: String, default: null, trim: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ organization: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: ttlSeconds });
