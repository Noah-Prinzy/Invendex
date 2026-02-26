import REALTIME_EVENTS from './events.js';

const EVENT_QUERY_PREFIXES = Object.freeze({
  [REALTIME_EVENTS.INVENTORY_UPDATED]: ['products:index', 'reports:index'],
  [REALTIME_EVENTS.PURCHASE_ORDER_CREATED]: [
    'reports:index',
    'suppliers:index'
  ],
  [REALTIME_EVENTS.PURCHASE_ORDER_UPDATED]: [
    'reports:index',
    'suppliers:index'
  ],
  [REALTIME_EVENTS.PURCHASE_ORDER_RECEIVED]: [
    'products:index',
    'reports:index',
    'suppliers:index'
  ],
  [REALTIME_EVENTS.FINANCE_COGS_RECORDED]: ['reports:index', 'products:index'],
  [REALTIME_EVENTS.FINANCE_VALUATION_UPDATED]: [
    'reports:index',
    'products:index'
  ],
  [REALTIME_EVENTS.AUTH_EMPLOYEE_SIGNED_IN]: ['users:management']
});

export const getRealtimeQueryPrefixes = (eventName) => {
  const normalizedEventName = String(eventName || '').trim();
  return Array.isArray(EVENT_QUERY_PREFIXES[normalizedEventName])
    ? EVENT_QUERY_PREFIXES[normalizedEventName]
    : [];
};

export const invalidateQueriesForRealtimeEvent = ({
  queryClient,
  eventName,
  accessToken = ''
}) => {
  if (!queryClient || typeof queryClient.invalidateQueries !== 'function')
    return;

  const prefixes = getRealtimeQueryPrefixes(eventName);
  if (!prefixes.length) return;

  const normalizedToken = String(accessToken || '').trim();

  prefixes.forEach((prefix) => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query?.queryKey;
        if (!Array.isArray(queryKey) || !queryKey.length) return false;
        if (String(queryKey[0] || '') !== String(prefix)) return false;
        if (!normalizedToken) return true;
        return String(queryKey[1] || '') === normalizedToken;
      }
    });
  });
};

export default {
  getRealtimeQueryPrefixes,
  invalidateQueriesForRealtimeEvent
};
