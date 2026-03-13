import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import Organization from '../src/models/Organization.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Supplier from '../src/models/Supplier.js';
import SupplierProduct from '../src/models/SupplierProduct.js';
import Warehouse from '../src/models/Warehouse.js';
import WarehouseBin from '../src/models/WarehouseBin.js';
import PurchaseOrder from '../src/models/PurchaseOrder.js';
import Inventory from '../src/models/Inventory.js';
import BinInventory from '../src/models/BinInventory.js';
import InventoryValuationConfig from '../src/models/InventoryValuationConfig.js';
import InventoryCostLayer from '../src/models/InventoryCostLayer.js';
import CogsEntry from '../src/models/CogsEntry.js';
import InventoryBatch from '../src/models/InventoryBatch.js';
import InventorySerial from '../src/models/InventorySerial.js';
import InventorySnapshot from '../src/models/InventorySnapshot.js';
import ReorderAlert from '../src/models/ReorderAlert.js';
import StockMovement from '../src/models/StockMovement.js';
import PickTicket from '../src/models/PickTicket.js';
import AuditLog from '../src/models/AuditLog.js';
import Forecast from '../src/models/Forecast.js';
import ForecastResult from '../src/models/ForecastResult.js';
import InventoryMetrics from '../src/models/InventoryMetrics.js';
import InventoryReport from '../src/models/InventoryReport.js';
import NotificationEvent from '../src/models/NotificationEvent.js';
import Order from '../src/models/Order.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Always prefer backend/.env for this migration to avoid stale shell DB_URL values.
dotenv.config({ path: path.join(projectRoot, '.env'), override: true });

