import InventoryBatch from '../../models/InventoryBatch.js';
import InventorySerial from '../../models/InventorySerial.js';
import StockMovement from '../../models/StockMovement.js';
import { AppError } from '../../errors/AppError.js';

const normalizeTrackingType = (value) => {
  const normalized = String(value || 'NONE')
    .trim()
    .toUpperCase();
  if (['NONE', 'BATCH', 'SERIAL'].includes(normalized)) {
    return normalized;
  }
  return 'NONE';
};

const normalizeLotNumber = (lotNumber) => {
  const value = String(lotNumber || '')
    .trim()
    .toUpperCase();
  return value || null;
};

const normalizeSerials = (serialNumbers) => {
  if (!Array.isArray(serialNumbers)) return [];
  return serialNumbers
    .map((value) =>
      String(value || '')
        .trim()
        .toUpperCase()
    )
    .filter(Boolean);
};

const sortSerialsForFefo = (rows) => {
  const farFuture = Number.MAX_SAFE_INTEGER;
  return [...rows].sort((a, b) => {
    const aExpiry = a.expiryDate ? new Date(a.expiryDate).getTime() : farFuture;
    const bExpiry = b.expiryDate ? new Date(b.expiryDate).getTime() : farFuture;
    if (aExpiry !== bExpiry) return aExpiry - bExpiry;

    const aReceived = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
    const bReceived = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
    if (aReceived !== bReceived) return aReceived - bReceived;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};

const buildMovementReferenceType = (sourceType) => {
  const normalized = String(sourceType || '')
    .trim()
    .toUpperCase();
  if (
    ['PURCHASE_ORDER', 'PICK_TICKET', 'ORDER', 'MANUAL', 'SYSTEM'].includes(
      normalized
    )
  ) {
    return normalized;
  }
  return 'SYSTEM';
};

const sortBatchesForOutbound = (rows) => {
  const farFuture = Number.MAX_SAFE_INTEGER;
  return [...rows].sort((a, b) => {
    const aExpiry = a.expiryDate ? new Date(a.expiryDate).getTime() : farFuture;
    const bExpiry = b.expiryDate ? new Date(b.expiryDate).getTime() : farFuture;
    if (aExpiry !== bExpiry) return aExpiry - bExpiry;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};

const createStockMovement = async ({
  organizationId,
  productId,
  quantity,
  warehouseId,
  reason,
  sourceType,
  sourceId,
  movedBy,
  metadata,
  session = null
}) => {
  const payload = {
    organization: organizationId,
    movementType: 'OUTBOUND',
    product: productId,
    quantity,
    warehouseFrom: warehouseId,
    reason,
    referenceType: buildMovementReferenceType(sourceType),
    referenceId: sourceId,
    movedBy,
    metadata
  };

  if (session) {
    const rows = await StockMovement.create([payload], { session });
    return rows[0];
  }

  return StockMovement.create(payload);
};

const assertTrackingPayload = ({
  trackingType,
  lotNumber,
  quantity,
  serials
}) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError('Tracking quantity must be a positive integer', 400);
  }

  if (trackingType === 'BATCH' && !lotNumber) {
    throw new AppError('lotNumber is required for BATCH tracked items', 400);
  }

  if (trackingType === 'SERIAL') {
    if (!serials.length) {
      throw new AppError(
        'serialNumbers are required for SERIAL tracked items',
        400
      );
    }
    if (serials.length !== quantity) {
      throw new AppError(
        'serialNumbers count must match quantity for SERIAL tracked items',
        400
      );
    }
    if (new Set(serials).size !== serials.length) {
      throw new AppError('serialNumbers must be unique within the item', 400);
    }
  }
};

const upsertBatch = async ({
  organizationId,
  productId,
  warehouseId,
  lotNumber,
  expiryDate = null,
  quantity,
  sourceType,
  sourceId,
  movedBy = null,
  movementReason,
  session = null
}) => {
  const now = new Date();
  const options = {
    upsert: true,
    new: true,
    runValidators: true,
    setDefaultsOnInsert: true
  };
  if (session) {
    options.session = session;
  }

  const batch = await InventoryBatch.findOneAndUpdate(
    {
      organization: organizationId,
      product: productId,
      warehouse: warehouseId,
      lotNumber
    },
    {
      $inc: { quantityOnHand: quantity },
      $set: {
        lastMovementAt: now,
        sourceType,
        sourceId,
        isRecalled: false
      },
      ...(expiryDate ? { $setOnInsert: { expiryDate } } : {})
    },
    options
  );
  const inboundMovement = {
    organization: organizationId,
    movementType: 'INBOUND',
    product: productId,
    quantity,
    warehouseTo: warehouseId,
    reason: movementReason,
    referenceType: sourceType,
    referenceId: sourceId,
    movedBy,
    metadata: {
      trackingType: 'BATCH',
      lotNumber,
      expiryDate: expiryDate || null
    }
  };

  if (session) {
    await StockMovement.create([inboundMovement], { session });
  } else {
    await StockMovement.create(inboundMovement);
  }

  return batch;
};

export const recordInboundTrackingForReceipt = async ({
  organizationId,
  productId,
  warehouseId,
  quantity,
  trackingType = 'NONE',
  lotNumber = null,
  expiryDate = null,
  serialNumbers = [],
  sourceType = 'PURCHASE_ORDER',
  sourceId = null,
  movedBy = null,
  session = null
}) => {
  const normalizedTrackingType = normalizeTrackingType(trackingType);
  const normalizedLotNumber = normalizeLotNumber(lotNumber);
  const normalizedSerials = normalizeSerials(serialNumbers);
  const normalizedQuantity = Number(quantity);

  assertTrackingPayload({
    trackingType: normalizedTrackingType,
    lotNumber: normalizedLotNumber,
    quantity: normalizedQuantity,
    serials: normalizedSerials
  });

  if (normalizedTrackingType === 'NONE') {
    return {
      trackingType: 'NONE',
      batch: null,
      serialCount: 0
    };
  }

  let batch = null;

  if (normalizedTrackingType === 'BATCH' || normalizedLotNumber) {
    batch = await upsertBatch({
      organizationId,
      productId,
      warehouseId,
      lotNumber: normalizedLotNumber || `AUTO-${Date.now()}`,
      expiryDate,
      quantity: normalizedQuantity,
      sourceType,
      sourceId,
      movedBy,
      movementReason: 'Batch receipt',
      session
    });
  }

  if (normalizedTrackingType === 'SERIAL') {
    try {
      await InventorySerial.insertMany(
        normalizedSerials.map((serialNumber) => ({
          organization: organizationId,
          product: productId,
          warehouse: warehouseId,
          batch: batch?._id || null,
          lotNumber: batch?.lotNumber || normalizedLotNumber,
          serialNumber,
          status: 'AVAILABLE',
          sourceType,
          sourceId,
          receivedAt: new Date(),
          expiryDate: expiryDate || null
        })),
        { ordered: true, ...(session ? { session } : {}) }
      );
    } catch (err) {
      if (err?.code === 11000) {
        throw new AppError(
          'One or more serialNumbers already exist for this organization/product',
          409
        );
      }
      throw err;
    }

    const serialInboundMovement = {
      organization: organizationId,
      movementType: 'INBOUND',
      product: productId,
      quantity: normalizedQuantity,
      warehouseTo: warehouseId,
      reason: 'Serial receipt',
      referenceType: sourceType,
      referenceId: sourceId,
      movedBy,
      metadata: {
        trackingType: 'SERIAL',
        lotNumber: batch?.lotNumber || normalizedLotNumber,
        serialCount: normalizedSerials.length
      }
    };

    if (session) {
      await StockMovement.create([serialInboundMovement], { session });
    } else {
      await StockMovement.create(serialInboundMovement);
    }
  }

  return {
    trackingType: normalizedTrackingType,
    batch,
    serialCount: normalizedSerials.length
  };
};

const countAvailableSerials = async ({
  organizationId,
  productId,
  warehouseId,
  lotNumber = null,
  session = null
}) => {
  const query = {
    organization: organizationId,
    product: productId,
    warehouse: warehouseId,
    status: { $in: ['AVAILABLE', 'RESERVED'] }
  };
  if (lotNumber) {
    query.lotNumber = lotNumber;
  }

  const cursor = InventorySerial.countDocuments(query);
  if (session) {
    cursor.session(session);
  }
  return cursor;
};

const consumeBatchQuantity = async ({
  organizationId,
  productId,
  warehouseId,
  quantity,
  lotNumber = null,
  session = null
}) => {
  const query = {
    organization: organizationId,
    product: productId,
    warehouse: warehouseId,
    isRecalled: false,
    quantityOnHand: { $gt: 0 }
  };
  if (lotNumber) {
    query.lotNumber = lotNumber;
  }

  const cursor = InventoryBatch.find(query);
  if (session) {
    cursor.session(session);
  }
  const rows = await cursor;
  const batches = sortBatchesForOutbound(rows);

  let remaining = quantity;
  const consumedBatches = [];
  const now = new Date();

  for (const batch of batches) {
    if (remaining <= 0) break;
    const available = Math.max(
      Number(batch.quantityOnHand || 0) - Number(batch.quantityReserved || 0),
      0
    );
    if (available <= 0) continue;

    const take = Math.min(remaining, available);
    batch.quantityOnHand = Number(batch.quantityOnHand || 0) - take;
    batch.lastMovementAt = now;
    await batch.save(session ? { session } : undefined);

    consumedBatches.push({
      batchId: batch._id,
      lotNumber: batch.lotNumber,
      quantity: take
    });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new AppError(
      'Insufficient tracked batch inventory for outbound movement',
      409
    );
  }

  return consumedBatches;
};

export const consumeOutboundTracking = async ({
  organizationId,
  productId,
  warehouseId,
  quantity,
  lotNumber = null,
  serialNumbers = [],
  sourceType = 'SYSTEM',
  sourceId = null,
  movedBy = null,
  reason = 'Outbound tracking consumption',
  session = null
}) => {
  const normalizedQuantity = Number(quantity);
  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
    throw new AppError('quantity must be a positive integer', 400);
  }

  const normalizedLotNumber = normalizeLotNumber(lotNumber);
  const normalizedSerials = normalizeSerials(serialNumbers);

  if (
    normalizedSerials.length &&
    normalizedSerials.length !== normalizedQuantity
  ) {
    throw new AppError(
      'serialNumbers count must match quantity for tracked outbound movement',
      400
    );
  }

  const availableSerialCount = await countAvailableSerials({
    organizationId,
    productId,
    warehouseId,
    lotNumber: normalizedLotNumber,
    session
  });

  if (availableSerialCount > 0 || normalizedSerials.length > 0) {
    const serialQuery = {
      organization: organizationId,
      product: productId,
      warehouse: warehouseId,
      status: { $in: ['AVAILABLE', 'RESERVED'] }
    };
    if (normalizedLotNumber) {
      serialQuery.lotNumber = normalizedLotNumber;
    }
    if (normalizedSerials.length) {
      serialQuery.serialNumber = { $in: normalizedSerials };
    }

    const serialCursor = InventorySerial.find(serialQuery).sort({
      expiryDate: 1,
      receivedAt: 1,
      createdAt: 1
    });
    if (session) {
      serialCursor.session(session);
    }
    const serialRows = await serialCursor;

    let selectedSerials = sortSerialsForFefo(serialRows);
    if (!normalizedSerials.length) {
      selectedSerials = selectedSerials.slice(0, normalizedQuantity);
    }

    if (selectedSerials.length < normalizedQuantity) {
      throw new AppError(
        'Insufficient tracked serial inventory for outbound movement',
        409
      );
    }

    const now = new Date();
    const consumedByBatch = new Map();

    for (const serial of selectedSerials) {
      serial.status = 'SOLD';
      serial.soldAt = now;
      serial.soldBy = movedBy;
      serial.soldReferenceType = buildMovementReferenceType(sourceType);
      serial.soldReferenceId = sourceId;
      serial.reservedAt = null;
      serial.reservedBy = null;
      serial.reservedReferenceType = null;
      serial.reservedReferenceId = null;
      await serial.save(session ? { session } : undefined);

      if (serial.batch) {
        const key = String(serial.batch);
        consumedByBatch.set(key, (consumedByBatch.get(key) || 0) + 1);
      }
    }

    const consumedBatches = [];
    for (const [batchId, qty] of consumedByBatch.entries()) {
      const batchQuery = InventoryBatch.findOne({
        _id: batchId,
        organization: organizationId
      });
      if (session) {
        batchQuery.session(session);
      }
      const batch = await batchQuery;
      if (!batch) continue;

      batch.quantityOnHand = Math.max(
        Number(batch.quantityOnHand || 0) - qty,
        0
      );
      batch.lastMovementAt = now;
      await batch.save(session ? { session } : undefined);

      consumedBatches.push({
        batchId: batch._id,
        lotNumber: batch.lotNumber,
        quantity: qty
      });
    }

    await createStockMovement({
      organizationId,
      productId,
      quantity: normalizedQuantity,
      warehouseId,
      reason,
      sourceType,
      sourceId,
      movedBy,
      metadata: {
        trackingType: 'SERIAL',
        lotNumber: normalizedLotNumber,
        serialCount: selectedSerials.length,
        serialNumbers: selectedSerials.map((serial) => serial.serialNumber),
        consumedBatches
      },
      session
    });

    return {
      trackingType: 'SERIAL',
      quantityConsumed: normalizedQuantity,
      lotNumber: normalizedLotNumber,
      serialNumbers: selectedSerials.map((serial) => serial.serialNumber),
      consumedBatches
    };
  }

  const batchCountQuery = InventoryBatch.countDocuments({
    organization: organizationId,
    product: productId,
    warehouse: warehouseId,
    isRecalled: false,
    quantityOnHand: { $gt: 0 },
    ...(normalizedLotNumber ? { lotNumber: normalizedLotNumber } : {})
  });
  if (session) {
    batchCountQuery.session(session);
  }
  const batchCount = await batchCountQuery;

  if (batchCount > 0 || normalizedLotNumber) {
    const consumedBatches = await consumeBatchQuantity({
      organizationId,
      productId,
      warehouseId,
      quantity: normalizedQuantity,
      lotNumber: normalizedLotNumber,
      session
    });

    await createStockMovement({
      organizationId,
      productId,
      quantity: normalizedQuantity,
      warehouseId,
      reason,
      sourceType,
      sourceId,
      movedBy,
      metadata: {
        trackingType: 'BATCH',
        lotNumber: normalizedLotNumber,
        consumedBatches
      },
      session
    });

    return {
      trackingType: 'BATCH',
      quantityConsumed: normalizedQuantity,
      lotNumber: normalizedLotNumber,
      consumedBatches
    };
  }

  if (normalizedSerials.length || normalizedLotNumber) {
    throw new AppError(
      'No matching tracking records found for provided lotNumber/serialNumbers',
      404
    );
  }

  return {
    trackingType: 'NONE',
    quantityConsumed: 0,
    lotNumber: null,
    serialNumbers: [],
    consumedBatches: []
  };
};

export const reserveInventorySerials = async ({
  organizationId,
  productId,
  warehouseId,
  serialNumbers = [],
  quantity = null,
  lotNumber = null,
  referenceType = 'SYSTEM',
  referenceId = null,
  reservedBy = null,
  session = null
}) => {
  const normalizedSerials = normalizeSerials(serialNumbers);
  const normalizedLotNumber = normalizeLotNumber(lotNumber);
  const requestedQuantity = quantity == null ? null : Number(quantity);

  if (
    !normalizedSerials.length &&
    (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0)
  ) {
    throw new AppError(
      'Either serialNumbers or a positive quantity is required to reserve serials',
      400
    );
  }

  if (
    normalizedSerials.length &&
    requestedQuantity != null &&
    requestedQuantity !== normalizedSerials.length
  ) {
    throw new AppError(
      'quantity must match serialNumbers length when both are provided',
      400
    );
  }

  const query = {
    organization: organizationId,
    product: productId,
    warehouse: warehouseId
  };
  if (normalizedLotNumber) {
    query.lotNumber = normalizedLotNumber;
  }
  if (normalizedSerials.length) {
    query.serialNumber = { $in: normalizedSerials };
  }

  const serialQuery = InventorySerial.find(query).sort({
    expiryDate: 1,
    receivedAt: 1,
    createdAt: 1
  });
  if (session) {
    serialQuery.session(session);
  }
  const rows = await serialQuery;

  if (!rows.length) {
    throw new AppError('No serial records found for reservation', 404);
  }

  let candidates = rows.filter((row) => row.status === 'AVAILABLE');

  if (normalizedSerials.length) {
    const alreadyReservedBySameRef = rows.filter(
      (row) =>
        row.status === 'RESERVED' &&
        String(row.reservedReferenceType || '') ===
          String(buildMovementReferenceType(referenceType)) &&
        String(row.reservedReferenceId || '') === String(referenceId || '')
    );

    if (alreadyReservedBySameRef.length) {
      candidates = [...candidates, ...alreadyReservedBySameRef];
    }
  }

  candidates = sortSerialsForFefo(candidates);

  const needed = normalizedSerials.length || requestedQuantity;
  if (candidates.length < needed) {
    throw new AppError('Insufficient AVAILABLE serials for reservation', 409);
  }

  const selected = candidates.slice(0, needed);
  const now = new Date();
  const normalizedReferenceType = buildMovementReferenceType(referenceType);

  for (const serial of selected) {
    if (
      serial.status === 'RESERVED' &&
      String(serial.reservedReferenceType || '') ===
        String(normalizedReferenceType) &&
      String(serial.reservedReferenceId || '') === String(referenceId || '')
    ) {
      continue;
    }

    if (serial.status !== 'AVAILABLE') {
      throw new AppError(
        `Serial ${serial.serialNumber} is not available for reservation`,
        409
      );
    }

    serial.status = 'RESERVED';
    serial.reservedAt = now;
    serial.reservedBy = reservedBy;
    serial.reservedReferenceType = normalizedReferenceType;
    serial.reservedReferenceId = referenceId;
    await serial.save(session ? { session } : undefined);
  }

  return {
    reservedCount: selected.length,
    serialNumbers: selected.map((row) => row.serialNumber),
    referenceType: normalizedReferenceType,
    referenceId: referenceId || null
  };
};

export const releaseInventorySerials = async ({
  organizationId,
  serialNumbers = [],
  referenceId = null
}) => {
  const normalizedSerials = normalizeSerials(serialNumbers);
  if (!normalizedSerials.length) {
    throw new AppError('serialNumbers is required', 400);
  }

  const query = {
    organization: organizationId,
    serialNumber: { $in: normalizedSerials },
    status: 'RESERVED'
  };
  if (referenceId) {
    query.reservedReferenceId = referenceId;
  }

  const rows = await InventorySerial.find(query);
  if (!rows.length) {
    return {
      releasedCount: 0,
      serialNumbers: []
    };
  }

  for (const serial of rows) {
    serial.status = 'AVAILABLE';
    serial.reservedAt = null;
    serial.reservedBy = null;
    serial.reservedReferenceType = null;
    serial.reservedReferenceId = null;
    await serial.save();
  }

  return {
    releasedCount: rows.length,
    serialNumbers: rows.map((row) => row.serialNumber)
  };
};

export const verifyScannedSerial = async ({
  organizationId,
  serialNumber,
  productId = null,
  warehouseId = null,
  expectedStatuses = [],
  expectedReferenceId = null
}) => {
  const normalizedSerial = String(serialNumber || '')
    .trim()
    .toUpperCase();
  if (!normalizedSerial) {
    throw new AppError('serialNumber is required', 400);
  }

  const query = {
    organization: organizationId,
    serialNumber: normalizedSerial
  };
  if (productId) {
    query.product = productId;
  }
  if (warehouseId) {
    query.warehouse = warehouseId;
  }

  const serial = await InventorySerial.findOne(query)
    .populate('product', 'name sku')
    .populate('warehouse', 'name code')
    .lean();

  if (!serial) {
    return {
      isValid: false,
      reason: 'Serial not found'
    };
  }

  const normalizedStatuses = Array.isArray(expectedStatuses)
    ? expectedStatuses
        .map((value) =>
          String(value || '')
            .trim()
            .toUpperCase()
        )
        .filter(Boolean)
    : [];

  if (
    normalizedStatuses.length &&
    !normalizedStatuses.includes(serial.status)
  ) {
    return {
      isValid: false,
      reason: `Serial status ${serial.status} does not match expected statuses`,
      serial: {
        serialNumber: serial.serialNumber,
        status: serial.status,
        productId: serial.product?._id || serial.product,
        warehouseId: serial.warehouse?._id || serial.warehouse
      }
    };
  }

  if (
    expectedReferenceId &&
    String(serial.reservedReferenceId || '') !== String(expectedReferenceId)
  ) {
    return {
      isValid: false,
      reason: 'Serial is reserved for a different reference',
      serial: {
        serialNumber: serial.serialNumber,
        status: serial.status,
        reservedReferenceId: serial.reservedReferenceId || null
      }
    };
  }

  return {
    isValid: true,
    reason: null,
    serial: {
      serialNumber: serial.serialNumber,
      status: serial.status,
      productId: serial.product?._id || serial.product || null,
      productName: serial.product?.name || null,
      sku: serial.product?.sku || null,
      warehouseId: serial.warehouse?._id || serial.warehouse || null,
      warehouseCode: serial.warehouse?.code || null,
      lotNumber: serial.lotNumber || null,
      reservedReferenceId: serial.reservedReferenceId || null
    }
  };
};

export const listInventoryBatches = async ({
  organizationId,
  productId = null,
  warehouseId = null,
  includeRecalled = false,
  limit = 100
}) => {
  const parsedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const query = {
    organization: organizationId
  };

  if (productId) {
    query.product = productId;
  }
  if (warehouseId) {
    query.warehouse = warehouseId;
  }
  if (!includeRecalled) {
    query.isRecalled = false;
  }

  return InventoryBatch.find(query)
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .populate('product', 'name sku')
    .populate('warehouse', 'name code')
    .lean();
};

export const listInventorySerials = async ({
  organizationId,
  productId = null,
  warehouseId = null,
  lotNumber = null,
  status = null,
  limit = 200
}) => {
  const parsedLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);
  const query = {
    organization: organizationId
  };

  if (productId) query.product = productId;
  if (warehouseId) query.warehouse = warehouseId;
  if (lotNumber) query.lotNumber = normalizeLotNumber(lotNumber);
  if (status) query.status = String(status).trim().toUpperCase();

  return InventorySerial.find(query)
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .populate('product', 'name sku')
    .populate('warehouse', 'name code')
    .populate('batch', 'lotNumber expiryDate isRecalled')
    .lean();
};

