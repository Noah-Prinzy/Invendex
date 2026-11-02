import { Schema, type Document, type Types } from 'mongoose';

export interface IReorderAlert extends Document {
  organization: Types.ObjectId;
  product: Types.ObjectId;
  sku: string;
  stock: number;
  reorderLevel: number;
  reorderQuantity: number;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  triggeredAt: Date;
  resolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ReorderAlertSchema = new Schema<IReorderAlert>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    sku: { type: String, required: true },
    stock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    reorderQuantity: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true
    },
    triggeredAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

ReorderAlertSchema.index({ organization: 1, product: 1, resolved: 1 });
