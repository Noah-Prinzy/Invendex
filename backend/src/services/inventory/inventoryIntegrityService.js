import mongoose from 'mongoose';
import Inventory from '../../models/Inventory.js';
import BinInventory from '../../models/BinInventory.js';
import InventoryBatch from '../../models/InventoryBatch.js';
import InventorySerial from '../../models/InventorySerial.js';
import InventoryCostLayer from '../../models/InventoryCostLayer.js';
import Product from '../../models/Product.js';
import InventoryIntegrityReport from '../../models/InventoryIntegrityReport.js';
import { publishInventoryUpdated } from '../../realtime/publisher.js';
import { logInventoryMutation } from '../../observability/inventoryMutationLogger.js';

const EPSILON = 1e-9;
const DEFAULT_MAX_FINDINGS = 200;
const SERIAL_ACTIVE_STATUSES = ['AVAILABLE', 'RESERVED'];

const toId = (value) => String(value || '');

const toKey = ({ organizationId, warehouseId, productId }) =>
  `${toId(organizationId)}:${toId(warehouseId)}:${toId(productId)}`;

const isDifferent = (a, b) =>
  Math.abs(Number(a || 0) - Number(b || 0)) > EPSILON;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const buildInventoryMatch = (organizationId) => {
  if (!organizationId) return {};
  return {
    organization: new mongoose.Types.ObjectId(String(organizationId))
  };
};

const buildDimensionFilter = ({ organizationId, productIds, warehouseIds }) => {
  const filter = {};
  if (organizationId) {
    filter.organization = new mongoose.Types.ObjectId(String(organizationId));
  }
  if (productIds.length) {
    filter.product = {
      $in: productIds.map((value) => new mongoose.Types.ObjectId(value))
    };
  }
  if (warehouseIds.length) {
    filter.warehouse = {
      $in: warehouseIds.map((value) => new mongoose.Types.ObjectId(value))
    };
  }
  return filter;
};

const mapAggregateRows = (rows = []) => {
  const map = new Map();
  for (const row of rows) {
    const key = toKey({
      organizationId: row._id.organization,
      warehouseId: row._id.warehouse,
      productId: row._id.product
    });
    map.set(key, {
      onHand: Number(row.onHand || 0),
      reserved: Number(row.reserved || 0),
      count: Number(row.count || 0)
    });
  }
  return map;
};

const getAutoFixCandidate = ({ serialSummary, batchSummary, binSummary }) => {
  if (serialSummary && serialSummary.count > 0) {
    return {
      source: 'SERIAL',
      quantityOnHand: Math.max(Number(serialSummary.onHand || 0), 0),
      quantityReserved: Math.max(Number(serialSummary.reserved || 0), 0)
    };
  }

  if (batchSummary && batchSummary.count > 0) {
    return {
      source: 'BATCH',
      quantityOnHand: Math.max(Number(batchSummary.onHand || 0), 0),
      quantityReserved: Math.max(Number(batchSummary.reserved || 0), 0)
    };
  }

  if (binSummary && binSummary.count > 0) {
    return {
      source: 'BIN',
      quantityOnHand: Math.max(Number(binSummary.onHand || 0), 0),
      quantityReserved: Math.max(Number(binSummary.reserved || 0), 0)
    };
  }

  return null;
};

const toObjectIdOrNull = (value) =>
  mongoose.Types.ObjectId.isValid(String(value || ''))
    ? new mongoose.Types.ObjectId(String(value))
    : null;

