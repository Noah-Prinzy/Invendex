const resolveUserIdentityLabel = (identity = {}, fallback = 'employee') =>
  String(
    identity?.username ||
      identity?.name ||
      String(identity?.email || '').split('@')[0] ||
      fallback
  ).trim() || fallback;

export const buildInventoryEvent = (payload, eventName) => {
  const data = payload?.data || {};
  const quantityDelta = Number(data.quantityDelta || 0);
  const quantityOnHand = Number(data.quantityOnHand || 0);
  const sign = quantityDelta >= 0 ? '+' : '';

  return {
    id: eventName + ':' + (payload?.entityId || 'n/a') + ':' + (payload?.occurredAt || Date.now()),
    eventName,
    occurredAt: payload?.occurredAt || new Date().toISOString(),
    title: data.source ? 'Inventory ' + data.source : 'Inventory updated',
    subtitle: 'Delta ' + sign + quantityDelta + ' | On hand ' + quantityOnHand,
    raw: payload
  };
};

export const buildFinanceEvent = (payload, eventName) => {
  const data = payload?.data || {};
  const orderId = data.orderId || data.reason || 'n/a';

  return {
    id: eventName + ':' + (payload?.entityId || 'n/a') + ':' + (payload?.occurredAt || Date.now()),
    eventName,
    occurredAt: payload?.occurredAt || new Date().toISOString(),
    title: eventName === 'finance.cogs_recorded' ? 'COGS recorded' : 'Valuation updated',
    subtitle: 'Reference ' + String(orderId),
    raw: payload
  };
};

export const buildPurchaseOrderEvent = (payload, kind) => {
  const data = payload?.data || {};
  const poNumber = data.poNumber || payload?.entityId || 'n/a';
  const status = data.status || 'UNKNOWN';

  return {
    id: 'po:' + kind + ':' + (payload?.entityId || 'n/a') + ':' + (payload?.occurredAt || Date.now()),
    kind,
    occurredAt: payload?.occurredAt || new Date().toISOString(),
    title: 'PO ' + poNumber,
    subtitle: 'Status ' + status,
    raw: payload
  };
};

export const buildAuthEvent = (payload) => {
  const data = payload?.data || {};
  const username = resolveUserIdentityLabel(data);

  return {
    id: 'auth:employee:' + (payload?.entityId || 'n/a') + ':' + (payload?.occurredAt || Date.now()),
    occurredAt: payload?.occurredAt || new Date().toISOString(),
    title: 'Employee signed in',
    subtitle: username + ' joined ' + (data.organizationName || 'organization'),
    raw: payload
  };
};

export const resolveWarehouseIdFromPayload = (payload) => {
  const data = payload?.data || {};
  const warehouseCandidate =
    data?.warehouseId ||
    data?.warehouse?._id ||
    data?.warehouse?.id ||
    data?.warehouse ||
    payload?.warehouseId ||
    payload?.warehouse;

  const normalized = String(warehouseCandidate || '').trim();
  return normalized || null;
};
