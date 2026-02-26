import REALTIME_EVENTS from '../events.js';
import {
  getRealtimeQueryPrefixes,
  invalidateQueriesForRealtimeEvent
} from '../queryInvalidation.js';

describe('realtime query invalidation', () => {
  it('returns configured prefixes for known event', () => {
    expect(getRealtimeQueryPrefixes(REALTIME_EVENTS.INVENTORY_UPDATED)).toEqual([
      'products:index',
      'reports:index'
    ]);
  });

  it('returns empty list for unknown events', () => {
    expect(getRealtimeQueryPrefixes('unknown.event')).toEqual([]);
  });

  it('invalidates matching token-scoped queries', () => {
    const queryClient = {
      invalidateQueries: jest.fn()
    };

    invalidateQueriesForRealtimeEvent({
      queryClient,
      eventName: REALTIME_EVENTS.PURCHASE_ORDER_RECEIVED,
      accessToken: 'token-1'
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);

    const firstPredicate = queryClient.invalidateQueries.mock.calls[0][0].predicate;
    expect(firstPredicate({ queryKey: ['products:index', 'token-1', 'true'] })).toBe(true);
    expect(firstPredicate({ queryKey: ['products:index', 'token-2', 'true'] })).toBe(false);
    expect(firstPredicate({ queryKey: ['suppliers:index', 'token-1', 'true'] })).toBe(false);
  });

  it('does nothing for unknown events', () => {
    const queryClient = {
      invalidateQueries: jest.fn()
    };

    invalidateQueriesForRealtimeEvent({
      queryClient,
      eventName: 'unknown.event',
      accessToken: 'token-1'
    });

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
