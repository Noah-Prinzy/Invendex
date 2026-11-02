import {
  BadRequestException,
  Injectable,
  type PipeTransform
} from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Validates a request payload against a Zod schema. On success the parsed
 * (and therefore sanitized/coerced) value replaces the raw input; unknown
 * keys are rejected when the schema is strict.
 */
@Injectable()
export class ZodValidationPipe<
  T extends ZodType = ZodType
> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => {
          const path = issue.path.join('.');
          return path ? `${path}: ${issue.message}` : issue.message;
        })
        .join('; ');
      throw new BadRequestException(message);
    }
    return result.data;
  }
}
