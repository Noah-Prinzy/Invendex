import dotenv from 'dotenv';
dotenv.config(); // ⬅️ MUST be before anything else

import app from './app.js';
import { connectDB } from './config/dbConfig.js';
import { rateLimiter } from './middlewares/rateLimiter.js';

// 🕒 Inventory snapshot / report cron
import { startInventoryReportCron } from './cron/inventoryReportCron.js';

// 📊 Inventory metrics cron
import { startInventoryMetricsCron } from './cron/inventoryMetricsCron.js';

// 🔮 Inventory forecast cron
import { startForecastGenerationCron } from './cron/forecastGenerationCron.js';

// 🔔 Static reorder alert cron
import { startInventoryReorderAlertCron } from './cron/inventoryReorderAlertCron.js';

// 🔮 Forecast-aware reorder engine cron
import { startForecastReorderEngineCron } from './cron/forecastReorderEngineCron.js';

// 🔮 Forecast reorder alert cron
import { startForecastReorderAlertCron } from './cron/forecastReorderAlertCron.js';
// 🤖 Background jobs
import { autoSendPurchaseOrdersJob } from './jobs/autoSendPurchaseOrders.js';
import { autoClosePurchaseOrdersJob } from './jobs/autoClosePurchaseOrders.js';

// Routes
import forecastRoutes from './routes/forecastRoutes.js';
import inventoryMetricsRoutes from './routes/inventoryMetricsRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import errorMiddleware from './middlewares/errorMiddleware.js';
import reorderAlertRoutes from './routes/reorderAlertRoutes.js';

/**
 * 🔐 GLOBAL API RATE LIMITER (A26.1)
 * Applies to ALL /api routes
 */
app.use(
  '/api',
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300                 // 300 requests per IP
  })
);

// -------------------- ROUTES --------------------
app.use('/api/forecast', forecastRoutes);
app.use('/api/inventory-metrics', inventoryMetricsRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reorder-alerts', reorderAlertRoutes);
// ------------------------------------------------

// 🛑 ERROR HANDLING MIDDLEWARE
app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await connectDB();

    // 🤖 Background jobs
    autoSendPurchaseOrdersJob();
    console.log('🤖 Auto-send purchase orders job running');

    autoClosePurchaseOrdersJob();
    console.log('🧹 Auto-close purchase orders job running');

    // ⏱️ Cron jobs (intentional order)
    startInventoryReportCron();
    console.log('⏱️ Inventory report cron started');

    startInventoryMetricsCron();
    console.log('📊 Inventory metrics cron started');

    startForecastGenerationCron();
    console.log('🔮 Inventory forecast cron started');

    startInventoryReorderAlertCron();
    console.log('🔔 Static reorder alert cron started');

    startForecastReorderEngineCron();
    console.log('🔮 Forecast-aware reorder engine cron started');

    startForecastReorderAlertCron();
    console.log('🔮 Forecast reorder alert cron started');

    app.listen(PORT, () => {
      console.log(`🚀 Ledgerly backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
}

startServer();