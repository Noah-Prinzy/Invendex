import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env'), override: true });

const normalizeDbUrl = rawValue =>
  String(rawValue || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

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

const parseBoolean = (value, defaultValue = false) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return defaultValue;
  return raw === 'true' || raw === '1' || raw === 'yes';
};

const parseManifest = manifestPath => {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest not found: ${manifestPath}`);
  }

  const raw = fs.readFileSync(manifestPath, 'utf8');
  return JSON.parse(raw);
};

const resolveDefaultManifestPath = () => {
  const backupRoot = path.resolve(
    projectRoot,
    process.env.BACKUP_OUTPUT_DIR || 'backups/snapshots'
  );

  if (!fs.existsSync(backupRoot)) {
    throw new Error(`Backup directory does not exist: ${backupRoot}`);
  }

  const candidates = fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => b.localeCompare(a));

  if (!candidates.length) {
    throw new Error(`No snapshot directories found in ${backupRoot}`);
  }

  const latestDir = candidates[0];
  const manifestPath = path.join(backupRoot, latestDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest missing in latest snapshot directory: ${latestDir}`);
  }

  return manifestPath;
};

const parseJsonLines = async filePath => {
  const hash = crypto.createHash('sha256');
  const documents = [];
  let lineCount = 0;

  const stream = fs.createReadStream(filePath, {
    encoding: 'utf8'
  });
  const reader = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  for await (const line of reader) {
    if (!line.trim()) continue;

    lineCount += 1;
    hash.update(`${line}\n`);
    try {
      documents.push(JSON.parse(line));
    } catch (error) {
      throw new Error(`Invalid JSONL at ${filePath}, line ${lineCount}: ${error.message}`);
    }
  }

  return {
    documents,
    count: lineCount,
    sha256: hash.digest('hex')
  };
};

const chunkArray = (values, chunkSize) => {
  const chunks = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
};

const insertDocumentsInChunks = async ({
  db,
  collectionName,
  documents,
  chunkSize = 500
}) => {
  const collection = db.collection(collectionName);
  let insertedCount = 0;

  const chunks = chunkArray(documents, chunkSize);
  for (const chunk of chunks) {
    if (!chunk.length) continue;
    const result = await collection.insertMany(chunk, { ordered: true });
    insertedCount += Object.keys(result.insertedIds || {}).length;
  }

  return insertedCount;
};

async function run() {
  const dbUrl = resolveDbUrl();
  if (!dbUrl) {
    throw new Error('DB_URL is required for backup:simulate-restore');
  }

  if (
    !dbUrl.startsWith('mongodb://') &&
    !dbUrl.startsWith('mongodb+srv://')
  ) {
    throw new Error(
      'DB_URL has invalid scheme. Value must start with "mongodb://" or "mongodb+srv://"'
    );
  }

  const explicitManifestPath = process.argv[2];
  const manifestPath = explicitManifestPath
    ? path.resolve(projectRoot, explicitManifestPath)
    : resolveDefaultManifestPath();

  const manifest = parseManifest(manifestPath);
  if (!Array.isArray(manifest.collections) || !manifest.collections.length) {
    throw new Error(`Manifest has no collection entries: ${manifestPath}`);
  }

  const shouldWrite = parseBoolean(process.env.SIMULATE_RESTORE_WRITE, false);
  const shouldCleanup = parseBoolean(process.env.SIMULATE_RESTORE_CLEANUP, true);
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const createdCollections = [];

  await mongoose.connect(dbUrl);
  const db = mongoose.connection.db;

  const collectionResults = [];
  for (const entry of manifest.collections) {
    const sourceFile = path.resolve(manifest.snapshotDir, entry.file);
    if (!fs.existsSync(sourceFile)) {
      throw new Error(`Snapshot file missing: ${sourceFile}`);
    }

    const parsed = await parseJsonLines(sourceFile);
    if (parsed.count !== Number(entry.count || 0)) {
      throw new Error(
        `Count mismatch for ${entry.collection}: manifest=${entry.count}, actual=${parsed.count}`
      );
    }
    if (String(parsed.sha256) !== String(entry.sha256)) {
      throw new Error(`Checksum mismatch for ${entry.collection}`);
    }

    let insertedCount = 0;
    let restoreCollectionName = null;
    if (shouldWrite && parsed.documents.length) {
      restoreCollectionName = `restore_sim_${runId}_${entry.collection}`;
      insertedCount = await insertDocumentsInChunks({
        db,
        collectionName: restoreCollectionName,
        documents: parsed.documents
      });
      createdCollections.push(restoreCollectionName);
    }

    collectionResults.push({
      collection: entry.collection,
      count: parsed.count,
      checksumVerified: true,
      restoreCollectionName,
      insertedCount
    });

    console.log(
      `[restore-sim] ${entry.collection}: verified ${parsed.count} document(s)` +
        (shouldWrite ? `, inserted ${insertedCount}` : '')
    );
  }

  if (shouldWrite && shouldCleanup && createdCollections.length) {
    for (const collectionName of createdCollections) {
      await db.dropCollection(collectionName);
    }
    console.log(
      `[restore-sim] cleaned up ${createdCollections.length} restore simulation collection(s)`
    );
  }

  console.log('--- Restore Simulation Summary ---');
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Collections verified: ${collectionResults.length}`);
  console.log(`Write mode: ${shouldWrite ? 'enabled' : 'disabled'}`);
  console.log(`Cleanup mode: ${shouldCleanup ? 'enabled' : 'disabled'}`);
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async error => {
    console.error('Restore simulation failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  });
