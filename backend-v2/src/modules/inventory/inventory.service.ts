import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { type Model } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import { DOMAIN_EVENT_BUS, type DomainEventBus } from '../../events/domain-event.bus';
import type { IInventory } from '../../persistence/schemas/inventory.schema';
import type { IInventorySnapshot } from '../../persistence/schemas/inventory-snapshot.schema';
import type { IProduct } from '../../persistence/schemas/product.schema';
import type { IPurchaseOrder } from '../../persistence/schemas/purchase-order.schema';
import type { IReorderAlert } from '../../persistence/schemas/reorder-alert.schema';
import {
  convertQuantityToBaseUnits,
  resolvePurchaseToBaseFactor
} from './uom';

export const STOCK_REASONS = [
  'sale',
  'restock',
  'adjustment',
  'return',
  'damaged',
  'expired',
  'stolen',
  'correction',
  'supplier_return'
] as const;

export type StockReason = (typeof STOCK_REASONS)[number];

const toObjectId = (value: unknown): mongoose.Types.ObjectId =>
  new mongoose.Types.ObjectId(String(value));

/**
 * Ported from legacy `services/inventory/inventoryService.js` (core receive
 * path) and `stockSyncService.js`. Cost layers / realtime fan-out land with
 * the finance/realtime phases; domain events replace them here.
 */
@Injectable()
export class InventoryService {
  constructor(
    @InjectModel('Inventory') private readonly inventoryModel: Model<IInventory>,
    @InjectModel('InventorySnapshot')
    private readonly snapshotModel: Model<IInventorySnapshot>,
    @InjectModel('Product') private readonly productModel: Model<IProduct>,
    @InjectModel('ReorderAlert')
    private readonly reorderAlertModel: Model<IReorderAlert>,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus
  ) {}

