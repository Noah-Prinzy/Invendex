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

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;

async function startServer() {
  try {
    await connectDB();

    const httpServer = createServer(app);
    const io = await initSocketServer(httpServer);
    await configureSocketRedisAdapter(io);

    autoSendPurchaseOrdersJob();
    autoClosePurchaseOrdersJob();

    startInventoryReportCron();
    startInventoryMetricsCron();
    startForecastGenerationCron();
    startForecastReorderCron();

    httpServer.listen(PORT, () => {
      console.log(`Ledgerly backend running on port ${PORT}`);
    });

    const shutdown = async () => {
      try {
        await disconnectSocketRedisAdapter();
      } finally {
        process.exit(0);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
}

startServer();
