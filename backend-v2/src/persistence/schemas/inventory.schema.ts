import { Schema, type Document, type Types } from 'mongoose';

export interface IInventory extends Document {
  organization: Types.ObjectId;
  product: Types.ObjectId;
  warehouse: Types.ObjectId;
  quantityOnHand: number;
  quantityReserved: number;
  reorderPoint: number;
  reorderQuantity: number;
  lastMovementAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  quantityAvailable: number;
}

export const InventorySchema = new Schema<IInventory>(
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
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
      index: true
    },
    quantityOnHand: { type: Number, required: true, default: 0, min: 0 },
    quantityReserved: { type: Number, required: true, default: 0, min: 0 },
    reorderPoint: { type: Number, default: 0, min: 0 },
    reorderQuantity: { type: Number, default: 0, min: 0 },
    lastMovementAt: { type: Date, default: null }
  },
  { timestamps: true }
);

InventorySchema.pre('validate', function (this: IInventory, next) {
  if (Number(this.quantityReserved || 0) > Number(this.quantityOnHand || 0)) {
    this.invalidate(
      'quantityReserved',
      'quantityReserved cannot exceed quantityOnHand'
    );
  }
  next();
});

InventorySchema.index(
  { organization: 1, product: 1, warehouse: 1 },
  { unique: true }
);
InventorySchema.index({ organization: 1, warehouse: 1, product: 1 });

InventorySchema.virtual('quantityAvailable').get(function (this: IInventory) {
  return this.quantityOnHand - this.quantityReserved;
});

InventorySchema.set('toJSON', { virtuals: true });
InventorySchema.set('toObject', { virtuals: true });