export const getInventorySerialHistory = async ({
  organizationId,
  serialNumber,
  productId = null
}) => {
  const normalizedSerial = String(serialNumber || '')
    .trim()
    .toUpperCase();
  if (!normalizedSerial) {
    throw new AppError('serialNumber is required', 400);
  }

  const serialQuery = {
    organization: organizationId,
    serialNumber: normalizedSerial
  };
  if (productId) {
    serialQuery.product = productId;
  }

  const serialRows = await InventorySerial.find(serialQuery)
    .populate('product', 'name sku')
    .populate('warehouse', 'name code')
    .populate('batch', 'lotNumber expiryDate isRecalled')
    .lean();

  if (!serialRows.length) {
    throw new AppError('Serial not found', 404);
  }

  if (serialRows.length > 1 && !productId) {
    throw new AppError(
      'Multiple products match this serialNumber. Provide productId to disambiguate.',
      409
    );
  }

  const serial = serialRows[0];

  const movementMatchers = [{ 'metadata.serialNumbers': normalizedSerial }];
  if (serial.sourceId && serial.sourceType) {
    movementMatchers.push({
      referenceId: serial.sourceId,
      referenceType: serial.sourceType
    });
  }
  if (serial.soldReferenceId && serial.soldReferenceType) {
    movementMatchers.push({
      referenceId: serial.soldReferenceId,
      referenceType: serial.soldReferenceType
    });
  }

  const movements = await StockMovement.find({
    organization: organizationId,
    product: serial.product?._id || serial.product,
    $or: movementMatchers
  })
    .sort({ movedAt: 1, createdAt: 1 })
    .lean();

  const timeline = [
    {
      eventType: 'RECEIVED',
      occurredAt: serial.receivedAt || serial.createdAt,
      referenceType: serial.sourceType || null,
      referenceId: serial.sourceId || null,
      warehouseId: serial.warehouse?._id || serial.warehouse || null,
      details: {
        status: 'AVAILABLE',
        lotNumber: serial.lotNumber || null
      }
    }
  ];

  if (serial.recalledAt) {
    timeline.push({
      eventType: 'RECALL_HOLD',
      occurredAt: serial.recalledAt,
      referenceType: 'MANUAL',
      referenceId: null,
      warehouseId: serial.warehouse?._id || serial.warehouse || null,
      details: {
        reason: serial.recallReason || null
      }
    });
  }

  if (serial.soldAt) {
    timeline.push({
      eventType: 'SOLD',
      occurredAt: serial.soldAt,
      referenceType: serial.soldReferenceType || null,
      referenceId: serial.soldReferenceId || null,
      warehouseId: serial.warehouse?._id || serial.warehouse || null,
      details: {
        soldBy: serial.soldBy || null
      }
    });
  }

  for (const movement of movements) {
    timeline.push({
      eventType: `MOVEMENT_${movement.movementType}`,
      occurredAt: movement.movedAt || movement.createdAt,
      referenceType: movement.referenceType || null,
      referenceId: movement.referenceId || null,
      warehouseId: movement.warehouseFrom || movement.warehouseTo || null,
      details: {
        reason: movement.reason || null,
        quantity: movement.quantity || null,
        metadata: movement.metadata || null
      }
    });
  }

  timeline.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));

  return {
    serial: {
      serialNumber: serial.serialNumber,
      status: serial.status,
      productId: serial.product?._id || serial.product || null,
      productName: serial.product?.name || null,
      sku: serial.product?.sku || null,
      warehouseId: serial.warehouse?._id || serial.warehouse || null,
      warehouseCode: serial.warehouse?.code || null,
      lotNumber: serial.lotNumber || null,
      batchId: serial.batch?._id || serial.batch || null,
      batchLotNumber: serial.batch?.lotNumber || null
    },
    timeline
  };
};

