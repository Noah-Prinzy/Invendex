import dotenv from 'dotenv';
import { createServer } from 'node:http';

import app from './app.js';
import { connectDB } from './config/dbConfig.js';
import { initSocketServer } from './realtime/socketServer.js';
import {
  configureSocketRedisAdapter,
  disconnectSocketRedisAdapter
} from './realtime/redisAdapter.js';

import { startInventoryReportCron } from './cron/inventoryReportCron.js';
import { startInventoryMetricsCron } from './cron/inventoryMetricsCron.js';
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

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;

async function startServer() {
  try {
    validateRuntimeEnv();

    await connectDB();

    const httpServer = createServer(app);
    const httpServerTimeoutConfig = getHttpServerTimeoutConfig();
    httpServer.requestTimeout = httpServerTimeoutConfig.requestTimeoutMs;
    httpServer.headersTimeout = httpServerTimeoutConfig.headersTimeoutMs;
    httpServer.keepAliveTimeout = httpServerTimeoutConfig.keepAliveTimeoutMs;

    const io = await initSocketServer(httpServer);
    await configureSocketRedisAdapter(io);

    autoSendPurchaseOrdersJob();
    autoClosePurchaseOrdersJob();

    startInventoryReportCron();
    startInventoryMetricsCron();
    startForecastGenerationCron();
    startForecastReorderCron();

    httpServer.listen(PORT, () => {
      logger.info('server_started', {
        port: PORT,
        nodeEnv: process.env.NODE_ENV || 'development',
        httpTimeouts: httpServerTimeoutConfig
      });
    });

    const shutdown = async () => {
      try {
        logger.info('server_shutdown_started');
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
