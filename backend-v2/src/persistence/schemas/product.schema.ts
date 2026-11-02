import { Schema, type Document, type Types } from 'mongoose';

export interface IUom {
  base: string;
  purchase: string;
  purchaseToBaseFactor: number;
}

export interface IProduct extends Document {
  organization: Types.ObjectId;
  name: string;
  sku: string;
  price: number;
  cost: number | null;
  stock: number;
  lowStockThreshold: number;
  supplierLeadTimeDays: number | null;
  uom: IUom;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const ProductSchema = new Schema<IProduct>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 50
    },
    price: { type: Number, required: true, default: 0, min: 0 },
    cost: { type: Number, default: null, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 0, min: 0 },
    supplierLeadTimeDays: { type: Number, default: null, min: 0 },
    uom: {
      base: { type: String, default: 'pcs', trim: true, lowercase: true },
      purchase: { type: String, default: 'pcs', trim: true, lowercase: true },
      purchaseToBaseFactor: { type: Number, default: 1, min: 1 }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

ProductSchema.index({ organization: 1, sku: 1 }, { unique: true });
ProductSchema.index({ organization: 1, isActive: 1 });
