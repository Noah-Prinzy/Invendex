import dotenv from 'dotenv';
import { createServer } from 'node:http';

import app from './app.js';
import { connectDB } from './config/dbConfig.js';
import { initSocketServer } from './realtime/socketServer.js';
import {
  configureSocketRedisAdapter,
  disconnectSocketRedisAdapter,
  getSocketRedisAdapterStatus
} from './realtime/redisAdapter.js';

import { startInventoryReportCron } from './cron/inventoryReportCron.js';
import { startInventoryMetricsCron } from './cron/inventoryMetricsCron.js';
import { startInventoryIntegrityCron } from './cron/inventoryIntegrityCron.js';
import { startForecastGenerationCron } from './cron/forecastGenerationCron.js';
import { startForecastReorderCron } from './cron/forecastReorderCron.js';

import { autoSendPurchaseOrdersJob } from './jobs/autoSendPurchaseOrders.js';
import { autoClosePurchaseOrdersJob } from './jobs/autoClosePurchaseOrders.js';
import { logger } from './observability/logger.js';
import {
  captureException,
  flushErrorTracker
} from './observability/errorTracker.js';
import {
  getHttpServerTimeoutConfig,
  validateRuntimeEnv
} from './config/envConfig.js';
import { disconnectRateLimitStore } from './middlewares/rateLimitStore.js';
import { raiseOperationalAlert } from './observability/opsAlerting.js';
import {
  getBackgroundJobQueueStatus,
  initializeBackgroundJobQueue,
  shutdownBackgroundJobQueue,
  startBackgroundJobWorker
} from './services/jobs/backgroundQueueService.js';
import { ensureDefaultPlanCatalog } from './services/subscription/subscriptionService.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const normalizeStartupError = (error) => {
  if (!error) return new Error('Unknown startup error');

  const code = String(error.code || '').trim();
  if (code === 'EADDRINUSE') {
    const friendlyError = new Error(
      `Port ${PORT} is already in use. Stop the other process using ${PORT}, then run the dev server again.`
    );
    friendlyError.code = code;
    friendlyError.port = PORT;
    friendlyError.cause = error;
    return friendlyError;
  }

  return error;
};

const startListening = (httpServer, httpServerTimeoutConfig) =>
  new Promise((resolve, reject) => {
    const handleError = (error) => {
      httpServer.off('listening', handleListening);
      reject(normalizeStartupError(error));
    };

    const handleListening = () => {
      httpServer.off('error', handleError);
      logger.info('server_started', {
        port: PORT,
        nodeEnv: NODE_ENV,
        httpTimeouts: httpServerTimeoutConfig
      });
      resolve();
    };

    httpServer.once('error', handleError);
    httpServer.once('listening', handleListening);
    httpServer.listen(PORT);
  });

async function startServer() {
  try {
    validateRuntimeEnv();

    await connectDB();
    await ensureDefaultPlanCatalog();
    await initializeBackgroundJobQueue();
    const inlineWorkerStarted = await startBackgroundJobWorker();
    const backgroundJobQueueStatus = getBackgroundJobQueueStatus();
    if (
      backgroundJobQueueStatus.enabled &&
      backgroundJobQueueStatus.usingBullMq
    ) {
      logger.info('background_job_queue_ready', {
        queueName: backgroundJobQueueStatus.queueName,
        inlineWorkerStarted,
        workerReady: backgroundJobQueueStatus.workerReady
      });
    } else if (backgroundJobQueueStatus.enabled) {
      logger.warn('background_job_queue_fallback_mode', {
        reason: backgroundJobQueueStatus.reason
      });
    }

    if (
      String(process.env.NODE_ENV || 'development') === 'production' &&
      backgroundJobQueueStatus.enabled &&
      !backgroundJobQueueStatus.usingBullMq
    ) {
      await raiseOperationalAlert({
        severity: 'WARN',
        category: 'background_jobs',
        message:
          'Background queue enabled but BullMQ/Redis initialization failed; running inline fallback',
        context: backgroundJobQueueStatus,
        source: 'server_bootstrap'
      });
    }

    const httpServer = createServer(app);
    const httpServerTimeoutConfig = getHttpServerTimeoutConfig();
    httpServer.requestTimeout = httpServerTimeoutConfig.requestTimeoutMs;
    httpServer.headersTimeout = httpServerTimeoutConfig.headersTimeoutMs;
    httpServer.keepAliveTimeout = httpServerTimeoutConfig.keepAliveTimeoutMs;

    const io = await initSocketServer(httpServer);
    await configureSocketRedisAdapter(io);
    const socketRedisStatus = getSocketRedisAdapterStatus();
    if (
      String(process.env.NODE_ENV || 'development') === 'production' &&
      String(process.env.REALTIME_ENABLED || '').toLowerCase() === 'true' &&
      socketRedisStatus.enabled &&
      !socketRedisStatus.connected
    ) {
      await raiseOperationalAlert({
        severity: 'WARN',
        category: 'realtime_scaling',
        message:
          'Realtime Redis adapter not connected in production; cross-instance realtime may degrade',
        context: socketRedisStatus,
        source: 'server_bootstrap'
      });
    }

    await startListening(httpServer, httpServerTimeoutConfig);

    autoSendPurchaseOrdersJob();
    autoClosePurchaseOrdersJob();

    startInventoryReportCron();
    startInventoryMetricsCron();
    startInventoryIntegrityCron();
    startForecastGenerationCron();
    startForecastReorderCron();

    const shutdown = async () => {
      try {
        logger.info('server_shutdown_started');
        await shutdownBackgroundJobQueue();
        await disconnectSocketRedisAdapter();
        await disconnectRateLimitStore();
        await flushErrorTracker();
      } finally {
        process.exit(0);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    const startupError = normalizeStartupError(error);
    logger.error('server_start_failed', {
      err: startupError,
      port: PORT
    });
    await captureException(startupError, { scope: 'bootstrap', port: PORT });
    await flushErrorTracker();
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => {
  logger.error('unhandled_rejection', {
    err: error
  });
  captureException(error, { scope: 'process_unhandled_rejection' }).catch(
    () => {}
  );
});

process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', {
    err: error
  });
  captureException(error, { scope: 'process_uncaught_exception' }).catch(
    () => {}
  );
});

startServer();
