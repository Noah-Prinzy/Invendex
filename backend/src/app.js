import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import inventoryTrackingRoutes from './routes/inventoryTrackingRoutes.js';
import inventoryReportRoutes from './routes/inventoryReportRoutes.js';
import inventoryMetricsRoutes from './routes/inventoryMetricsRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import supplierProductRoutes from './routes/supplierProductRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import aiInsightsRoutes from './routes/aiInsightsRoutes.js';
import wmsRoutes from './routes/wmsRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import forecastRoutes from './routes/forecastRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import reorderAlertRoutes from './routes/reorderAlertRoutes.js';
import reorderAnalysisRoutes from './routes/reorderAnalysisRoutes.js';
import forecastTrustRoutes from './routes/forecastTrustRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

import { rateLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestContextMiddleware } from './observability/requestContext.js';
import { requestLoggingMiddleware } from './observability/requestLogger.js';
import {
  getLivenessHealth,
  getReadinessHealth
} from './observability/health.js';

dotenv.config();

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(requestContextMiddleware);
app.use(requestLoggingMiddleware);

app.use(
  mongoSanitize({
    replaceWith: '_'
  })
);

app.use(xss());

if (String(process.env.HTTP_LOGGER || 'morgan').toLowerCase() === 'morgan') {
  app.use(morgan('dev'));
}

app.use(
  '/api',
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300
  })
);

app.use('/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/inventory-tracking', inventoryTrackingRoutes);
app.use('/api/inventory-reports', inventoryReportRoutes);
app.use('/api/inventory-metrics', inventoryMetricsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/supplier-products', supplierProductRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiInsightsRoutes);
app.use('/api/wms', wmsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reorder-alerts', reorderAlertRoutes);
app.use('/api/reorder-analysis', reorderAnalysisRoutes);
app.use('/api/forecast-trust', forecastTrustRoutes);
app.use('/api/reports', reportRoutes);

app.get('/health', async (req, res, next) => {
  try {
    const readiness = await getReadinessHealth();
    const liveness = getLivenessHealth();

    res.status(readiness.ready ? 200 : 503).json({
      ...liveness,
      readiness: readiness.ready ? 'ready' : 'degraded',
      db: readiness.db
    });
  } catch (error) {
    next(error);
  }
});

app.get('/health/live', (req, res) => {
  res.status(200).json(getLivenessHealth());
});

app.get('/health/ready', async (req, res, next) => {
  try {
    const readiness = await getReadinessHealth();
    res.status(readiness.ready ? 200 : 503).json(readiness);
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    status: 'ok'
  });
});

app.use(errorHandler);

export default app;
