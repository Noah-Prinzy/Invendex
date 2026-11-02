import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { type FilterQuery, type Model } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import { paginate, type PaginatedResult } from '../../common/dto/pagination.dto';
import type { IPurchaseOrder } from '../../persistence/schemas/purchase-order.schema';
import type { IProduct } from '../../persistence/schemas/product.schema';
import type { ISupplier } from '../../persistence/schemas/supplier.schema';
import type { IWarehouse } from '../../persistence/schemas/warehouse.schema';
import { InventoryService } from '../inventory/inventory.service';
import type {
  CreatePurchaseOrderDto,
  PurchaseOrderListQuery
} from './dto/purchase-order.dto';

const toObjectId = (value: string): mongoose.Types.ObjectId =>
  new mongoose.Types.ObjectId(value);

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectModel('PurchaseOrder')
    private readonly purchaseOrderModel: Model<IPurchaseOrder>,
    @InjectModel('Product') private readonly productModel: Model<IProduct>,
    @InjectModel('Supplier') private readonly supplierModel: Model<ISupplier>,
    @InjectModel('Warehouse') private readonly warehouseModel: Model<IWarehouse>,
    private readonly inventory: InventoryService
  ) {}

  async create(
    dto: CreatePurchaseOrderDto,
    organizationId: string,
    createdBy: string
  ): Promise<IPurchaseOrder> {
    const supplier = await this.supplierModel.findOne({
      _id: dto.supplier,
      organization: organizationId
    });
    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }
    const warehouse = await this.warehouseModel.findOne({
      _id: dto.warehouse,
      organization: organizationId
    });
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }

    const items = [];
    for (const item of dto.items) {
      const product = await this.productModel
        .findOne({ _id: item.product, organization: organizationId })
        .select('sku');
      if (!product) {
        throw new AppError(`Product not found (${item.product})`, 404);
      }
      items.push({
        product: toObjectId(item.product),
        sku: product.sku,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.quantity * item.unitCost,
        purchaseUom: item.purchaseUom ?? null,
        purchaseToBaseFactor: item.purchaseToBaseFactor ?? null,
        trackingType: item.trackingType ?? 'NONE',
        lotNumber: item.lotNumber ?? null,
        expiryDate: item.expiryDate ?? null,
        serialNumbers: item.serialNumbers ?? [],
        reorderAlert: item.reorderAlert ? toObjectId(item.reorderAlert) : null
      });
    }

    return this.purchaseOrderModel.create({
      organization: toObjectId(organizationId),
      supplier: toObjectId(dto.supplier),
      warehouse: toObjectId(dto.warehouse),
      items,
      expectedDeliveryDate: dto.expectedDeliveryDate ?? null,
      notes: dto.notes ?? null,
      createdBy: toObjectId(createdBy),
      status: 'DRAFT',
      source: 'MANUAL'
    });
  }

  async list(
    query: PurchaseOrderListQuery,
    organizationId: string
  ): Promise<PaginatedResult<IPurchaseOrder>> {
    const filter: FilterQuery<IPurchaseOrder> = { organization: organizationId };
    if (query.status) filter.status = query.status;
    if (query.q) {
      filter.$or = [
        { poNumber: { $regex: query.q, $options: 'i' } },
        { notes: { $regex: query.q, $options: 'i' } }
      ];
    }
    return paginate<IPurchaseOrder>(this.purchaseOrderModel, filter, query);
  }

  async getById(id: string, organizationId: string): Promise<IPurchaseOrder> {
    const po = await this.purchaseOrderModel
      .findOne({ _id: id, organization: organizationId })
      .lean();
    if (!po) {
      throw new AppError('Purchase order not found', 404);
    }
    return po as unknown as IPurchaseOrder;
  }

  /** Marks the PO RECEIVED and applies it to inventory (idempotent). */
  async receive(
    id: string,
    organizationId: string,
    userId: string
  ): Promise<{ purchaseOrder: IPurchaseOrder; inventoryEvents: Array<Record<string, unknown>> }> {
    const po = await this.purchaseOrderModel.findOne({
      _id: id,
      organization: organizationId
    });
    if (!po) {
      throw new AppError('Purchase order not found', 404);
    }
    if (po.status === 'RECEIVED') {
      return { purchaseOrder: po, inventoryEvents: [] }; // idempotent re-receive
    }
    if (po.status === 'CANCELLED' || po.status === 'CLOSED') {
      throw new AppError(`Cannot receive a ${po.status.toLowerCase()} purchase order`, 400);
    }

    const { inventoryEvents } = await this.inventory.applyPurchaseOrderToInventory({
      purchaseOrder: po,
      actorUserId: userId
    });

    po.status = 'RECEIVED';
    po.receivedAt = new Date();
    po.receivedBy = toObjectId(userId);
    await po.save();

    return { purchaseOrder: po, inventoryEvents };
  }
}
