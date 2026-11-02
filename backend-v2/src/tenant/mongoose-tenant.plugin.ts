import type { Aggregate, Document, Query, Schema } from 'mongoose';
import { TenantContext } from './tenant-context';
import { TenantIsolationError } from './tenant-isolation.error';

type NextFn = (err?: unknown) => void;

/** Loose view of Schema.pre that accepts any hook name (mongoose's overloads
 * are per-operation literals; we register a fixed list dynamically). */
type HookRegistrar = {
  pre: (method: string, fn: (this: unknown, next: NextFn) => void) => void;
};

const asHookRegistrar = (schema: Schema): HookRegistrar =>
  schema as unknown as HookRegistrar;

const QUERY_OPERATIONS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'countDocuments',
  'estimatedDocumentCount',
  'distinct'
] as const;

const isBypassed = (options: Record<string, unknown> | undefined): boolean =>
  options?.tenantBypass === true;

const matchesTenant = (organization: unknown, tenantId: string): boolean =>
  organization !== undefined &&
  organization !== null &&
  String(organization) === tenantId;

/**
 * Global mongoose plugin enforcing multi-tenant isolation at the data layer:
 * every query operation must carry an `organization` filter equal to the
 * active tenant, every aggregate pipeline must $match on it, and every saved
 * document must belong to it. System-level access must opt out explicitly with
 * `{ tenantBypass: true }`.
 */
export function mongooseTenantPlugin(schema: Schema): void {
  const registrar = asHookRegistrar(schema);
  for (const op of QUERY_OPERATIONS) {
    registrar.pre(op, function (this: unknown, next: NextFn) {
      const query = this as Query<unknown, unknown> & {
        getOptions(): Record<string, unknown>;
      };
      if (isBypassed(query.getOptions())) return next();
      const tenant = TenantContext.get();
      if (!tenant) {
        return next(
          new TenantIsolationError(
            `'${op}' ran without an active tenant context`
          )
        );
      }
      const filter = (query.getFilter() ?? {}) as Record<string, unknown>;
      if (!matchesTenant(filter.organization, tenant.organizationId)) {
        return next(
          new TenantIsolationError(
            `'${op}' is missing the organization filter or it does not match the active tenant`
          )
        );
      }
      return next();
    });
  }

  registrar.pre('aggregate', function (this: unknown, next: NextFn) {
    const aggregate = this as Aggregate<unknown[]> & {
      options?: Record<string, unknown>;
    };
    if (isBypassed(aggregate.options)) return next();
    const tenant = TenantContext.get();
    if (!tenant) {
      return next(
        new TenantIsolationError(
          "'aggregate' ran without an active tenant context"
        )
      );
    }
    const pipeline = aggregate.pipeline() as unknown as Array<
      Record<string, unknown>
    >;
    const matchStage = pipeline.find(
      (stage) => stage && typeof stage === 'object' && '$match' in stage
    ) as { $match?: Record<string, unknown> } | undefined;
    if (
      !matchStage ||
      !matchesTenant(matchStage.$match?.organization, tenant.organizationId)
    ) {
      return next(
        new TenantIsolationError(
          "'aggregate' pipeline is missing a $match on organization matching the active tenant"
        )
      );
    }
    return next();
  });

  registrar.pre('save', function (this: unknown, next: NextFn) {
    if (!schema.path('organization')) return next();
    const doc = this as Document & {
      organization?: unknown;
      $__?: { saveOptions?: Record<string, unknown> };
    };
    if (doc.$__?.saveOptions?.tenantBypass === true) return next();
    const tenant = TenantContext.get();
    if (doc.organization === undefined || doc.organization === null) {
      if (!tenant) {
        return next(
          new TenantIsolationError(
            "'save' has no organization and no active tenant context"
          )
        );
      }
      doc.organization = tenant.organizationId;
      return next();
    }
    if (tenant && String(doc.organization) !== tenant.organizationId) {
      return next(
        new TenantIsolationError(
          "'save' organization does not match the active tenant"
        )
      );
    }
    return next();
  });
}
