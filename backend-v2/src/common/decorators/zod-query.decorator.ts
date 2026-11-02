import { Query } from '@nestjs/common';
import type { ZodType } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

/** `@Query()` validated by the given Zod schema. */
export const ZodQuery = (schema: ZodType): ParameterDecorator =>
  Query(new ZodValidationPipe(schema));
