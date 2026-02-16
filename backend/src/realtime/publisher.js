import {
  getIo,
  getOrganizationRoomName,
  getWarehouseRoomName,
  isRealtimeEnabled
} from './socketServer.js';

const eventEmitCounters = new Map();

const incrementEventCounter = event => {
  const current = eventEmitCounters.get(event) || 0;
  const next = current + 1;
  eventEmitCounters.set(event, next);
  return next;
};

const logEmit = ({ event, organizationId, warehouseId, totalEmitted }) => {
  console.log(
    JSON.stringify({
      level: 'info',
      scope: 'realtime',
      message: 'event_emitted',
      event,
      organizationId: String(organizationId),
      warehouseId: warehouseId ? String(warehouseId) : null,
      totalEmitted,
      occurredAt: new Date().toISOString()
    })
  );
};

const emitToOrganization = ({
  organizationId,
  event,
  payload,
  warehouseId = null
}) => {
  if (!organizationId || !event) return;
  if (!isRealtimeEnabled()) return;

  const io = getIo();
  if (!io) return;

  const orgRoom = getOrganizationRoomName(String(organizationId));
  io.to(orgRoom).emit(event, payload);

  const totalEmitted = incrementEventCounter(event);
  logEmit({
    event,
    organizationId,
    warehouseId,
    totalEmitted
  });

  if (warehouseId) {
    const warehouseRoom = getWarehouseRoomName(
      String(organizationId),
      String(warehouseId)
    );
    io.to(warehouseRoom).emit(event, payload);
  }
};

export const getRealtimeEmitStats = () =>
  Array.from(eventEmitCounters.entries()).map(([event, count]) => ({
    event,
    count
  }));

const buildBasePayload = ({
  organizationId,
  actorUserId = null,
  entityId,
  entityType,
  data = {}
}) => ({
  organizationId: String(organizationId),
  occurredAt: new Date().toISOString(),
  actorUserId: actorUserId ? String(actorUserId) : null,
  entityId: entityId ? String(entityId) : null,
  entityType,
  data
});

export const publishInventoryUpdated = ({
  organizationId,
  warehouseId = null,
  actorUserId = null,
  entityId = null,
  data = {}
}) => {
  emitToOrganization({
    organizationId,
    warehouseId,
    event: 'inventory.updated',
    payload: buildBasePayload({
      organizationId,
      actorUserId,
      entityId,
      entityType: 'INVENTORY',
      data
    })
  });
};

export const publishPurchaseOrderCreated = ({
  organizationId,
  actorUserId = null,
  purchaseOrder
}) => {
  emitToOrganization({
    organizationId,
    warehouseId: purchaseOrder?.warehouse || null,
    event: 'purchase_order.created',
    payload: buildBasePayload({
      organizationId,
      actorUserId,
      entityId: purchaseOrder?._id || null,
      entityType: 'PURCHASE_ORDER',
      data: purchaseOrder || {}
    })
  });
};

export const publishPurchaseOrderUpdated = ({
  organizationId,
  actorUserId = null,
  purchaseOrder
}) => {
  emitToOrganization({
    organizationId,
    warehouseId: purchaseOrder?.warehouse || null,
    event: 'purchase_order.updated',
    payload: buildBasePayload({
      organizationId,
      actorUserId,
      entityId: purchaseOrder?._id || null,
      entityType: 'PURCHASE_ORDER',
      data: purchaseOrder || {}
    })
  });
};

export const publishPurchaseOrderReceived = ({
  organizationId,
  actorUserId = null,
  purchaseOrder
}) => {
  emitToOrganization({
    organizationId,
    warehouseId: purchaseOrder?.warehouse || null,
    event: 'purchase_order.received',
    payload: buildBasePayload({
      organizationId,
      actorUserId,
      entityId: purchaseOrder?._id || null,
      entityType: 'PURCHASE_ORDER',
      data: purchaseOrder || {}
    })
  });
};

export const publishCogsRecorded = ({
  organizationId,
  actorUserId = null,
  warehouseId = null,
  cogsEntry
}) => {
  emitToOrganization({
    organizationId,
    warehouseId,
    event: 'finance.cogs_recorded',
    payload: buildBasePayload({
      organizationId,
      actorUserId,
      entityId: cogsEntry?._id || null,
      entityType: 'COGS_ENTRY',
      data: cogsEntry || {}
    })
  });
};

export const publishValuationUpdated = ({
  organizationId,
  actorUserId = null,
  warehouseId = null,
  data = {}
}) => {
  emitToOrganization({
    organizationId,
    warehouseId,
    event: 'finance.valuation_updated',
    payload: buildBasePayload({
      organizationId,
      actorUserId,
      entityId: data?.valuationConfigId || null,
      entityType: 'INVENTORY_VALUATION',
      data
    })
  });
};

export default {
  publishInventoryUpdated,
  publishPurchaseOrderCreated,
  publishPurchaseOrderUpdated,
  publishPurchaseOrderReceived,
  publishCogsRecorded,
  publishValuationUpdated,
  getRealtimeEmitStats
};
