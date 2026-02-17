import { successResponse } from '../utils/response.js';
import {
  allocateStockToBin,
  completePickTicket,
  createPickTicket,
  createWarehouseBin,
  getReplenishmentRecommendations,
  listStockMovements,
  listWarehouseBins,
  setWarehouseBinRules,
  startPickTicket,
  transferStockBetweenBins
} from '../services/wmsService.js';

export const createBin = async (req, res, next) => {
  try {
    const {
      warehouseId,
      code,
      zone,
      aisle,
      rack,
      shelf,
      binType,
      maxCapacityUnits,
      replenishmentMinUnits,
      replenishmentTargetUnits
    } = req.body;

    const bin = await createWarehouseBin({
      organizationId: req.organizationId,
      warehouseId,
      code,
      zone,
      aisle,
      rack,
      shelf,
      binType,
      maxCapacityUnits,
      replenishmentMinUnits,
      replenishmentTargetUnits
    });

    return successResponse(res, bin, 'Warehouse bin created', 201);
  } catch (err) {
    next(err);
  }
};

export const getBins = async (req, res, next) => {
  try {
    const bins = await listWarehouseBins({
      organizationId: req.organizationId,
      warehouseId: req.query.warehouseId || null,
      includeInactive: req.query.includeInactive === 'true'
    });

    return successResponse(res, bins, 'Warehouse bins retrieved');
  } catch (err) {
    next(err);
  }
};

export const allocateBinStock = async (req, res, next) => {
  try {
    const { warehouseId, binId, productId, quantity, reason } = req.body;

    const result = await allocateStockToBin({
      organizationId: req.organizationId,
      warehouseId,
      binId,
      productId,
      quantity,
      reason,
      movedBy: req.user?._id || null
    });

    return successResponse(res, result, 'Stock allocated to bin');
  } catch (err) {
    next(err);
  }
};

export const transferBinStock = async (req, res, next) => {
  try {
    const {
      warehouseId,
      productId,
      fromBinId,
      toBinId,
      quantity,
      reason
    } = req.body;

    const result = await transferStockBetweenBins({
      organizationId: req.organizationId,
      warehouseId,
      productId,
      fromBinId,
      toBinId,
      quantity,
      reason,
      movedBy: req.user?._id || null
    });

    return successResponse(res, result, 'Stock transferred between bins');
  } catch (err) {
    next(err);
  }
};

export const createPickWorkflowTicket = async (req, res, next) => {
  try {
    const { warehouseId, items, notes } = req.body;

    const ticket = await createPickTicket({
      organizationId: req.organizationId,
      warehouseId,
      items,
      notes,
      createdBy: req.user?._id
    });

    return successResponse(res, ticket, 'Pick ticket created', 201);
  } catch (err) {
    next(err);
  }
};

export const startPickWorkflowTicket = async (req, res, next) => {
  try {
    const ticket = await startPickTicket({
      organizationId: req.organizationId,
      ticketId: req.params.ticketId
    });

    return successResponse(res, ticket, 'Pick ticket started');
  } catch (err) {
    next(err);
  }
};

export const completePickWorkflowTicket = async (req, res, next) => {
  try {
    const ticket = await completePickTicket({
      organizationId: req.organizationId,
      ticketId: req.params.ticketId,
      movedBy: req.user?._id || null
    });

    return successResponse(res, ticket, 'Pick ticket completed and packed');
  } catch (err) {
    next(err);
  }
};

export const getMovementLedger = async (req, res, next) => {
  try {
    const movements = await listStockMovements({
      organizationId: req.organizationId,
      warehouseId: req.query.warehouseId || null,
      productId: req.query.productId || null,
      movementType: req.query.type || null,
      limit: req.query.limit || 100
    });

    return successResponse(res, movements, 'Stock movement ledger retrieved');
  } catch (err) {
    next(err);
  }
};

export const updateBinRules = async (req, res, next) => {
  try {
    const { warehouseId } = req.body;

    const bin = await setWarehouseBinRules({
      organizationId: req.organizationId,
      warehouseId,
      binId: req.params.binId,
      maxCapacityUnits: req.body.maxCapacityUnits,
      replenishmentMinUnits: req.body.replenishmentMinUnits,
      replenishmentTargetUnits: req.body.replenishmentTargetUnits
    });

    return successResponse(res, bin, 'Warehouse bin rules updated');
  } catch (err) {
    next(err);
  }
};

export const getReplenishmentPlan = async (req, res, next) => {
  try {
    const plan = await getReplenishmentRecommendations({
      organizationId: req.organizationId,
      warehouseId: req.query.warehouseId
    });

    return successResponse(res, plan, 'Replenishment recommendations retrieved');
  } catch (err) {
    next(err);
  }
};
