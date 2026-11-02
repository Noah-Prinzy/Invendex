import { Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import { ZodQuery } from '../../common/decorators/zod-query.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { AppError } from '../../common/errors/app-error';
import { PERMISSIONS } from '../rbac/permissions';
import {
  CreatePurchaseOrderDtoClass,
  createPurchaseOrderSchema,
  purchaseOrderListQuerySchema,
  type CreatePurchaseOrderDto,
  type PurchaseOrderListQuery
} from './dto/purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('Purchase Orders')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrders: PurchaseOrdersService) {}

  @Post()
  @RequirePermission(PERMISSIONS.PURCHASE_ORDERS_MANAGE)
  @ApiOperation({ summary: 'Create a purchase order (DRAFT)' })
  @ApiBody({ type: CreatePurchaseOrderDtoClass })
  async create(
    @ZodBody(createPurchaseOrderSchema) dto: CreatePurchaseOrderDto,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string | undefined
  ) {
    if (!organizationId) {
      throw new AppError('User is not assigned to an organization', 403);
    }
    const po = await this.purchaseOrders.create(dto, organizationId, user._id);
    return { data: { purchaseOrder: po }, message: 'Purchase order created' };
  }

  @Get()
  @RequirePermission(PERMISSIONS.PURCHASE_ORDERS_VIEW)
  @ApiOperation({ summary: 'List purchase orders (paginated, tenant-scoped)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'SENT', 'RECEIVED', 'CLOSED', 'CANCELLED']
  })
  async list(
    @ZodQuery(purchaseOrderListQuerySchema) query: PurchaseOrderListQuery,
    @TenantId() organizationId: string | undefined
  ) {
    if (!organizationId) {
      throw new AppError('User is not assigned to an organization', 403);
    }
    const result = await this.purchaseOrders.list(query, organizationId);
    return { data: result.data, meta: result.meta };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PURCHASE_ORDERS_VIEW)
  @ApiOperation({ summary: 'Get one purchase order' })
  @ApiParam({ name: 'id' })
  async getOne(
    @Param('id') id: string,
    @TenantId() organizationId: string | undefined
  ) {
    if (!organizationId) {
      throw new AppError('User is not assigned to an organization', 403);
    }
    const po = await this.purchaseOrders.getById(id, organizationId);
    return { data: { purchaseOrder: po } };
  }

  @Patch(':id/receive')
  @RequirePermission(PERMISSIONS.PURCHASE_ORDERS_MANAGE)
  @ApiOperation({
    summary:
      'Receive a purchase order — applies stock to inventory (idempotent)'
  })
  @ApiParam({ name: 'id' })
  async receive(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string | undefined
  ) {
    if (!organizationId) {
      throw new AppError('User is not assigned to an organization', 403);
    }
    const { purchaseOrder, inventoryEvents } =
      await this.purchaseOrders.receive(id, organizationId, user._id);
    return {
      data: { purchaseOrder, inventoryEvents },
      message: 'Purchase order received'
    };
  }
}
