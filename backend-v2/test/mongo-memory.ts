import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

export async function startMongoMemoryServer(): Promise<string> {
  // Unique dbName + dbPath per run so no state leaks between test runs.
  const dbName = `invendex_test_${randomUUID()}`;
  mongod = await MongoMemoryServer.create({
    instance: {
      dbName,
      dbPath: mkdtempSync(join(tmpdir(), 'invendex-mongo-'))
    }
  });
  return mongod.getUri(dbName);
}

export async function stopMongoMemoryServer(): Promise<void> {
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}
