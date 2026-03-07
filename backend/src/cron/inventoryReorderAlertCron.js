import cron from 'node-cron';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import ReorderAlert from '../models/ReorderAlert.js';
import SupplierProduct from '../models/SupplierProduct.js';
import Organization from '../models/Organization.js';

let cronStarted = false;

/**
 * 🔔 Inventory reorder alert cron
 * Runs daily at 00:30
 */
export const startInventoryReorderAlertCron = () => {
  if (cronStarted) return;
  cronStarted = true;

  console.log('⏱️ Inventory reorder alert cron scheduled (daily at 00:30)');

  cron.schedule('30 0 * * *', async () => {
    try {
      console.log('🔔 Running inventory reorder alert cron...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      /**
       * 1️⃣ CREATE alerts for low-stock products
       */
      const organizations = await Organization.find({
        isActive: true
      }).select('_id');

      for (const organization of organizations) {
        const lowStockProducts = await Product.find({
          organization: organization._id,
          isActive: true
        }).select('_id sku lowStockThreshold');
        const inventoryRows = await Inventory.find({
          organization: organization._id
        })
          .select('product warehouse quantityOnHand')
          .lean();
        const inventoryMap = new Map(
          inventoryRows.map((row) => [
            `${String(row.product)}:${String(row.warehouse)}`,
            Number(row.quantityOnHand || 0)
          ])
        );

        for (const product of lowStockProducts) {
          const productInventories = inventoryRows.filter(
            (row) => String(row.product) === String(product._id)
          );

          for (const inventoryRow of productInventories) {
            const currentStock = Number(
              inventoryMap.get(
                `${String(product._id)}:${String(inventoryRow.warehouse)}`
              ) || 0
            );
            if (currentStock > Number(product.lowStockThreshold || 0)) {
              continue;
            }

            try {
              // ❗ Prevent duplicate UNRESOLVED alerts
              const existingAlert = await ReorderAlert.findOne({
                organization: organization._id,
                product: product._id,
                warehouse: inventoryRow.warehouse,
                resolved: false
              });

              if (existingAlert) continue;

              // 🔍 Find best supplier for product
              const supplierLink = await SupplierProduct.findOne({
                organization: organization._id,
                product: product._id,
                isActive: true
              })
                .sort({ isPreferred: -1, leadTimeDays: 1 })
                .lean();

              await ReorderAlert.create({
                organization: organization._id,
                product: product._id,
                warehouse: inventoryRow.warehouse,
                sku: product.sku,
                stock: currentStock,
                reorderLevel: product.lowStockThreshold,
                reorderQuantity: 1,
                triggeredAt: today,
                source: 'cron',

                // 🧊 Supplier snapshot (frozen at alert time)
                supplier: supplierLink?.supplier || null,
                supplierLeadTimeDays: supplierLink?.leadTimeDays || null,
                supplierUnitCost: supplierLink?.unitCost || null
              });

              console.warn(
                `⚠️ REORDER ALERT SAVED | ${product.sku} | Stock: ${currentStock}`
              );
            } catch (err) {
              if (err.code !== 11000) {
                console.error('❌ Failed to save reorder alert:', err);
              }
            }
          }
        }
      }

      /**
       * 2️⃣ AUTO-RESOLVE alerts when stock recovers
       */
      for (const organization of organizations) {
        const recoveredProducts = await Product.find({
          organization: organization._id,
          isActive: true
        }).select('_id sku lowStockThreshold');
        const recoveredInventoryRows = await Inventory.find({
          organization: organization._id
        })
          .select('product warehouse quantityOnHand')
          .lean();

        for (const product of recoveredProducts) {
          const productInventories = recoveredInventoryRows.filter(
            (row) => String(row.product) === String(product._id)
          );

          for (const inventoryRow of productInventories) {
            const currentStock = Number(inventoryRow.quantityOnHand || 0);
            if (currentStock <= Number(product.lowStockThreshold || 0)) {
              continue;
            }

            const result = await ReorderAlert.updateMany(
              {
                organization: organization._id,
                product: product._id,
                warehouse: inventoryRow.warehouse,
                resolved: false
              },
              {
                $set: {
                  resolved: true,
                  resolvedAt: new Date()
                }
              }
            );

            if (result.modifiedCount > 0) {
              console.log(
                `✅ Reorder alert resolved | ${product.sku} | Stock: ${currentStock}`
              );
            }
          }
        }
      }

      console.log('🔔 Reorder alert cron cycle complete');
    } catch (err) {
      console.error('❌ Reorder alert cron failed:', err);
    }
  });
};
