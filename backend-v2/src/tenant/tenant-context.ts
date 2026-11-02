import { AsyncLocalStorage } from 'node:async_hooks';
import { TenantIsolationError } from './tenant-isolation.error';

export interface TenantContextValue {
  organizationId: string;
}

/**
 * Request/job-scoped tenant context backed by AsyncLocalStorage. The mongoose
 * tenant plugin reads this to fail any query that is missing (or mismatching)
 * the organization filter.
 */
export class TenantContext {
  private static readonly als = new AsyncLocalStorage<TenantContextValue>();

  static run<T>(value: TenantContextValue, fn: () => T): T {
    return TenantContext.als.run(value, fn);
  }

  static get(): TenantContextValue | undefined {
    return TenantContext.als.getStore();
  }

  static require(): TenantContextValue {
    const store = TenantContext.als.getStore();
    if (!store) {
      throw new TenantIsolationError('no active tenant context');
    }
    return store;
  }
}
