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
import inventoryReportRoutes from './routes/inventoryReportRoutes.js';
import inventoryMetricsRoutes from './routes/inventoryMetricsRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import supplierProductRoutes from './routes/supplierProductRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import aiInsightsRoutes from './routes/aiInsightsRoutes.js';
import wmsRoutes from './routes/wmsRoutes.js';

import { errorHandler } from './middlewares/errorHandler.js';

dotenv.config();

const app = express();

/**
 * 🔐 SECURITY HEADERS (A26.2)
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

/**
 * 🌍 CORS
 */
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

/**
 * 🧾 Body parsing
 */
app.use(express.json());
app.use(cookieParser());

/**
 * 🧼 MongoDB injection sanitization (A26.3)
 * Prevents $gt, $ne, $or, etc. attacks
 */
app.use(
  mongoSanitize({
    replaceWith: '_'
  })
);

/**
 * 🛡️ XSS protection (A26.4)
 * Cleans user input from body, query, params
 */
app.use(xss());

/**
 * 📜 Logging
 */
app.use(morgan('dev'));

/**
 * 🚏 Routes
 */
app.use('/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/inventory-reports', inventoryReportRoutes);
app.use('/api/inventory-metrics', inventoryMetricsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/supplier-products', supplierProductRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiInsightsRoutes);
app.use('/api/wms', wmsRoutes);

/**
 * ❤️ Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy'
  });
});

/**
 * ❌ Global error handler (MUST BE LAST)
 */
app.use(errorHandler);

export default app;
