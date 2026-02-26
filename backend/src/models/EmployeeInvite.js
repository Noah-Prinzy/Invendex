import mongoose from 'mongoose';

const employeeInviteSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true
    },
    codeHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      select: false
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'USED', 'REVOKED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    usedAt: {
      type: Date,
      default: null
    },
    revokedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

employeeInviteSchema.index({ organization: 1, status: 1, expiresAt: 1 });
employeeInviteSchema.index({ organization: 1, email: 1, status: 1 });

export default mongoose.model('EmployeeInvite', employeeInviteSchema);
