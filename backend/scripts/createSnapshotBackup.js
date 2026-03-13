import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';

import Organization from '../src/models/Organization.js';
import Product from '../src/models/Product.js';
import Warehouse from '../src/models/Warehouse.js';
import PurchaseOrder from '../src/models/PurchaseOrder.js';
import Order from '../src/models/Order.js';
import Inventory from '../src/models/Inventory.js';
import BinInventory from '../src/models/BinInventory.js';
import InventoryBatch from '../src/models/InventoryBatch.js';
import InventorySerial from '../src/models/InventorySerial.js';
import InventoryCostLayer from '../src/models/InventoryCostLayer.js';
import CogsEntry from '../src/models/CogsEntry.js';
import StockMovement from '../src/models/StockMovement.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env'), override: true });

const normalizeDbUrl = (rawValue) =>
  String(rawValue || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

const buildDbUrlFromParts = () => {
  const host = String(process.env.DB_HOST || '').trim();
  if (!host) return '';

  const port = String(process.env.DB_PORT || '27017').trim();
  const dbName = String(process.env.DB_NAME || 'invendex').trim();
  return `mongodb://${host}:${port}/${dbName}`;
};

const resolveDbUrl = () => {
  const explicitDbUrl = normalizeDbUrl(process.env.DB_URL);
  if (explicitDbUrl && !explicitDbUrl.includes('${')) return explicitDbUrl;
  return buildDbUrlFromParts() || explicitDbUrl;
};

const getSnapshotTag = () => new Date().toISOString().replace(/[:.]/g, '-');

const modelTargets = [
  { key: 'organizations', model: Organization },
  { key: 'products', model: Product },
  { key: 'warehouses', model: Warehouse },
  { key: 'purchase_orders', model: PurchaseOrder },
  { key: 'orders', model: Order },
  { key: 'inventory', model: Inventory },
  { key: 'bin_inventory', model: BinInventory },
  { key: 'inventory_batches', model: InventoryBatch },
  { key: 'inventory_serials', model: InventorySerial },
  { key: 'inventory_cost_layers', model: InventoryCostLayer },
  { key: 'cogs_entries', model: CogsEntry },
  { key: 'stock_movements', model: StockMovement }
];

const hasOrganizationField = (model) =>
  Boolean(model?.schema?.paths?.organization);

const ensureDirectory = (targetPath) => {
  fs.mkdirSync(targetPath, { recursive: true });
};

const serializeQuery = (query) => {
  try {
    return JSON.stringify(query);
  } catch {
    return '{}';
  }
};

const createSnapshotForModel = async ({
  target,
  outputDir,
  organizationId
}) => {
  const query = {};
  if (organizationId && hasOrganizationField(target.model)) {
    query.organization = organizationId;
  }

  const outputFile = `${target.key}.jsonl`;
  const outputPath = path.join(outputDir, outputFile);
  const hash = crypto.createHash('sha256');

  let count = 0;
  const stream = fs.createWriteStream(outputPath, {
    encoding: 'utf8'
  });

  const cursor = target.model.find(query).lean().cursor();
  for await (const doc of cursor) {
    const line = `${JSON.stringify(doc)}\n`;
    hash.update(line);
    stream.write(line);
    count += 1;
  }

  await new Promise((resolve, reject) => {
    stream.end((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  return {
    collection: target.key,
    model: target.model.modelName,
    count,
    query,
    queryJson: serializeQuery(query),
    file: outputFile,
    sha256: hash.digest('hex')
  };
};

async function run() {
  const dbUrl = resolveDbUrl();
  if (!dbUrl) {
    throw new Error('DB_URL is required for backup:snapshot');
  }

  if (!dbUrl.startsWith('mongodb://') && !dbUrl.startsWith('mongodb+srv://')) {
    throw new Error(
      'DB_URL has invalid scheme. Value must start with "mongodb://" or "mongodb+srv://"'
    );
  }

  const backupRoot = path.resolve(
    projectRoot,
    process.env.BACKUP_OUTPUT_DIR || 'backups/snapshots'
  );
  const organizationId =
    String(process.env.BACKUP_ORGANIZATION_ID || '').trim() || null;

  const snapshotTag = process.env.BACKUP_SNAPSHOT_TAG || getSnapshotTag();
  const snapshotDir = path.join(backupRoot, snapshotTag);
  ensureDirectory(snapshotDir);

  await mongoose.connect(dbUrl);

  const collections = [];
  for (const target of modelTargets) {
    const result = await createSnapshotForModel({
      target,
      outputDir: snapshotDir,
      organizationId
    });

    collections.push(result);
    console.log(
      `[backup] ${target.model.modelName}: ${result.count} document(s) -> ${result.file}`
    );
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    snapshotTag,
    snapshotDir,
    organizationId,
    mongodb: {
      host: mongoose.connection.host || null,
      dbName: mongoose.connection.name || null
    },
    collections
  };

  const manifestPath = path.join(snapshotDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  const totalDocuments = collections.reduce((sum, item) => sum + item.count, 0);
  console.log('--- Snapshot Backup Summary ---');
  console.log(`Snapshot directory: ${snapshotDir}`);
  console.log(`Collections exported: ${collections.length}`);
  console.log(`Total documents exported: ${totalDocuments}`);
  console.log(`Manifest: ${manifestPath}`);
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Snapshot backup failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  });
