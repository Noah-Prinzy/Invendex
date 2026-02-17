import { successResponse } from '../utils/response.js';
import {
  releaseInventorySerials,
  reserveInventorySerials,
  getInventorySerialHistory,
  listInventoryBatches,
  listInventorySerials,
  recallInventoryBatch,
  verifyScannedSerial
} from '../services/inventory/trackingService.js';

export const getInventoryBatches = async (req, res, next) => {
  try {
    const rows = await listInventoryBatches({
      organizationId: req.organizationId,
      productId: req.query.productId || null,
      warehouseId: req.query.warehouseId || null,
      includeRecalled: req.query.includeRecalled || false,
      limit: req.query.limit || 100
    });

    return successResponse(res, rows, 'Inventory batches retrieved');
  } catch (err) {
    next(err);
  }
};

export const getInventorySerials = async (req, res, next) => {
  try {
    const rows = await listInventorySerials({
      organizationId: req.organizationId,
      productId: req.query.productId || null,
      warehouseId: req.query.warehouseId || null,
      lotNumber: req.query.lotNumber || null,
      status: req.query.status || null,
      limit: req.query.limit || 200
    });

    return successResponse(res, rows, 'Inventory serials retrieved');
  } catch (err) {
    next(err);
  }
};

export const recallBatchLot = async (req, res, next) => {
  try {
    const result = await recallInventoryBatch({
      organizationId: req.organizationId,
      productId: req.body.productId,
      lotNumber: req.body.lotNumber,
      warehouseId: req.body.warehouseId || null,
      reason: req.body.reason || null,
      recalledBy: req.user?._id || null
    });

    return successResponse(res, result, 'Batch recall hold applied');
  } catch (err) {
    next(err);
  }
};

export const getSerialHistory = async (req, res, next) => {
  try {
    const result = await getInventorySerialHistory({
      organizationId: req.organizationId,
      serialNumber: req.params.serialNumber,
      productId: req.query.productId || null
    });

    return successResponse(res, result, 'Serial history retrieved');
  } catch (err) {
    next(err);
  }
};

export const reserveSerials = async (req, res, next) => {
  try {
    const result = await reserveInventorySerials({
      organizationId: req.organizationId,
      productId: req.body.productId,
      warehouseId: req.body.warehouseId,
      serialNumbers: req.body.serialNumbers || [],
      quantity: req.body.quantity,
      lotNumber: req.body.lotNumber || null,
      referenceType: req.body.referenceType || 'SYSTEM',
      referenceId: req.body.referenceId || null,
      reservedBy: req.user?._id || null
    });

    return successResponse(res, result, 'Serials reserved');
  } catch (err) {
    next(err);
  }
};

export const releaseSerials = async (req, res, next) => {
  try {
    const result = await releaseInventorySerials({
      organizationId: req.organizationId,
      serialNumbers: req.body.serialNumbers || [],
      referenceId: req.body.referenceId || null
    });

    return successResponse(res, result, 'Serial reservations released');
  } catch (err) {
    next(err);
  }
};

export const verifySerialScan = async (req, res, next) => {
  try {
    const result = await verifyScannedSerial({
      organizationId: req.organizationId,
      serialNumber: req.body.serialNumber,
      productId: req.body.productId || null,
      warehouseId: req.body.warehouseId || null,
      expectedStatuses: req.body.expectedStatuses || [],
      expectedReferenceId: req.body.expectedReferenceId || null
    });

    return successResponse(res, result, 'Serial scan verified');
  } catch (err) {
    next(err);
  }
};

export default {
  getInventoryBatches,
  getInventorySerials,
  recallBatchLot,
  getSerialHistory,
  reserveSerials,
  releaseSerials,
  verifySerialScan
};
