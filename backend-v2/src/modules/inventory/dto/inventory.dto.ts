import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { STOCK_REASONS } from '../inventory.service';

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a 24-char hex ObjectId');

export const adjustInventorySchema = z
  .object({
    product: objectIdSchema,
    warehouse: objectIdSchema,
    delta: z.number().refine((value) => value !== 0, 'delta must be non-zero'),
    reason: z.enum(STOCK_REASONS)
  })
  .strict();

export type AdjustInventoryDto = z.infer<typeof adjustInventorySchema>;

export class AdjustInventoryDtoClass {
  @ApiProperty({ example: '665f0f0f0f0f0f0f0f0f0a01' })
  product!: string;

  @ApiProperty({ example: '665f0f0f0f0f0f0f0f0f0b02' })
  warehouse!: string;

  @ApiProperty({ example: -3, description: 'Signed change in base units' })
  delta!: number;

  @ApiProperty({ enum: STOCK_REASONS, example: 'damaged' })
  reason!: (typeof STOCK_REASONS)[number];
}

export const inventoryListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().max(100).optional(),
    q: z.string().max(200).optional(),
    warehouse: objectIdSchema.optional(),
    product: objectIdSchema.optional()
  })
  .strict();

export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;
