import { Schema, type Document, type Types } from 'mongoose';

export interface ISupplier extends Document {
  organization: Types.ObjectId;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const SupplierSchema = new Schema<ISupplier>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: null }
  },
  { timestamps: true }
);

SupplierSchema.index({ organization: 1, name: 1 }, { unique: true });
