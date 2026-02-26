import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import Organization from '../src/models/Organization.js';
import { syncOrganizationProductStockFromInventory } from '../src/services/inventory/stockSyncService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env'), override: true });

const normalizeDbUrl = (rawValue) => {
  if (!rawValue) return '';
  const trimmed = String(rawValue).trim();
  return trimmed.replace(/^['"]|['"]$/g, '');
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
  if (explicitDbUrl && !explicitDbUrl.includes('${')) return explicitDbUrl;
  return buildDbUrlFromParts() || explicitDbUrl;
};

const DB_URL = resolveDbUrl();
const DRY_RUN =
  String(process.env.MIGRATION_DRY_RUN || 'true')
    .trim()
    .toLowerCase() === 'true';

async function run() {
  if (!DB_URL) {
    throw new Error('DB_URL is required to run syncProductStockFromInventory');
  }

  if (
    !DB_URL.startsWith('mongodb://') &&
    !DB_URL.startsWith('mongodb+srv://')
  ) {
    throw new Error(
      'DB_URL has invalid scheme. Current value must start with "mongodb://" or "mongodb+srv://"'
    );
  }

  await mongoose.connect(DB_URL);
  console.log(
    `Connected to database (${DRY_RUN ? 'dry-run' : 'write mode'}) for stock sync`
  );

  const organizations = await Organization.find({ isActive: true })
    .select('_id code')
    .lean();

  let checkedProducts = 0;
  let updatesNeeded = 0;
  let updatesApplied = 0;

  for (const organization of organizations) {
    const summary = await syncOrganizationProductStockFromInventory({
      organizationId: organization._id,
      dryRun: DRY_RUN
    });

    checkedProducts += summary.checkedProducts;
    updatesNeeded += summary.updatesNeeded;
    updatesApplied += summary.updatesApplied;

    console.log(
      `[${organization.code || organization._id}] checked=${summary.checkedProducts}, needed=${summary.updatesNeeded}, applied=${summary.updatesApplied}`
    );
  }

  console.log('--- Product Stock Sync Summary ---');
  console.log(`Organizations checked: ${organizations.length}`);
  console.log(`Products checked: ${checkedProducts}`);
  console.log(`Updates needed: ${updatesNeeded}`);
  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}Updates applied: ${updatesApplied}`
  );
}

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('Product stock sync completed');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Product stock sync failed:', err.message);
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  });
