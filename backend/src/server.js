import dotenv from 'dotenv';
import { createServer } from 'node:http';

import app from './app.js';
import { connectDB, disconnectDB } from './config/dbConfig.js';
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
  getRuntimeConfig,
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

const runtimeConfig = getRuntimeConfig();
const PORT = runtimeConfig.port;
const SHUTDOWN_TIMEOUT_MS = runtimeConfig.shutdownTimeoutMs;

const closeSocketServer = (io) =>
  new Promise((resolve) => {
    if (!io) {
      resolve();
      return;
    }
    io.disconnectSockets(true);
    io.close(() => resolve());
  });

const closeHttpServer = (httpServer) =>
  new Promise((resolve, reject) => {
    if (!httpServer.listening) {
      resolve();
      return;
    }
    httpServer.close((error) => {
      if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') {
        reject(error);
        return;
      }
      resolve();
    });
    httpServer.closeIdleConnections?.();
  });

const scheduledJobsEnabled = runtimeConfig.scheduledJobsEnabled;

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
      runtimeConfig.isProduction &&
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
      runtimeConfig.isProduction &&
      runtimeConfig.realtimeEnabled &&
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

    if (scheduledJobsEnabled) {
      autoSendPurchaseOrdersJob();
      autoClosePurchaseOrdersJob();

      startInventoryReportCron();
      startInventoryMetricsCron();
      startInventoryIntegrityCron();
      startForecastGenerationCron();
      startForecastReorderCron();
      logger.info('scheduled_jobs_started');
    } else {
      logger.info('scheduled_jobs_skipped', {
        reason: 'RUN_SCHEDULED_JOBS is not enabled for this process'
      });
    }

    httpServer.listen(PORT, () => {
      logger.info('server_started', {
        port: PORT,
        nodeEnv: runtimeConfig.nodeEnv,
        httpTimeouts: httpServerTimeoutConfig
      });
    });

    let shutdownStarted = false;
    const shutdown = async (signal) => {
      if (shutdownStarted) return;
      shutdownStarted = true;

      logger.info('server_shutdown_started', { signal });
      const forceExitTimer = setTimeout(() => {
        logger.error('server_shutdown_timeout', {
          signal,
          timeoutMs: SHUTDOWN_TIMEOUT_MS
        });
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
      forceExitTimer.unref();

      try {
        await closeSocketServer(io);
        await closeHttpServer(httpServer);
        await shutdownBackgroundJobQueue();
        await disconnectSocketRedisAdapter();
        await disconnectRateLimitStore();
        await disconnectDB();
        await flushErrorTracker();
        clearTimeout(forceExitTimer);
        logger.info('server_shutdown_completed', { signal });
        process.exit(0);
      } catch (error) {
        clearTimeout(forceExitTimer);
        logger.error('server_shutdown_failed', { signal, err: error });
        await captureException(error, { scope: 'shutdown', signal });
        await flushErrorTracker();
        process.exit(1);
      }
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('server_start_failed', {
      err: error
    });
    await captureException(error, { scope: 'bootstrap' });
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
