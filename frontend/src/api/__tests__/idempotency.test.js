import { createIdempotencyKey } from '../idempotency.js';

describe('createIdempotencyKey', () => {
  it('generates scoped idempotency keys', () => {
    const key = createIdempotencyKey('manual-stock-adjustment');
    expect(key.startsWith('manual-stock-adjustment-')).toBe(true);
    expect(key.length).toBeGreaterThan(30);
  });

  it('generates different keys for successive calls', () => {
    const first = createIdempotencyKey('receive-po');
    const second = createIdempotencyKey('receive-po');
    expect(first).not.toBe(second);
  });
});
