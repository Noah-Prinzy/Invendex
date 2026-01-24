import dotenv from 'dotenv';
dotenv.config(); // ⬅️ MUST be before anything else

import app from './app.js';
import { connectDB } from './config/dbConfig.js';
import { rateLimiter } from './middlewares/rateLimiter.js';

// 🕒 Inventory snapshot / report cron
import { startInventoryReportCron } from './cron/inventoryReportCron.js';

// 📊 Inventory metrics cron
import { startInventoryMetricsCron } from './cron/inventoryMetricsCron.js';

// 🔮 Inventory forecast generation cron
import { startForecastGenerationCron } from './cron/forecastGenerationCron.js';

// 🔁 Forecast-aware reorder cron
import { startForecastReorderCron } from './cron/forecastReorderCron.js';

// 🤖 Background jobs
import { autoSendPurchaseOrdersJob } from './jobs/autoSendPurchaseOrders.js';
import { autoClosePurchaseOrdersJob } from './jobs/autoClosePurchaseOrders.js';

// -------------------- ROUTES --------------------
import inventoryRoutes from './routes/inventoryRoutes.js'; // ✅ MISSING
import forecastRoutes from './routes/forecastRoutes.js';
import inventoryMetricsRoutes from './routes/inventoryMetricsRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import reorderAlertRoutes from './routes/reorderAlertRoutes.js';
import reorderAnalysisRoutes from './routes/reorderAnalysisRoutes.js';
import forecastTrustRoutes from './routes/forecastTrustRoutes.js';
// ------------------------------------------------

import errorMiddleware from './middlewares/errorMiddleware.js';

/**
 * 🔐 GLOBAL API RATE LIMITER
 */
app.use(
  '/api',
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300
  })
);

// -------------------- ROUTE MOUNTS --------------------
app.use('/api/inventory', inventoryRoutes); // ✅ REQUIRED
app.use('/api/forecast', forecastRoutes);
app.use('/api/inventory-metrics', inventoryMetricsRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reorder-alerts', reorderAlertRoutes);
app.use('/api/reorder-analysis', reorderAnalysisRoutes);
app.use('/api/forecast-trust', forecastTrustRoutes);
// -----------------------------------------------------

// 🛑 ERROR HANDLING
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

    // ⏱️ Cron jobs (ordered)
    startInventoryReportCron();
    console.log('⏱️ Inventory report cron started');

    startInventoryMetricsCron();
    console.log('📊 Inventory metrics cron started');

    startForecastGenerationCron();
    console.log('🔮 Inventory forecast cron started');

    startForecastReorderCron();
    console.log('🔁 Forecast-aware reorder cron started');

    app.listen(PORT, () => {
      console.log(`🚀 Ledgerly backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
}

startServer();