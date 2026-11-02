import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(128),
    name: z.string().min(1).max(120).optional(),
    organizationName: z.string().min(1).max(120).optional()
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email().max(255),
    password: z.string().min(1).max(128)
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1).optional()
  })
  .strict();

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;

export class RegisterDtoClass {
  @ApiProperty({ example: 'noah@invendex.io' })
  email!: string;

  @ApiProperty({ example: 'sup3r-secret', minLength: 8 })
  password!: string;

  @ApiPropertyOptional({ example: 'Noah' })
  name?: string;

  @ApiPropertyOptional({ example: 'Invendex Uganda Ltd' })
  organizationName?: string;
}

export class LoginDtoClass {
  @ApiProperty({ example: 'noah@invendex.io' })
  email!: string;

  @ApiProperty({ example: 'sup3r-secret' })
  password!: string;
}

export class RefreshDtoClass {
  @ApiPropertyOptional({ description: 'Omit when using the refreshToken cookie' })
  refreshToken?: string;
}
