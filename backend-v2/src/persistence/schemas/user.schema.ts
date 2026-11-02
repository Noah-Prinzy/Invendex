import bcrypt from 'bcryptjs';
import mongoose, { Schema, type Document } from 'mongoose';

export const USER_ROLES = ['owner', 'admin', 'manager', 'staff'] as const;

export interface IUser extends Document {
  email: string;
  mobileNumber: string | null;
  username: string | null;
  password: string;
  role: (typeof USER_ROLES)[number];
  organization: mongoose.Types.ObjectId | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    mobileNumber: { type: String, default: null, trim: true },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      default: undefined
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'staff' },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

UserSchema.index({ organization: 1, isActive: 1 });

UserSchema.pre('save', async function (this: IUser) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

UserSchema.methods.comparePassword = function (
  this: IUser,
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};
