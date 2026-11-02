import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const requestToPaySchema = z
  .object({
    amount: z.number().positive(),
    currency: z.string().length(3).default('UGX'),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{7,14}$/, 'MSISDN format, e.g. +2567XXXXXXXX'),
    reference: z.string().min(1).max(64),
    description: z.string().max(200).optional()
  })
  .strict();

export type RequestToPayDto = z.infer<typeof requestToPaySchema>;

export class RequestToPayDtoClass {
  @ApiProperty({ example: 25000 })
  amount!: number;

  @ApiProperty({ example: 'UGX', default: 'UGX' })
  currency!: string;

  @ApiProperty({ example: '+256772123456' })
  phoneNumber!: string;

  @ApiProperty({ example: 'SALE-2026-0042' })
  reference!: string;

  @ApiPropertyOptional({ example: 'Payment for invoice INV-0042' })
  description?: string;
}
