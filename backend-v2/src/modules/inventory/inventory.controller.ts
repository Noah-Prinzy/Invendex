import { Controller, Get, Param, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags
} from '@nestjs/swagger';
import type { Model } from 'mongoose';
import { paginate } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import { ZodQuery } from '../../common/decorators/zod-query.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { AppError } from '../../common/errors/app-error';
import type { IInventory } from '../../persistence/schemas/inventory.schema';
import { PERMISSIONS } from '../rbac/permissions';
import {
  AdjustInventoryDtoClass,
  adjustInventorySchema,
  inventoryListQuerySchema,
  type AdjustInventoryDto,
  type InventoryListQuery
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventory: InventoryService,
    @InjectModel('Inventory') private readonly inventoryModel: Model<IInventory>
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'List inventory rows (paginated, tenant-scoped)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'warehouse', required: false })
  @ApiQuery({ name: 'product', required: false })
  async list(
    @ZodQuery(inventoryListQuerySchema) query: InventoryListQuery,
    @TenantId() organizationId: string | undefined
  ) {
    if (!organizationId) {
      throw new AppError('User is not assigned to an organization', 403);
    }
    const filter: Record<string, unknown> = { organization: organizationId };
    if (query.warehouse) filter.warehouse = query.warehouse;
    if (query.product) filter.product = query.product;
    const result = await paginate<IInventory>(
      this.inventoryModel,
      filter,
      query
    );
    return { data: result.data, meta: result.meta };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get one inventory row' })
  @ApiParam({ name: 'id' })
  async getOne(
    @Param('id') id: string,
    @TenantId() organizationId: string | undefined
  ) {
    if (!organizationId) {
      throw new AppError('User is not assigned to an organization', 403);
    }
    const row = await this.inventoryModel
      .findOne({ _id: id, organization: organizationId })
      .lean();
    if (!row) {
      throw new AppError('Inventory row not found', 404);
    }
    return { data: row };
  }

  @Post('adjust')
  @RequirePermission(PERMISSIONS.INVENTORY_ADJUST)
  @ApiOperation({
    summary: 'Manually adjust stock (creates a snapshot, syncs product stock)'
  })
  @ApiBody({ type: AdjustInventoryDtoClass })
  async adjust(
    @ZodBody(adjustInventorySchema) dto: AdjustInventoryDto,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string | undefined
  ) {
    if (!organizationId) {
      throw new AppError('User is not assigned to an organization', 403);
    }
    const inventory = await this.inventory.adjustStock({
      organizationId,
      productId: dto.product,
      warehouseId: dto.warehouse,
      delta: dto.delta,
      reason: dto.reason,
      actorUserId: user._id
    });
    return { data: { inventory }, message: 'Stock adjusted' };
  }
}
