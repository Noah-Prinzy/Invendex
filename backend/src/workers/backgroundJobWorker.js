import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/dbConfig.js';
import { validateRuntimeEnv } from '../config/envConfig.js';
import { logger } from '../observability/logger.js';
import {
  getBackgroundJobQueueStatus,
  initializeBackgroundJobQueue,
  shutdownBackgroundJobQueue,
  startBackgroundJobWorker
} from '../services/jobs/backgroundQueueService.js';

dotenv.config();

const startWorker = async () => {
  validateRuntimeEnv();
  await connectDB();

  const queueInitialized = await initializeBackgroundJobQueue();
  if (!queueInitialized) {
    const status = getBackgroundJobQueueStatus();
    throw new Error(
      `Background queue initialization failed (${status.reason || 'unknown'})`
    );
  }

  const workerStarted = await startBackgroundJobWorker({ force: true });
  if (!workerStarted) {
    const status = getBackgroundJobQueueStatus();
    throw new Error(
      `Background worker startup failed (${status.reason || 'unknown'})`
    );
  }

  logger.info('background_job_worker_process_started', {
    queueStatus: getBackgroundJobQueueStatus()
  });
};

const shutdownWorker = async () => {
  try {
    logger.info('background_job_worker_process_shutdown_started');
    await shutdownBackgroundJobQueue();
    await mongoose.connection.close();
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', shutdownWorker);
process.on('SIGTERM', shutdownWorker);

startWorker().catch(async (error) => {
  logger.error('background_job_worker_process_start_failed', {
    err: error
  });
  try {
    await shutdownBackgroundJobQueue();
    await mongoose.connection.close();
  } catch {
    // no-op
  }
  process.exit(1);
});
