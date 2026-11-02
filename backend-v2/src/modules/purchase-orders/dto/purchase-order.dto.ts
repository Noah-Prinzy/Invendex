import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import { objectIdSchema } from '../../inventory/dto/inventory.dto';

export const poItemSchema = z
  .object({
    product: objectIdSchema,
    quantity: z.number().positive(),
    unitCost: z.number().min(0),
    purchaseUom: z.string().max(20).optional(),
    purchaseToBaseFactor: z.number().int().min(1).optional(),
    trackingType: z.enum(['NONE', 'BATCH', 'SERIAL']).default('NONE'),
    lotNumber: z.string().max(50).optional(),
    expiryDate: z.coerce.date().optional(),
    serialNumbers: z.array(z.string().max(50)).optional(),
    reorderAlert: objectIdSchema.optional()
  })
  .strict();

export const createPurchaseOrderSchema = z
  .object({
    supplier: objectIdSchema,
    warehouse: objectIdSchema,
    items: z.array(poItemSchema).min(1),
    expectedDeliveryDate: z.coerce.date().optional(),
    notes: z.string().max(2000).optional()
  })
  .strict();

export type CreatePurchaseOrderDto = z.infer<typeof createPurchaseOrderSchema>;
export type PurchaseOrderItemDto = z.infer<typeof poItemSchema>;

export class PurchaseOrderItemDtoClass {
  @ApiProperty({ example: '665f0f0f0f0f0f0f0f0f0a01' })
  product!: string;

  @ApiProperty({ example: 20 })
  quantity!: number;

  @ApiProperty({ example: 50 })
  unitCost!: number;

  @ApiPropertyOptional({ example: 'box' })
  purchaseUom?: string;

  @ApiPropertyOptional({ example: 24 })
  purchaseToBaseFactor?: number;

  @ApiPropertyOptional({ enum: ['NONE', 'BATCH', 'SERIAL'], default: 'NONE' })
  trackingType?: 'NONE' | 'BATCH' | 'SERIAL';
}

export class CreatePurchaseOrderDtoClass {
  @ApiProperty({ example: '665f0f0f0f0f0f0f0f0f0b02' })
  supplier!: string;

  @ApiProperty({ example: '665f0f0f0f0f0f0f0f0f0c03' })
  warehouse!: string;

  @ApiProperty({ type: [PurchaseOrderItemDtoClass] })
  items!: PurchaseOrderItemDtoClass[];

  @ApiPropertyOptional()
  expectedDeliveryDate?: Date;

  @ApiPropertyOptional()
  notes?: string;
}

export const purchaseOrderListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().max(100).optional(),
    q: z.string().max(200).optional(),
    status: z
      .enum(['DRAFT', 'SENT', 'RECEIVED', 'CLOSED', 'CANCELLED'])
      .optional()
  })
  .strict();

export type PurchaseOrderListQuery = z.infer<typeof purchaseOrderListQuerySchema>;