export const runInventoryIntegrityCheck = async ({
  organizationId = null,
  maxFindings = DEFAULT_MAX_FINDINGS,
  autoFix = false,
  actorUserId = null
} = {}) => {
  const safeMaxFindings = parsePositiveInteger(
    maxFindings,
    DEFAULT_MAX_FINDINGS
  );
  const inventoryMatch = buildInventoryMatch(organizationId);

  const inventories = await Inventory.find(inventoryMatch)
    .select(
      '_id organization warehouse product quantityOnHand quantityReserved lastMovementAt'
    )
    .lean();

  if (!inventories.length) {
    return {
      checkedAt: new Date().toISOString(),
      organizationId: organizationId ? String(organizationId) : null,
      inventoryRecordsChecked: 0,
      driftCount: 0,
      autoFixAppliedCount: 0,
      findings: [],
      issueCounts: {}
    };
  }

  const productIds = [...new Set(inventories.map((row) => toId(row.product)))];
  const warehouseIds = [
    ...new Set(inventories.map((row) => toId(row.warehouse)))
  ];
  const sharedFilter = buildDimensionFilter({
    organizationId,
    productIds,
    warehouseIds
  });

  const [binRows, batchRows, serialRows, costLayerRows] = await Promise.all([
    BinInventory.aggregate([
      { $match: sharedFilter },
      {
        $group: {
          _id: {
            organization: '$organization',
            warehouse: '$warehouse',
            product: '$product'
          },
          onHand: { $sum: '$quantityOnHand' },
          reserved: { $sum: '$quantityReserved' },
          count: { $sum: 1 }
        }
      }
    ]),
    InventoryBatch.aggregate([
      { $match: sharedFilter },
      {
        $group: {
          _id: {
            organization: '$organization',
            warehouse: '$warehouse',
            product: '$product'
          },
          onHand: { $sum: '$quantityOnHand' },
          reserved: { $sum: '$quantityReserved' },
          count: { $sum: 1 }
        }
      }
    ]),
    InventorySerial.aggregate([
      {
        $match: {
          ...sharedFilter,
          status: { $in: SERIAL_ACTIVE_STATUSES }
        }
      },
      {
        $group: {
          _id: {
            organization: '$organization',
            warehouse: '$warehouse',
            product: '$product'
          },
          onHand: { $sum: 1 },
          reserved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'RESERVED'] }, 1, 0]
            }
          },
          count: { $sum: 1 }
        }
      }
    ]),
    InventoryCostLayer.aggregate([
      {
        $match: {
          ...sharedFilter,
          quantityRemaining: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: {
            organization: '$organization',
            warehouse: '$warehouse',
            product: '$product'
          },
          onHand: { $sum: '$quantityRemaining' },
          reserved: { $sum: 0 },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const inventoryOnHandByProductKey = new Map();
  for (const inventory of inventories) {
    const productKey = `${toId(inventory.organization)}:${toId(inventory.product)}`;
    const existing = Number(inventoryOnHandByProductKey.get(productKey) || 0);
    inventoryOnHandByProductKey.set(
      productKey,
      existing + Number(inventory.quantityOnHand || 0)
    );
  }

  const productFilter = {
    _id: {
      $in: productIds.map((value) => new mongoose.Types.ObjectId(value))
    }
  };
  if (organizationId) {
    productFilter.organization = new mongoose.Types.ObjectId(
      String(organizationId)
    );
  }

  const products = await Product.find(productFilter)
    .select('_id organization stock')
    .lean();
  const productStockByKey = new Map(
    products.map((row) => [
      `${toId(row.organization)}:${toId(row._id)}`,
      Number(row.stock || 0)
    ])
  );
  const productStockChecked = new Set();

  const binSummaryByKey = mapAggregateRows(binRows);
  const batchSummaryByKey = mapAggregateRows(batchRows);
  const serialSummaryByKey = mapAggregateRows(serialRows);
  const costSummaryByKey = mapAggregateRows(costLayerRows);

  const findings = [];
  const issueCounts = {};
  let driftCount = 0;
  let autoFixAppliedCount = 0;

  for (const inventory of inventories) {
    const key = toKey({
      organizationId: inventory.organization,
      warehouseId: inventory.warehouse,
      productId: inventory.product
    });

    const quantityOnHand = Number(inventory.quantityOnHand || 0);
    const quantityReserved = Number(inventory.quantityReserved || 0);
    const binSummary = binSummaryByKey.get(key) || null;
    const batchSummary = batchSummaryByKey.get(key) || null;
    const serialSummary = serialSummaryByKey.get(key) || null;
    const costSummary = costSummaryByKey.get(key) || null;
    const productKey = `${toId(inventory.organization)}:${toId(inventory.product)}`;

    const finding = {
      inventoryId: toId(inventory._id),
      organizationId: toId(inventory.organization),
      warehouseId: toId(inventory.warehouse),
      productId: toId(inventory.product),
      quantityOnHand,
      quantityReserved,
      issues: []
    };

    if (quantityOnHand < 0) {
      finding.issues.push({
        code: 'NEGATIVE_ON_HAND',
        severity: 'critical',
        expected: '>= 0',
        actual: quantityOnHand
      });
    }

    if (quantityReserved < 0) {
      finding.issues.push({
        code: 'NEGATIVE_RESERVED',
        severity: 'critical',
        expected: '>= 0',
        actual: quantityReserved
      });
    }

    if (quantityReserved > quantityOnHand) {
      finding.issues.push({
        code: 'RESERVED_EXCEEDS_ON_HAND',
        severity: 'high',
        expected: '<= quantityOnHand',
        actual: quantityReserved
      });
    }

    if (binSummary) {
      if (isDifferent(binSummary.onHand, quantityOnHand)) {
        finding.issues.push({
          code: 'BIN_ON_HAND_DRIFT',
          severity: 'high',
          source: 'BIN_INVENTORY',
          expected: binSummary.onHand,
          actual: quantityOnHand
        });
      }
      if (isDifferent(binSummary.reserved, quantityReserved)) {
        finding.issues.push({
          code: 'BIN_RESERVED_DRIFT',
          severity: 'medium',
          source: 'BIN_INVENTORY',
          expected: binSummary.reserved,
          actual: quantityReserved
        });
      }
    }

    if (batchSummary) {
      if (isDifferent(batchSummary.onHand, quantityOnHand)) {
        finding.issues.push({
          code: 'BATCH_ON_HAND_DRIFT',
          severity: 'high',
          source: 'INVENTORY_BATCH',
          expected: batchSummary.onHand,
          actual: quantityOnHand
        });
      }
      if (isDifferent(batchSummary.reserved, quantityReserved)) {
        finding.issues.push({
          code: 'BATCH_RESERVED_DRIFT',
          severity: 'medium',
          source: 'INVENTORY_BATCH',
          expected: batchSummary.reserved,
          actual: quantityReserved
        });
      }
    }

    if (serialSummary) {
      if (isDifferent(serialSummary.onHand, quantityOnHand)) {
        finding.issues.push({
          code: 'SERIAL_ON_HAND_DRIFT',
          severity: 'high',
          source: 'INVENTORY_SERIAL',
          expected: serialSummary.onHand,
          actual: quantityOnHand
        });
      }

      if (serialSummary.reserved > quantityReserved + EPSILON) {
        finding.issues.push({
          code: 'SERIAL_RESERVED_EXCEEDS_INVENTORY_RESERVED',
          severity: 'medium',
          source: 'INVENTORY_SERIAL',
          expected: `>= ${serialSummary.reserved}`,
          actual: quantityReserved
        });
      }
    }

    if (quantityOnHand > 0 && !costSummary) {
      finding.issues.push({
        code: 'MISSING_COST_LAYERS',
        severity: 'medium',
        source: 'INVENTORY_COST_LAYER',
        expected: '> 0 remaining layer quantity',
        actual: 0
      });
    }

    if (costSummary && costSummary.onHand + EPSILON < quantityOnHand) {
      finding.issues.push({
        code: 'COST_LAYERS_BELOW_ON_HAND',
        severity: 'medium',
        source: 'INVENTORY_COST_LAYER',
        expected: `>= ${quantityOnHand}`,
        actual: costSummary.onHand
      });
    }

    if (!productStockChecked.has(productKey)) {
      productStockChecked.add(productKey);
      if (productStockByKey.has(productKey)) {
        const expectedStock = Number(
          inventoryOnHandByProductKey.get(productKey) || 0
        );
        const actualStock = Number(productStockByKey.get(productKey) || 0);
        if (isDifferent(expectedStock, actualStock)) {
          finding.issues.push({
            code: 'PRODUCT_STOCK_DRIFT',
            severity: 'high',
            source: 'PRODUCT',
            expected: expectedStock,
            actual: actualStock
          });
        }
      }
    }

    if (!finding.issues.length) {
      continue;
    }

    driftCount += 1;
    for (const issue of finding.issues) {
      issueCounts[issue.code] = Number(issueCounts[issue.code] || 0) + 1;
    }

    const hasDriftIssue = finding.issues.some((issue) =>
      issue.code.endsWith('_DRIFT')
    );

    if (autoFix && hasDriftIssue) {
      const candidate = getAutoFixCandidate({
        serialSummary,
        batchSummary,
        binSummary
      });

      if (candidate) {
        const correctedOnHand = Math.max(
          Number(candidate.quantityOnHand || 0),
          0
        );
        const correctedReserved = Math.min(
          Math.max(Number(candidate.quantityReserved || 0), 0),
          correctedOnHand
        );

        if (
          isDifferent(correctedOnHand, quantityOnHand) ||
          isDifferent(correctedReserved, quantityReserved)
        ) {
          await Inventory.findByIdAndUpdate(inventory._id, {
            quantityOnHand: correctedOnHand,
            quantityReserved: correctedReserved,
            lastMovementAt: inventory.lastMovementAt || new Date()
          });

          logInventoryMutation({
            operation: 'inventory_integrity_autofix',
            organizationId: inventory.organization,
            warehouseId: inventory.warehouse,
            productId: inventory.product,
            quantityDelta: correctedOnHand - quantityOnHand,
            quantityOnHand: correctedOnHand,
            quantityReserved: correctedReserved,
            sourceType: 'SYSTEM',
            sourceId: inventory._id,
            actorUserId,
            metadata: {
              source: candidate.source,
              previousOnHand: quantityOnHand,
              previousReserved: quantityReserved
            }
          });

          publishInventoryUpdated({
            organizationId: inventory.organization,
            actorUserId,
            warehouseId: inventory.warehouse,
            entityId: inventory.product,
            data: {
              source: 'inventory_integrity_autofix',
              inventoryId: inventory._id,
              previousOnHand: quantityOnHand,
              previousReserved: quantityReserved,
              quantityOnHand: correctedOnHand,
              quantityReserved: correctedReserved,
              autoFixSource: candidate.source
            }
          });

          autoFixAppliedCount += 1;
          finding.autoFixApplied = true;
          finding.autoFixSource = candidate.source;
          finding.correctedValues = {
            quantityOnHand: correctedOnHand,
            quantityReserved: correctedReserved
          };

          const updatedProductOnHand =
            Number(inventoryOnHandByProductKey.get(productKey) || 0) -
            quantityOnHand +
            correctedOnHand;
          inventoryOnHandByProductKey.set(productKey, updatedProductOnHand);
        }
      }

      const productStockIssue = finding.issues.find(
        (issue) => issue.code === 'PRODUCT_STOCK_DRIFT'
      );
      if (productStockIssue) {
        const expectedProductStock = Math.max(
          Number(inventoryOnHandByProductKey.get(productKey) || 0),
          0
        );
        const productUpdateResult = await Product.findOneAndUpdate(
          {
            _id: inventory.product,
            organization: inventory.organization
          },
          {
            $set: {
              stock: expectedProductStock
            }
          },
          {
            new: true,
            runValidators: true
          }
        );

        if (productUpdateResult) {
          autoFixAppliedCount += 1;
          finding.autoFixApplied = true;
          finding.productStockAutoFixApplied = true;
          finding.productStockCorrectedValue = expectedProductStock;
        }
      }
    }

    if (findings.length < safeMaxFindings) {
      findings.push(finding);
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    organizationId: organizationId ? String(organizationId) : null,
    inventoryRecordsChecked: inventories.length,
    driftCount,
    autoFixAppliedCount,
    findings,
    issueCounts
  };
};

export const persistInventoryIntegrityReport = async ({
  organizationId,
  report,
  sampleLimit = 20
}) => {
  if (!organizationId || !report) {
    return null;
  }

  const sampleFindings = Array.isArray(report.findings)
    ? report.findings.slice(0, sampleLimit).map((finding) => ({
        inventoryId: toObjectIdOrNull(finding.inventoryId),
        productId: toObjectIdOrNull(finding.productId),
        warehouseId: toObjectIdOrNull(finding.warehouseId),
        issueCodes: Array.isArray(finding.issues)
          ? finding.issues.map((issue) => String(issue.code || 'UNKNOWN'))
          : []
      }))
    : [];

  return InventoryIntegrityReport.create({
    organization: organizationId,
    checkedAt: report.checkedAt ? new Date(report.checkedAt) : new Date(),
    inventoryRecordsChecked: Number(report.inventoryRecordsChecked || 0),
    driftCount: Number(report.driftCount || 0),
    issueCounts: report.issueCounts || {},
    autoFixAppliedCount: Number(report.autoFixAppliedCount || 0),
    sampleFindings
  });
};

export const getInventoryIntegrityHistory = async ({
  organizationId,
  days = 30,
  limit = 50
}) => {
  const parsedDays = Math.min(Math.max(Number(days) || 30, 1), 365);
  const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const fromDate = new Date(Date.now() - parsedDays * 24 * 60 * 60 * 1000);

  return InventoryIntegrityReport.find({
    organization: organizationId,
    checkedAt: { $gte: fromDate }
  })
    .sort({ checkedAt: -1 })
    .limit(parsedLimit)
    .lean();
};

export default {
  runInventoryIntegrityCheck,
  persistInventoryIntegrityReport,
  getInventoryIntegrityHistory
};
