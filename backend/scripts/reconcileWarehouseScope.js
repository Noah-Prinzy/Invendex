import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import AuditLog from '../src/models/AuditLog.js';
import NotificationEvent from '../src/models/NotificationEvent.js';
import ReorderAlert from '../src/models/ReorderAlert.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env'), override: true });

const normalizeDbUrl = (rawValue) => {
  if (!rawValue) return '';
  return String(rawValue)
    .trim()
    .replace(/^['"]|['"]$/g, '');
};

const buildDbUrlFromParts = () => {
  const host = String(process.env.DB_HOST || '').trim();
  if (!host) return '';

  const port = String(process.env.DB_PORT || '27017').trim();
  const dbName = String(process.env.DB_NAME || 'ledgerly').trim();
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
  String(process.env.MIGRATION_DRY_RUN || '')
    .trim()
    .toLowerCase() === 'true';

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (!mongoose.Types.ObjectId.isValid(String(value))) return null;
  return new mongoose.Types.ObjectId(String(value));
};

const getNestedValue = (source, pathExpression) =>
  String(pathExpression || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, segment) => current?.[segment], source);

const resolveWarehouseCandidate = (document, candidatePaths) => {
  for (const candidatePath of candidatePaths) {
    const value = getNestedValue(document, candidatePath);
    const objectId = toObjectId(value);
    if (objectId) return objectId;
  }

  return null;
};

const isLegacyReorderAlertIndex = (indexDef) => {
  const key = indexDef?.key || {};
  const hasProduct = Number(key.product) === 1;
  const hasTriggeredAt = Number(key.triggeredAt) === 1;
  const hasWarehouse = Object.prototype.hasOwnProperty.call(key, 'warehouse');

  if (!hasProduct || !hasTriggeredAt || hasWarehouse) {
    return false;
  }

  return (
    indexDef?.name === 'product_1_triggeredAt_1' ||
    indexDef?.name === 'organization_1_product_1_triggeredAt_1_resolved_1' ||
    Number(key.resolved) === 1
  );
};

async function reconcileReorderAlertIndexes() {
  const indexes = await ReorderAlert.collection.indexes();
  const staleIndexes = indexes.filter(isLegacyReorderAlertIndex);

  if (!staleIndexes.length) {
    console.log('ReorderAlert: no stale warehouse-missing indexes detected');
    if (!DRY_RUN) {
      await ReorderAlert.syncIndexes();
    }
    return;
  }

  const staleNames = staleIndexes.map((indexDef) => indexDef.name);

  if (DRY_RUN) {
    console.log(
      `[dry-run] ReorderAlert: would drop stale index(es): ${staleNames.join(', ')}`
    );
    return;
  }

  for (const indexName of staleNames) {
    await ReorderAlert.collection.dropIndex(indexName);
  }

  await ReorderAlert.syncIndexes();
  console.log(
    `ReorderAlert: dropped stale index(es) and synced schema indexes (${staleNames.join(', ')})`
  );
}

async function backfillWarehouseField({
  model,
  name,
  candidatePaths,
  selectFields
}) {
  const missingWarehouseQuery = {
    $or: [{ warehouse: { $exists: false } }, { warehouse: null }]
  };

  let scanned = 0;
  let matched = 0;
  let updated = 0;

  const cursor = model
    .find(missingWarehouseQuery)
    .select(selectFields)
    .cursor();

  for await (const document of cursor) {
    scanned += 1;
    const warehouseId = resolveWarehouseCandidate(document, candidatePaths);
    if (!warehouseId) continue;

    matched += 1;
    if (DRY_RUN) continue;

    const updateResult = await model.updateOne(
      {
        _id: document._id,
        $or: [{ warehouse: { $exists: false } }, { warehouse: null }]
      },
      { $set: { warehouse: warehouseId } }
    );

    updated += Number(updateResult.modifiedCount || 0);
  }

  if (DRY_RUN) {
    console.log(
      `[dry-run] ${name}: scanned ${scanned}, found ${matched} warehouse-backed record(s) to update`
    );
  } else {
    console.log(
      `${name}: scanned ${scanned}, backfilled ${updated}/${matched} warehouse-backed record(s)`
    );
  }

  if (!DRY_RUN) {
    await model.syncIndexes();
    console.log(`${name}: indexes synced`);
  }
}

async function run() {
  if (!DB_URL) {
    throw new Error('DB_URL is required to run migrate:warehouse-scope');
  }

  if (
    !DB_URL.startsWith('mongodb://') &&
    !DB_URL.startsWith('mongodb+srv://')
  ) {
    throw new Error(
      'DB_URL has invalid scheme. Current value must start with "mongodb://" or "mongodb+srv://".'
    );
  }

  await mongoose.connect(DB_URL);
  console.log(`Connected to database (${DRY_RUN ? 'dry-run' : 'write mode'})`);

  await reconcileReorderAlertIndexes();

  await backfillWarehouseField({
    model: NotificationEvent,
    name: 'NotificationEvent',
    candidatePaths: [
      'metadata.warehouseId',
      'metadata.warehouse',
      'metadata.warehouse._id'
    ],
    selectFields: '_id warehouse metadata'
  });

  await backfillWarehouseField({
    model: AuditLog,
    name: 'AuditLog',
    candidatePaths: [
      'meta.warehouseId',
      'meta.warehouse',
      'meta.warehouse._id',
      'before.warehouseId',
      'before.warehouse',
      'before.warehouse._id',
      'after.warehouseId',
      'after.warehouse',
      'after.warehouse._id'
    ],
    selectFields: '_id warehouse meta before after'
  });
}

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('Warehouse scope reconciliation completed');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Warehouse scope reconciliation failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  });
