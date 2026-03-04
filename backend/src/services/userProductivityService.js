import mongoose from 'mongoose';

import AuditLog from '../models/AuditLog.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import StockMovement from '../models/StockMovement.js';
import StocktakeSession from '../models/StocktakeSession.js';
import User from '../models/User.js';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDays = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 7;
  return Math.max(1, Math.min(90, Math.floor(parsed)));
};

const normalizeLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 25;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
};

const getSinceDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - normalizeDays(days));
  return date;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const getEmployeeProductivitySummary = async ({
  organizationId,
  days = 7,
  limit = 25
}) => {
  const normalizedDays = normalizeDays(days);
  const parsedLimit = normalizeLimit(limit);
  const since = getSinceDate(normalizedDays);
  const organizationObjectId = new mongoose.Types.ObjectId(organizationId);

  const [
    movementRows,
    stocktakeLineRows,
    stocktakeApprovalRows,
    purchaseOrderRows,
    errorRows
  ] = await Promise.all([
    StockMovement.aggregate([
      {
        $match: {
          organization: organizationObjectId,
          movedAt: { $gte: since },
          movedBy: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$movedBy',
          movementCount: { $sum: 1 },
          quantityMoved: { $sum: '$quantity' }
        }
      }
    ]),
    StocktakeSession.aggregate([
      {
        $match: {
          organization: organizationObjectId
        }
      },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.countedBy': { $ne: null },
          'lines.countedAt': { $gte: since }
        }
      },
      {
        $group: {
          _id: '$lines.countedBy',
          stocktakeLinesCounted: { $sum: 1 },
          expectedUnitsCounted: {
            $sum: { $ifNull: ['$lines.expectedQuantity', 0] }
          },
          absoluteVarianceUnits: {
            $sum: { $abs: { $ifNull: ['$lines.variance', 0] } }
          },
          varianceLineCount: {
            $sum: {
              $cond: [{ $ne: [{ $ifNull: ['$lines.variance', 0] }, 0] }, 1, 0]
            }
          }
        }
      }
    ]),
    StocktakeSession.aggregate([
      {
        $match: {
          organization: organizationObjectId,
          status: 'APPROVED',
          approvedBy: { $ne: null },
          approvedAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$approvedBy',
          stocktakeSessionsApproved: { $sum: 1 }
        }
      }
    ]),
    PurchaseOrder.aggregate([
      {
        $match: {
          organization: organizationObjectId,
          status: { $in: ['RECEIVED', 'CLOSED'] },
          receivedBy: { $ne: null },
          receivedAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$receivedBy',
          purchaseOrdersReceived: { $sum: 1 },
          purchaseUnitsReceived: { $sum: '$totalQuantity' }
        }
      }
    ]),
    AuditLog.aggregate([
      {
        $match: {
          organization: organizationObjectId,
          createdAt: { $gte: since },
          user: { $ne: null },
          success: false
        }
      },
      {
        $group: {
          _id: '$user',
          errorCount: { $sum: 1 }
        }
      }
    ])
  ]);

  const movementMap = new Map(
    movementRows.map((row) => [String(row._id), row])
  );
  const stocktakeLineMap = new Map(
    stocktakeLineRows.map((row) => [String(row._id), row])
  );
  const stocktakeApprovalMap = new Map(
    stocktakeApprovalRows.map((row) => [String(row._id), row])
  );
  const purchaseOrderMap = new Map(
    purchaseOrderRows.map((row) => [String(row._id), row])
  );
  const errorMap = new Map(errorRows.map((row) => [String(row._id), row]));

  const userIdSet = new Set([
    ...movementMap.keys(),
    ...stocktakeLineMap.keys(),
    ...stocktakeApprovalMap.keys(),
    ...purchaseOrderMap.keys(),
    ...errorMap.keys()
  ]);

  if (!userIdSet.size) {
    return {
      days: normalizedDays,
      generatedAt: new Date().toISOString(),
      summary: {
        activeEmployees: 0,
        totalMovements: 0,
        totalStocktakeLines: 0,
        totalPurchaseOrdersReceived: 0,
        totalErrors: 0
      },
      rows: []
    };
  }

  const users = await User.find({
    organization: organizationObjectId,
    _id: {
      $in: Array.from(userIdSet).map((id) => new mongoose.Types.ObjectId(id))
    }
  })
    .select('_id email role isActive')
    .lean();

  const rows = users.map((user) => {
    const userId = String(user._id);
    const movement = movementMap.get(userId) || {};
    const stocktakeLines = stocktakeLineMap.get(userId) || {};
    const approvals = stocktakeApprovalMap.get(userId) || {};
    const purchaseOrders = purchaseOrderMap.get(userId) || {};
    const errors = errorMap.get(userId) || {};

    const movementCount = toNumber(movement.movementCount, 0);
    const quantityMoved = toNumber(movement.quantityMoved, 0);
    const stocktakeLinesCounted = toNumber(
      stocktakeLines.stocktakeLinesCounted,
      0
    );
    const expectedUnitsCounted = toNumber(
      stocktakeLines.expectedUnitsCounted,
      0
    );
    const absoluteVarianceUnits = toNumber(
      stocktakeLines.absoluteVarianceUnits,
      0
    );
    const varianceLineCount = toNumber(stocktakeLines.varianceLineCount, 0);
    const stocktakeSessionsApproved = toNumber(
      approvals.stocktakeSessionsApproved,
      0
    );
    const purchaseOrdersReceived = toNumber(
      purchaseOrders.purchaseOrdersReceived,
      0
    );
    const purchaseUnitsReceived = toNumber(
      purchaseOrders.purchaseUnitsReceived,
      0
    );
    const errorCount = toNumber(errors.errorCount, 0);

    const accuracyRatePct =
      expectedUnitsCounted > 0
        ? clamp(
            Number(
              (
                (1 -
                  absoluteVarianceUnits / Math.max(expectedUnitsCounted, 1)) *
                100
              ).toFixed(2)
            ),
            0,
            100
          )
        : 100;

    const activityScore = Number(
      (
        movementCount * 1.4 +
        quantityMoved * 0.03 +
        stocktakeLinesCounted * 0.8 +
        stocktakeSessionsApproved * 4 +
        purchaseOrdersReceived * 3 -
        errorCount * 2
      ).toFixed(2)
    );

    return {
      userId,
      email: user.email,
      role: user.role,
      isActive: user.isActive !== false,
      movementCount,
      quantityMoved: Number(quantityMoved.toFixed(2)),
      stocktakeLinesCounted,
      stocktakeSessionsApproved,
      stocktakeVarianceLines: varianceLineCount,
      stocktakeAccuracyRatePct: accuracyRatePct,
      purchaseOrdersReceived,
      purchaseUnitsReceived: Number(purchaseUnitsReceived.toFixed(2)),
      errorCount,
      activityScore
    };
  });

  rows.sort((a, b) => b.activityScore - a.activityScore);
  const limitedRows = rows.slice(0, parsedLimit);

  return {
    days: normalizedDays,
    generatedAt: new Date().toISOString(),
    summary: {
      activeEmployees: limitedRows.filter((row) => row.isActive).length,
      totalMovements: limitedRows.reduce(
        (sum, row) => sum + row.movementCount,
        0
      ),
      totalStocktakeLines: limitedRows.reduce(
        (sum, row) => sum + row.stocktakeLinesCounted,
        0
      ),
      totalPurchaseOrdersReceived: limitedRows.reduce(
        (sum, row) => sum + row.purchaseOrdersReceived,
        0
      ),
      totalErrors: limitedRows.reduce((sum, row) => sum + row.errorCount, 0)
    },
    rows: limitedRows
  };
};

export default {
  getEmployeeProductivitySummary
};
