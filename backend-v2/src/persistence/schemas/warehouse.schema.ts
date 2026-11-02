import { Schema, type Document, type Types } from 'mongoose';

export interface IWarehouse extends Document {
  organization: Types.ObjectId;
  name: string;
  code: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  region: string | null;
  manager: Types.ObjectId | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const WarehouseSchema = new Schema<IWarehouse>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      postalCode: { type: String, trim: true }
    },
    region: { type: String, trim: true, default: null },
    manager: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

WarehouseSchema.index({ isActive: 1, isArchived: 1 });
WarehouseSchema.index({ organization: 1, code: 1 }, { unique: true });
