import mongoose, { Schema, type Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  slug: string | null;
  isActive: boolean;
  owner: mongoose.Types.ObjectId | null;
  currency: string;
  locale: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true
    },
    isActive: { type: Boolean, default: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    currency: { type: String, default: 'UGX', trim: true, uppercase: true },
    locale: { type: String, default: 'en', trim: true },
    timezone: { type: String, default: 'Africa/Kampala', trim: true }
  },
  { timestamps: true }
);

OrganizationSchema.index({ owner: 1 });