export const recallInventoryBatch = async ({
  organizationId,
  productId,
  lotNumber,
  warehouseId = null,
  reason,
  recalledBy = null
}) => {
  const normalizedLotNumber = normalizeLotNumber(lotNumber);
  if (!normalizedLotNumber) {
    throw new AppError('lotNumber is required for recall', 400);
  }

  const query = {
    organization: organizationId,
    product: productId,
    lotNumber: normalizedLotNumber
  };
  if (warehouseId) {
    query.warehouse = warehouseId;
  }

  const batches = await InventoryBatch.find(query);
  if (!batches.length) {
    throw new AppError('No matching batch found to recall', 404);
  }

  const now = new Date();
  let affectedQuantity = 0;
  const recalledBatchIds = [];

  for (const batch of batches) {
    const availableToRecall = Math.max(
      Number(batch.quantityOnHand || 0) - Number(batch.quantityRecalled || 0),
      0
    );

    batch.isRecalled = true;
    batch.recalledAt = now;
    batch.recallReason = reason || 'Batch recall';
    batch.recalledBy = recalledBy;
    batch.quantityRecalled =
      Number(batch.quantityRecalled || 0) + availableToRecall;
    await batch.save();

    recalledBatchIds.push(batch._id);
    affectedQuantity += availableToRecall;

    await StockMovement.create({
      organization: organizationId,
      movementType: 'ADJUSTMENT',
      product: batch.product,
      quantity: availableToRecall || 1,
      warehouseFrom: batch.warehouse,
      reason: `Batch recall hold (${batch.lotNumber})`,
      referenceType: 'MANUAL',
      movedBy: recalledBy,
      metadata: {
        trackingType: 'BATCH',
        lotNumber: batch.lotNumber,
        recallReason: batch.recallReason
      }
    });
  }

  const serialResult = await InventorySerial.updateMany(
    {
      organization: organizationId,
      product: productId,
      lotNumber: normalizedLotNumber,
      ...(warehouseId ? { warehouse: warehouseId } : {}),
      status: { $in: ['AVAILABLE', 'RESERVED'] }
    },
    {
      $set: {
        status: 'RECALL_HOLD',
        recallReason: reason || 'Batch recall',
        recalledAt: now,
        recalledBy
      }
    }
  );

  return {
    lotNumber: normalizedLotNumber,
    recalledBatchCount: recalledBatchIds.length,
    recalledBatchIds,
    affectedQuantity,
    serialsPlacedOnHold: serialResult.modifiedCount
  };
};

export default {
  recordInboundTrackingForReceipt,
  reserveInventorySerials,
  releaseInventorySerials,
  verifyScannedSerial,
  listInventoryBatches,
  listInventorySerials,
  getInventorySerialHistory,
  recallInventoryBatch,
  consumeOutboundTracking
};
