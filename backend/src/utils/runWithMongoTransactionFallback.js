import mongoose from 'mongoose';
import { logger } from '../observability/logger.js';

const isTransactionUnsupported = (err) => {
  const message = String(err?.message || '').toLowerCase();
  return (
    message.includes('transaction numbers are only allowed') ||
    message.includes('replica set') ||
    message.includes('standalone')
  );
};

export const runWithMongoTransactionFallback = async ({
  operationName,
  operationMeta = {},
  runWithSession
}) => {
  const session = await mongoose.startSession();

  try {
    let result;

    try {
      await session.withTransaction(async () => {
        result = await runWithSession(session);
      });
      return result;
    } catch (err) {
      if (!isTransactionUnsupported(err)) {
        logger.error('mongo_transaction_failed', {
          operationName,
          ...operationMeta,
          err
        });
        throw err;
      }

      logger.warn('mongo_transaction_fallback_non_transaction_mode', {
        operationName,
        ...operationMeta
      });

      return runWithSession(null);
    }
  } finally {
    await session.endSession();
  }
};

export default runWithMongoTransactionFallback;