const normalizeDbUrl = (rawValue) => {
  if (!rawValue) return '';

  // Accept values copied with wrapping quotes from shell/.env files.
  const trimmed = String(rawValue).trim();
  return trimmed.replace(/^['"]|['"]$/g, '');
};

const buildDbUrlFromParts = () => {
  const host = String(process.env.DB_HOST || '').trim();
  if (!host) return '';

  const port = String(process.env.DB_PORT || '27017').trim();
  const dbName = String(process.env.DB_NAME || 'invendex').trim();
  return `mongodb://${host}:${port}/${dbName}`;
};

const resolveDbUrl = () => {
  const explicitDbUrl = normalizeDbUrl(process.env.DB_URL);
  if (explicitDbUrl && !explicitDbUrl.includes('${')) {
    return explicitDbUrl;
  }

  const derivedDbUrl = buildDbUrlFromParts();
  return derivedDbUrl || explicitDbUrl;
};

const DB_URL = resolveDbUrl();
const DRY_RUN =
  String(process.env.MIGRATION_DRY_RUN || '').toLowerCase() === 'true';
const DEFAULT_ORG_NAME =
  process.env.MIGRATION_DEFAULT_ORG_NAME || 'Legacy Organization';
const DEFAULT_ORG_CODE = (
  process.env.MIGRATION_DEFAULT_ORG_CODE || 'LEGACY'
).toUpperCase();

const missingOrganizationFilter = {
  $or: [{ organization: { $exists: false } }, { organization: null }]
};

const migrationTargets = [
  { model: User, name: 'User' },
  { model: Product, name: 'Product' },
  { model: Supplier, name: 'Supplier' },
  { model: SupplierProduct, name: 'SupplierProduct' },
  { model: Warehouse, name: 'Warehouse' },
  { model: WarehouseBin, name: 'WarehouseBin' },
  { model: PurchaseOrder, name: 'PurchaseOrder' },
  { model: Inventory, name: 'Inventory' },
  { model: BinInventory, name: 'BinInventory' },
  { model: InventoryValuationConfig, name: 'InventoryValuationConfig' },
  { model: InventoryCostLayer, name: 'InventoryCostLayer' },
  { model: CogsEntry, name: 'CogsEntry' },
  { model: InventoryBatch, name: 'InventoryBatch' },
  { model: InventorySerial, name: 'InventorySerial' },
  { model: InventorySnapshot, name: 'InventorySnapshot' },
  { model: ReorderAlert, name: 'ReorderAlert' },
  { model: StockMovement, name: 'StockMovement' },
  { model: PickTicket, name: 'PickTicket' },
  { model: AuditLog, name: 'AuditLog' },
  { model: Forecast, name: 'Forecast' },
  { model: ForecastResult, name: 'ForecastResult' },
  { model: InventoryMetrics, name: 'InventoryMetrics' },
  { model: InventoryReport, name: 'InventoryReport' },
  { model: NotificationEvent, name: 'NotificationEvent' },
  { model: Order, name: 'Order' }
];

async function upsertDefaultOrganization() {
  if (DRY_RUN) {
    const existing = await Organization.findOne({
      code: DEFAULT_ORG_CODE
    }).lean();

    if (existing) {
      console.log(
        `[dry-run] Using existing organization ${existing._id} (${existing.code})`
      );
      return existing;
    }

    console.log(
      `[dry-run] Would create organization { name: "${DEFAULT_ORG_NAME}", code: "${DEFAULT_ORG_CODE}" }`
    );
    return {
      _id: new mongoose.Types.ObjectId(),
      name: DEFAULT_ORG_NAME,
      code: DEFAULT_ORG_CODE
    };
  }

  const organization = await Organization.findOneAndUpdate(
    { code: DEFAULT_ORG_CODE },
    {
      $setOnInsert: {
        name: DEFAULT_ORG_NAME,
        code: DEFAULT_ORG_CODE,
        isActive: true
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  console.log(`Using organization ${organization._id} (${organization.code})`);
  return organization;
}

async function backfillOrganizationField({ model, name, organizationId }) {
  const pendingCount = await model.countDocuments(missingOrganizationFilter);

  if (pendingCount === 0) {
    console.log(`${name}: no documents need backfill`);
    return { pendingCount: 0, modifiedCount: 0 };
  }

  if (DRY_RUN) {
    console.log(
      `[dry-run] ${name}: would backfill ${pendingCount} document(s)`
    );
    return { pendingCount, modifiedCount: 0 };
  }

  const updateResult = await model.updateMany(missingOrganizationFilter, {
    $set: { organization: organizationId }
  });

  console.log(
    `${name}: backfilled ${updateResult.modifiedCount}/${pendingCount}`
  );

  return {
    pendingCount,
    modifiedCount: updateResult.modifiedCount
  };
}

async function reconcileReorderAlertIndexes() {
  const indexes = await ReorderAlert.collection.indexes();

  const staleIndexes = indexes.filter((indexDef) => {
    const key = indexDef.key || {};
    const hasLegacyKey =
      Number(key.product) === 1 &&
      Number(key.triggeredAt) === 1 &&
      !Object.prototype.hasOwnProperty.call(key, 'warehouse');

    return (
      indexDef.name === 'product_1_triggeredAt_1' ||
      indexDef.name === 'organization_1_product_1_triggeredAt_1_resolved_1' ||
      hasLegacyKey
    );
  });

  if (!staleIndexes.length) {
    console.log('ReorderAlert indexes: no stale indexes detected');
    if (!DRY_RUN) {
      await ReorderAlert.syncIndexes();
    }
    return;
  }

  const staleNames = staleIndexes.map((indexDef) => indexDef.name);

  if (DRY_RUN) {
    console.log(
      `[dry-run] ReorderAlert indexes: would drop stale index(es): ${staleNames.join(', ')}`
    );
    return;
  }

  for (const indexName of staleNames) {
    await ReorderAlert.collection.dropIndex(indexName);
  }

  await ReorderAlert.syncIndexes();
  console.log(
    `ReorderAlert indexes: dropped stale index(es) and synced schema indexes (${staleNames.join(', ')})`
  );
}

async function syncStrictTenantIndexes() {
  const modelsToSync = [
    { model: SupplierProduct, name: 'SupplierProduct' },
    { model: InventorySnapshot, name: 'InventorySnapshot' },
    { model: ReorderAlert, name: 'ReorderAlert' },
    { model: WarehouseBin, name: 'WarehouseBin' },
    { model: BinInventory, name: 'BinInventory' },
    { model: InventoryValuationConfig, name: 'InventoryValuationConfig' },
    { model: InventoryCostLayer, name: 'InventoryCostLayer' },
    { model: CogsEntry, name: 'CogsEntry' },
    { model: InventoryBatch, name: 'InventoryBatch' },
    { model: InventorySerial, name: 'InventorySerial' },
    { model: PickTicket, name: 'PickTicket' },
    { model: StockMovement, name: 'StockMovement' },
    { model: AuditLog, name: 'AuditLog' },
    { model: NotificationEvent, name: 'NotificationEvent' }
  ];

  if (DRY_RUN) {
    console.log(
      `[dry-run] Would sync strict tenant indexes for: ${modelsToSync
        .map((entry) => entry.name)
        .join(', ')}`
    );
    return;
  }

  for (const entry of modelsToSync) {
    await entry.model.syncIndexes();
    console.log(`${entry.name}: indexes synced`);
  }
}

async function run() {
  if (!DB_URL) {
    throw new Error('DB_URL is required to run migrate:tenant');
  }

  if (
    !DB_URL.startsWith('mongodb://') &&
    !DB_URL.startsWith('mongodb+srv://')
  ) {
    throw new Error(
      `DB_URL has invalid scheme. Current value must start with "mongodb://" or "mongodb+srv://".`
    );
  }

  await mongoose.connect(DB_URL);
  console.log(`Connected to database (${DRY_RUN ? 'dry-run' : 'write mode'})`);

  await reconcileReorderAlertIndexes();

  const organization = await upsertDefaultOrganization();
  const organizationId = organization._id;

  const summary = [];
  for (const target of migrationTargets) {
    const result = await backfillOrganizationField({
      ...target,
      organizationId
    });
    summary.push({ ...target, ...result });
  }

  const totalPending = summary.reduce(
    (sum, item) => sum + item.pendingCount,
    0
  );
  const totalModified = summary.reduce(
    (sum, item) => sum + item.modifiedCount,
    0
  );

  console.log('--- Migration Summary ---');
  console.log(`Collections checked: ${summary.length}`);
  console.log(`Documents pending backfill: ${totalPending}`);
  console.log(`Documents updated: ${totalModified}`);

  await syncStrictTenantIndexes();
}

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('Migration completed');
    process.exit(0);
  })
  .catch(async (err) => {
    if (err?.code === 'ENOTFOUND') {
      console.error(
        'Migration failed: Could not resolve MongoDB host. Verify DB_URL uses a real Atlas cluster hostname.'
      );
    } else {
      console.error('Migration failed:', err.message);
    }
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  });