  /**
   * Applies a received purchase order to inventory. Idempotent per
   * (organization, purchaseOrder, product) via the snapshot unique partial
   * index — a duplicate apply skips the item instead of double-counting.
   */
  async applyPurchaseOrderToInventory({
    purchaseOrder,
    actorUserId = null
  }: {
    purchaseOrder: IPurchaseOrder | null;
    actorUserId?: string | null;
  }): Promise<{ inventoryEvents: Array<Record<string, unknown>> }> {
    if (
      !purchaseOrder ||
      !purchaseOrder.items?.length ||
      !purchaseOrder.warehouse ||
      !purchaseOrder.organization
    ) {
      throw new AppError(
        'Invalid purchase order supplied to inventory service',
        400
      );
    }

    const inventoryEvents: Array<Record<string, unknown>> = [];

    for (const item of purchaseOrder.items) {
      const {
        product: productId,
        quantity,
        reorderAlert,
        trackingType = 'NONE',
        lotNumber = null,
        expiryDate = null,
        serialNumbers = []
      } = item;
      let snapshotRecord: IInventorySnapshot | null = null;

      try {
        const product = await this.productModel
          .findOne({ _id: productId, organization: purchaseOrder.organization })
          .select('sku price stock uom');
        if (!product) {
          throw new AppError(
            `Product not found for inventory update (${String(productId)})`,
            404
          );
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new AppError(
            `Invalid item quantity for inventory update (${String(productId)})`,
            400
          );
        }

        const purchaseToBaseFactor = resolvePurchaseToBaseFactor({
          product,
          overrideFactor: item.purchaseToBaseFactor
        });
        const quantityInBaseUnits = convertQuantityToBaseUnits({
          quantity,
          quantityUnit: 'purchase',
          purchaseToBaseFactor
        });
        if (!Number.isFinite(quantityInBaseUnits) || quantityInBaseUnits <= 0) {
          throw new AppError(
            `Invalid converted quantity for inventory update (${String(productId)})`,
            400
          );
        }

        const now = new Date();

        try {
          snapshotRecord = await this.snapshotModel.create({
            organization: purchaseOrder.organization,
            product: productId,
            warehouse: purchaseOrder.warehouse,
            purchaseOrder: purchaseOrder._id,
            sku: product.sku,
            stock: Number(product.stock || 0),
            price: product.price,
            recordedAt: now,
            source: 'SYSTEM'
          });
        } catch (err) {
          if ((err as { code?: number })?.code === 11000) {
            continue; // already applied — idempotency gate
          }
          throw err;
        }

        const inventory = await this.inventoryModel.findOneAndUpdate(
          {
            organization: purchaseOrder.organization,
            product: productId,
            warehouse: purchaseOrder.warehouse
          },
          {
            $inc: { quantityOnHand: quantityInBaseUnits },
            $set: { lastMovementAt: now },
            $setOnInsert: {
              quantityReserved: 0,
              reorderPoint: 0,
              reorderQuantity: 0
            }
          },
          { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );

        const syncedProduct = await this.syncProductStock({
          organizationId: purchaseOrder.organization,
          productId
        });
        const newStock = Number(syncedProduct?.stock || 0);

        await this.snapshotModel.findOneAndUpdate(
          {
            _id: snapshotRecord._id,
            organization: purchaseOrder.organization
          },
          { $set: { stock: newStock, recordedAt: now, source: 'SYSTEM' } }
        );

        if (reorderAlert) {
          await this.reorderAlertModel.findOneAndUpdate(
            { _id: reorderAlert, organization: purchaseOrder.organization },
            { resolved: true, resolvedAt: new Date(), resolvedBy: actorUserId ? toObjectId(actorUserId) : null }
          );
        }

        inventoryEvents.push({
          organizationId: String(purchaseOrder.organization),
          actorUserId,
          warehouseId: String(purchaseOrder.warehouse),
          productId: String(productId),
          source: 'purchase_order_receive',
          purchaseOrderId: String(purchaseOrder._id),
          quantityDelta: quantityInBaseUnits,
          purchaseQuantity: Number(quantity),
          purchaseToBaseFactor,
          trackingType,
          lotNumber,
          expiryDate,
          serialNumbers,
          quantityOnHand: inventory?.quantityOnHand ?? null
        });
      } catch (err) {
        if (snapshotRecord?._id) {
          await this.snapshotModel.deleteOne({
            _id: snapshotRecord._id,
            organization: purchaseOrder.organization
          });
        }
        throw err;
      }
    }

    for (const event of inventoryEvents) {
      await this.events.publish('inventory.updated', event, {
        organizationId: String(purchaseOrder.organization)
      });
    }

    return { inventoryEvents };
  }

  /** Sums quantityOnHand across warehouses into Product.stock. */
  async syncProductStock({
    organizationId,
    productId
  }: {
    organizationId: unknown;
    productId: unknown;
  }): Promise<IProduct | null> {
    const rows = await this.inventoryModel.aggregate<{
      _id: unknown;
      stock: number;
    }>([
      {
        $match: {
          organization: toObjectId(organizationId),
          product: toObjectId(productId)
        }
      },
      { $group: { _id: '$product', stock: { $sum: '$quantityOnHand' } } }
    ]);
    const derivedStock = Math.max(Number(rows[0]?.stock || 0), 0);
    return this.productModel.findOneAndUpdate(
      { _id: productId, organization: organizationId },
      { $set: { stock: derivedStock } },
      { new: true, runValidators: true }
    );
  }

  /** Manual stock adjustment (ported from legacy manualAdjustment flow). */
  async adjustStock({
    organizationId,
    productId,
    warehouseId,
    delta,
    reason,
    actorUserId
  }: {
    organizationId: string;
    productId: string;
    warehouseId: string;
    delta: number;
    reason: StockReason;
    actorUserId: string | null;
  }): Promise<IInventory> {
    if (!Number.isFinite(delta) || delta === 0) {
      throw new AppError('Adjustment delta must be a non-zero number', 400);
    }

    const filter = {
      organization: toObjectId(organizationId),
      product: toObjectId(productId),
      warehouse: toObjectId(warehouseId)
    };

    const existing = await this.inventoryModel.findOne(filter);
    const current = Number(existing?.quantityOnHand || 0);
    const nextQuantity = current + delta;
    if (nextQuantity < 0) {
      throw new AppError('Adjustment would drive quantityOnHand below zero', 400);
    }

    const now = new Date();
    const inventory = await this.inventoryModel.findOneAndUpdate(
      filter,
      {
        $set: { quantityOnHand: nextQuantity, lastMovementAt: now },
        $setOnInsert: { quantityReserved: 0, reorderPoint: 0, reorderQuantity: 0 }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const product = await this.productModel.findOne({
      _id: productId,
      organization: organizationId
    });
    if (product) {
      await this.snapshotModel.create({
        organization: toObjectId(organizationId),
        product: toObjectId(productId),
        warehouse: toObjectId(warehouseId),
        sku: product.sku,
        stock: nextQuantity,
        price: product.price,
        recordedAt: now,
        source: 'MANUAL'
      });
    }

    await this.syncProductStock({ organizationId, productId });
    await this.events.publish(
      'inventory.updated',
      {
        organizationId,
        actorUserId,
        warehouseId,
        productId,
        source: 'manual_adjustment',
        reason,
        quantityDelta: delta,
        quantityOnHand: nextQuantity
      },
      { organizationId }
    );

    return inventory as IInventory;
  }
}
