import { z } from 'zod';
import type { FilterQuery, Model } from 'mongoose';

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().max(100).optional(),
    q: z.string().max(200).optional()
  })
  .strict();

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function parseSort(sort?: string): Record<string, 1 | -1> | undefined {
  if (!sort) return undefined;
  const out: Record<string, 1 | -1> = {};
  for (const part of sort.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('-')) out[trimmed.slice(1)] = -1;
    else out[trimmed] = 1;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Page through a tenant-scoped query. `filter` MUST carry the organization
 * filter — the mongoose tenant plugin fails the query otherwise.
 */
export async function paginate<T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  query: PaginationQuery,
  options: { sort?: Record<string, 1 | -1>; select?: string } = {}
): Promise<PaginatedResult<T>> {
  const { page, limit } = query;
  const sort = options.sort ?? parseSort(query.sort) ?? { createdAt: -1 };
  const [total, rows] = await Promise.all([
    model.countDocuments(filter),
    model
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select(options.select ?? '')
      .lean()
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    data: rows as T[],
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}
