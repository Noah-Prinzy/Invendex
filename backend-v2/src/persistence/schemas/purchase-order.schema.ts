import { Schema, type Document, type Types } from 'mongoose';

export type PurchaseOrderStatus =
  'DRAFT' | 'SENT' | 'RECEIVED' | 'CLOSED' | 'CANCELLED';

export type PurchaseOrderSource = 'REORDER_ENGINE' | 'MANUAL';
export type TrackingType = 'NONE' | 'BATCH' | 'SERIAL';

export interface IPurchaseOrderItem {
  product: Types.ObjectId;
  sku: string;
  quantity: number;
  purchaseUom: string | null;
  purchaseToBaseFactor: number | null;
  unitCost: number;
  totalCost: number;
  trackingType: TrackingType;
  lotNumber: string | null;
  expiryDate: Date | null;
  serialNumbers: string[];
  reorderAlert: Types.ObjectId | null;
}

export interface IPurchaseOrder extends Document {
  organization: Types.ObjectId;
  poNumber: string;
  supplier: Types.ObjectId;
  warehouse: Types.ObjectId;
  status: PurchaseOrderStatus;
  source: PurchaseOrderSource;
  reorderAlerts: Types.ObjectId[];
  items: IPurchaseOrderItem[];
  totalQuantity: number;
  totalCost: number;
  totalAmount: number;
  expectedDeliveryDate: Date | null;
  notes: string | null;
  createdBy: Types.ObjectId;
  sentAt: Date | null;
  receivedAt: Date | null;
  closedAt: Date | null;
  sentBy: Types.ObjectId | null;
  receivedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    purchaseUom: { type: String, trim: true, lowercase: true, default: null },
    purchaseToBaseFactor: { type: Number, min: 1, default: null },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    trackingType: {
      type: String,
      enum: ['NONE', 'BATCH', 'SERIAL'],
      default: 'NONE'
    },
    lotNumber: { type: String, trim: true, uppercase: true, default: null },
    expiryDate: { type: Date, default: null },
    serialNumbers: { type: [String], default: [] },
    reorderAlert: {
      type: Schema.Types.ObjectId,
      ref: 'ReorderAlert',
      default: null
    }
  },
  { _id: false }
);

export const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    poNumber: { type: String, unique: true, index: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'RECEIVED', 'CLOSED', 'CANCELLED'],
      default: 'DRAFT',
      index: true
    },
    source: {
      type: String,
      enum: ['REORDER_ENGINE', 'MANUAL'],
      default: 'MANUAL',
      index: true
    },
    reorderAlerts: [{ type: Schema.Types.ObjectId, ref: 'ReorderAlert' }],
    items: { type: [purchaseOrderItemSchema], required: true },
    totalQuantity: { type: Number, min: 1 },
    totalCost: { type: Number, min: 0 },
    totalAmount: { type: Number, min: 0 },
    expectedDeliveryDate: { type: Date, default: null },
    notes: { type: String, trim: true, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sentAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

PurchaseOrderSchema.pre('save', function (this: IPurchaseOrder, next) {
  if (!this.poNumber) {
    this.poNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  if (Array.isArray(this.items)) {
    for (const item of this.items) {
      item.totalCost = item.quantity * item.unitCost;

      const trackingType = String(item.trackingType || 'NONE')
        .trim()
        .toUpperCase() as TrackingType;
      item.trackingType = trackingType;

      if (trackingType === 'BATCH' && !item.lotNumber) {
        return next(
          new Error(`lotNumber is required for BATCH item ${item.sku || ''}`)
        );
      }

      if (trackingType === 'SERIAL') {
        const serials = (
          Array.isArray(item.serialNumbers) ? item.serialNumbers : []
        )
          .map((value) =>
            String(value || '')
              .trim()
              .toUpperCase()
          )
          .filter(Boolean);

        if (serials.length !== item.quantity) {
          return next(
            new Error(
              `serialNumbers count must equal quantity for SERIAL item ${item.sku || ''}`
            )
          );
        }
        if (new Set(serials).size !== serials.length) {
          return next(
            new Error(
              `serialNumbers must be unique for SERIAL item ${item.sku || ''}`
            )
          );
        }
        item.serialNumbers = serials;
      }
    }

    this.totalQuantity = this.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    this.totalCost = this.items.reduce((sum, item) => sum + item.totalCost, 0);
  }

  if (this.totalCost != null && this.totalAmount == null) {
    this.totalAmount = this.totalCost;
  }
  if (this.totalAmount != null && this.totalCost == null) {
    this.totalCost = this.totalAmount;
  }

  next();
});

PurchaseOrderSchema.index({ supplier: 1, status: 1 });
PurchaseOrderSchema.index({ organization: 1, status: 1 });
PurchaseOrderSchema.index({ organization: 1, createdAt: -1 });
