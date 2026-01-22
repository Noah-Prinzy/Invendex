import InventorySnapshot from '../models/InventorySnapshot.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import ReorderAlert from '../models/ReorderAlert.js';

import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';

import {
  generateProductForecast
} from '../services/inventory/forecastService.js';

/**
 * 🔮 Inventory Demand Forecast
 */
export const forecastInventory = async (req, res, next) => {
  try {
    const bufferDays = Number(req.query.bufferDays || 7);

    const products = await Product.find().populate('supplier');

    const forecasts = [];

    for (const product of products) {
      // 🕒 Last 30 days snapshots
      const snapshots = await InventorySnapshot.find({
        product: product._id
      })
        .sort({ date: -1 })
        .limit(30);

      if (snapshots.length < 2) continue;

      const totalConsumed =
        snapshots[0].stock - snapshots[snapshots.length - 1].stock;

      const days = snapshots.length - 1;
      if (totalConsumed <= 0) continue;

      const historicalDemand = [];
      for (let i = 0; i < snapshots.length - 1; i++) {
        const dailyUse =
          snapshots[i].stock - snapshots[i + 1].stock;
        if (dailyUse > 0) historicalDemand.push(dailyUse);
      }

      const forecast = await generateProductForecast({
        productId: product._id.toString(),
        historicalDemand,
        options: {
          horizonDays: product.supplier?.leadTimeDays || 7
        }
      });

      const adc = forecast.avgDailyDemand;
      const leadTime = product.supplier?.leadTimeDays || 7;

      const daysUntilStockOut =
        adc > 0 ? product.stock / adc : null;

      const recommendedReorderQty =
        adc > 0
          ? Math.max(
              Math.ceil(
                adc * (leadTime + bufferDays) - product.stock
              ),
              0
            )
          : 0;

      forecasts.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stock,
        avgDailyConsumption: Number(adc.toFixed(2)),
        leadTimeDays: leadTime,
        daysUntilStockOut:
          daysUntilStockOut !== null
            ? Number(daysUntilStockOut.toFixed(1))
            : null,
        recommendedReorderQty,
        confidenceScore: forecast.confidenceScore
      });
    }

    return successResponse(
      res,
      forecasts,
      'Inventory forecast generated'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 🤖 Generate Reorder Alerts from Forecasts
 */
export const generateReorderAlertsFromForecast = async (
  req,
  res,
  next
) => {
  try {
    const bufferDays = Number(req.query.bufferDays || 7);

    const products = await Product.find().populate('supplier');

    const createdAlerts = [];

    for (const product of products) {
      if (!product.supplier) continue;

      const snapshots = await InventorySnapshot.find({
        product: product._id
      })
        .sort({ date: -1 })
        .limit(30);

      if (snapshots.length < 2) continue;

      const historicalDemand = [];
      for (let i = 0; i < snapshots.length - 1; i++) {
        const dailyUse =
          snapshots[i].stock - snapshots[i + 1].stock;
        if (dailyUse > 0) historicalDemand.push(dailyUse);
      }

      if (historicalDemand.length === 0) continue;

      const forecast = await generateProductForecast({
        productId: product._id.toString(),
        historicalDemand,
        options: {
          horizonDays: product.supplier.leadTimeDays || 7
        }
      });

      const adc = forecast.avgDailyDemand;
      if (adc <= 0) continue;

      const leadTime = product.supplier.leadTimeDays || 7;
      const daysUntilStockOut = product.stock / adc;

      // 🛑 Not urgent enough
      if (daysUntilStockOut > leadTime + bufferDays) continue;

      // 🔒 Prevent duplicates
      const existingAlert = await ReorderAlert.findOne({
        product: product._id,
        resolved: false
      });

      if (existingAlert) continue;

      const reorderQty = Math.ceil(
        adc * (leadTime + bufferDays) - product.stock
      );

      const alert = await ReorderAlert.create({
        product: product._id,
        sku: product.sku,
        stock: product.stock,
        reorderLevel: reorderQty,
        triggeredAt: new Date(),
        source: 'system',
        supplier: product.supplier._id,
        supplierLeadTimeDays: leadTime,
        supplierUnitCost: product.costPrice,
        forecastConfidence: forecast.confidenceScore
      });

      createdAlerts.push(alert);
    }

    return successResponse(
      res,
      createdAlerts,
      'Reorder alerts generated from forecast'
    );
  } catch (err) {
    next(err);
  }
};