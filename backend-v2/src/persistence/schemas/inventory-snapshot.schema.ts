import { Schema, type Document, type Types } from 'mongoose';

const DEFAULT_SNAPSHOT_TTL_DAYS = 365;
const snapshotTtlSeconds =
  Number(process.env.INVENTORY_SNAPSHOT_TTL_DAYS ?? DEFAULT_SNAPSHOT_TTL_DAYS) *
  24 *
  60 *
  60;

export type SnapshotSource = 'SYSTEM' | 'ADMIN' | 'STAFF' | 'MANUAL' | 'CRON';

export interface IInventorySnapshot extends Document {
  organization: Types.ObjectId;
  product: Types.ObjectId;
  warehouse: Types.ObjectId | null;
  purchaseOrder: Types.ObjectId | null;
  sku: string;
  stock: number;
  price: number;
  recordedAt: Date;
  source: SnapshotSource;
  createdAt: Date;
}

/**
 * Point-in-time stock records. TTL archival keeps the operational collection
 * small; long-term rollups land with the metrics module.
 */
export const InventorySnapshotSchema = new Schema<IInventorySnapshot>(
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
      default: null,
      index: true
    },
    purchaseOrder: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: undefined,
      index: true
    },
    sku: { type: String, required: true },
    stock: { type: Number, required: true },
    price: { type: Number, required: true },
    recordedAt: { type: Date, default: Date.now, index: true },
    source: {
      type: String,
      enum: ['SYSTEM', 'ADMIN', 'STAFF', 'MANUAL', 'CRON'],
      default: 'SYSTEM'
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

InventorySnapshotSchema.index({ sku: 1, recordedAt: 1 });
InventorySnapshotSchema.index({ organization: 1, sku: 1, recordedAt: 1 });
// Idempotency gate for PO receives: one snapshot per (org, PO, product).
InventorySnapshotSchema.index(
  { organization: 1, purchaseOrder: 1, product: 1 },
  {
    unique: true,
    partialFilterExpression: { purchaseOrder: { $exists: true } }
  }
);
InventorySnapshotSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: snapshotTtlSeconds }
);
