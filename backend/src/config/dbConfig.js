import mongoose from 'mongoose';
import { logger } from '../observability/logger.js';
import { enableMongoProfiling } from '../observability/mongoProfiler.js';

const normalizeDbUrl = (value) =>
  String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

export async function connectDB() {
  const uri = normalizeDbUrl(process.env.DB_URL);
  if (!uri) {
    throw new Error('DB_URL not set');
  }

  if (uri.includes('${')) {
    throw new Error(
      'DB_URL contains unresolved template variables. Use a full MongoDB connection string.'
    );
  }

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error(
      'DB_URL has invalid scheme. Value must start with "mongodb://" or "mongodb+srv://".'
    );
  }

  await mongoose.connect(uri);
  enableMongoProfiling();
  logger.info('database_connected');
}

export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  logger.info('database_disconnected');
}
