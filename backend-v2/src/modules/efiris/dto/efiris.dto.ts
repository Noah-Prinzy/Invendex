import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const efrisInvoiceItemSchema = z.object({
  itemCode: z.string().min(1).max(50),
  itemName: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  currency: z.string().length(3).default('UGX'),
  taxRate: z.number().min(0).max(1).default(0.18)
});

export const submitInvoiceSchema = z
  .object({
    invoiceNo: z.string().min(1).max(64),
    buyerTin: z
      .string()
      .regex(/^\d{10}$/, 'URA TIN is 10 digits')
      .optional(),
    buyerName: z.string().max(200).optional(),
    buyerEmail: z.string().email().optional(),
    currency: z.string().length(3).default('UGX'),
    remarks: z.string().max(500).optional(),
    items: z.array(efrisInvoiceItemSchema).min(1)
  })
  .strict();

export type EfrisInvoiceItem = z.infer<typeof efrisInvoiceItemSchema>;
export type SubmitInvoiceDto = z.infer<typeof submitInvoiceSchema>;

export class EfrisInvoiceItemDto {
  @ApiProperty({ example: 'SKU-001' })
  itemCode!: string;

  @ApiProperty({ example: 'Sugar 1kg' })
  itemName!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 5000 })
  unitPrice!: number;

  @ApiProperty({ example: 'UGX', default: 'UGX' })
  currency!: string;

  @ApiProperty({ example: 0.18, default: 0.18 })
  taxRate!: number;
}

export class SubmitInvoiceDtoClass {
  @ApiProperty({ example: 'INV-2026-0001' })
  invoiceNo!: string;

  @ApiPropertyOptional({ example: '1000123456' })
  buyerTin?: string;

  @ApiPropertyOptional({ example: ' Kampala Traders Ltd' })
  buyerName?: string;

  @ApiPropertyOptional({ example: 'buyer@example.com' })
  buyerEmail?: string;

  @ApiProperty({ example: 'UGX', default: 'UGX' })
  currency!: string;

  @ApiPropertyOptional()
  remarks?: string;

  @ApiProperty({ type: [EfrisInvoiceItemDto] })
  items!: EfrisInvoiceItemDto[];
}
