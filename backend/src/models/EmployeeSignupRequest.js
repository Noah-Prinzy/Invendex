import mongoose from 'mongoose';

const employeeSignupRequestSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    requestedByIp: {
      type: String,
      default: null,
      trim: true
    },
    requestedByUserAgent: {
      type: String,
      default: null,
      trim: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'DECLINED'],
      default: 'PENDING',
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    declineReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500
    }
  },
  { timestamps: true }
);

employeeSignupRequestSchema.index({
  organization: 1,
  status: 1,
  createdAt: -1
});
employeeSignupRequestSchema.index(
  { organization: 1, email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);
employeeSignupRequestSchema.index(
  { organization: 1, username: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

export default mongoose.model(
  'EmployeeSignupRequest',
  employeeSignupRequestSchema
);
