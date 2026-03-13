import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import Inventory from '../src/models/Inventory.js';
import InventoryCostLayer from '../src/models/InventoryCostLayer.js';
import InventoryValuationConfig from '../src/models/InventoryValuationConfig.js';
import Order from '../src/models/Order.js';
import Organization from '../src/models/Organization.js';
import Product from '../src/models/Product.js';
import SupplierProduct from '../src/models/SupplierProduct.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env'), override: true });

const normalizeDbUrl = (rawValue) => {
  if (!rawValue) return '';
  const trimmed = String(rawValue).trim();
  return trimmed.replace(/^['"]|['"]$/g, '');
};

const buildDbUrlFromParts = () => {
  const host = String(process.env.DB_HOST || '').trim();
  if (!host) return '';
  const port = String(process.env.DB_PORT || '27017').trim();
  const dbName = String(process.env.DB_NAME || 'invendex').trim();
  return `mongodb://${host}:${port}/${dbName}`;
};

const resolveDbUrl = () => {
  const explicitDbUrl = normalizeDbUrl(process.env.DB_URL);
  if (explicitDbUrl && !explicitDbUrl.includes('${')) return explicitDbUrl;
  return buildDbUrlFromParts() || explicitDbUrl;
};

const DB_URL = resolveDbUrl();
const DRY_RUN =
  String(process.env.MIGRATION_DRY_RUN || '')
    .toLowerCase()
    .trim() === 'true';

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getFallbackUnitCost = async (
  organizationId,
  productId,
  fallbackPrice
) => {
  const supplierProduct = await SupplierProduct.findOne({
    organization: organizationId,
    product: productId,
    isActive: true
  })
    .sort({ isPreferred: -1, updatedAt: -1, createdAt: -1 })
    .select('unitCost')
    .lean();

  if (supplierProduct && Number.isFinite(Number(supplierProduct.unitCost))) {
    return Number(supplierProduct.unitCost);
  }
  return Number(fallbackPrice || 0);
};

const ensureValuationConfigs = async (organizations) => {
  let created = 0;
  for (const organization of organizations) {
    const existing = await InventoryValuationConfig.findOne({
      organization: organization._id
    }).lean();

    if (existing) continue;

    if (!DRY_RUN) {
      await InventoryValuationConfig.create({
        organization: organization._id,
        defaultMethod: 'WEIGHTED_AVG',
        allowMethodOverride: true
      });
    }

    created += 1;
  }
  return created;
};

const backfillSaleOrderPricing = async (organizations) => {
  let ordersUpdated = 0;
  let linesUpdated = 0;

  for (const organization of organizations) {
    const orders = await Order.find({
      organization: organization._id,
      type: 'sale',
      status: 'completed'
    });

    for (const order of orders) {
      let changed = false;
      let subtotal = 0;
      let discount = 0;
      let tax = 0;

      for (const line of order.products) {
        const product = await Product.findOne({
          organization: organization._id,
          _id: line.product
        })
          .select('price')
          .lean();

        if (!line.warehouse && order.warehouse) {
          line.warehouse = order.warehouse;
          changed = true;
        }

        if (!Number.isFinite(Number(line.unitSalePrice))) {
          line.unitSalePrice = Number(product?.price || 0);
          changed = true;
          linesUpdated += 1;
        }

        if (!Number.isFinite(Number(line.discountAmount))) {
          line.discountAmount = 0;
          changed = true;
        }
        if (!Number.isFinite(Number(line.taxAmount))) {
          line.taxAmount = 0;
          changed = true;
        }

        const qty = Number(line.quantity || 0);
        const unitSalePrice = Number(line.unitSalePrice || 0);
        const lineDiscount = Number(line.discountAmount || 0);
        const lineTax = Number(line.taxAmount || 0);
        const lineRevenue = roundMoney(
          qty * unitSalePrice - lineDiscount + lineTax
        );

        if (
          !Number.isFinite(Number(line.lineRevenue)) ||
          Number(line.lineRevenue) !== lineRevenue
        ) {
          line.lineRevenue = lineRevenue;
          changed = true;
        }

        subtotal += qty * unitSalePrice;
        discount += lineDiscount;
        tax += lineTax;
      }

      const netRevenue = roundMoney(subtotal - discount + tax);
      if (
        order.subtotalRevenue !== roundMoney(subtotal) ||
        order.totalDiscount !== roundMoney(discount) ||
        order.totalTax !== roundMoney(tax) ||
        order.netRevenue !== netRevenue
      ) {
        order.subtotalRevenue = roundMoney(subtotal);
        order.totalDiscount = roundMoney(discount);
        order.totalTax = roundMoney(tax);
        order.netRevenue = netRevenue;
        changed = true;
      }

      if (!changed) continue;
      if (!DRY_RUN) {
        await order.save();
      }
      ordersUpdated += 1;
    }
  }

  return { ordersUpdated, linesUpdated };
};

const seedOpeningCostLayers = async (organizations) => {
  let layersCreated = 0;

  for (const organization of organizations) {
    const inventories = await Inventory.find({
      organization: organization._id,
      quantityOnHand: { $gt: 0 }
    })
      .select('organization product warehouse quantityOnHand')
      .lean();

    for (const inventory of inventories) {
      const existing = await InventoryCostLayer.findOne({
        organization: inventory.organization,
        product: inventory.product,
        warehouse: inventory.warehouse,
        quantityRemaining: { $gt: 0 }
      }).lean();

      if (existing) continue;

      const product = await Product.findById(inventory.product)
        .select('price')
        .lean();

      const unitCost = await getFallbackUnitCost(
        inventory.organization,
        inventory.product,
        product?.price || 0
      );

      if (!DRY_RUN) {
        await InventoryCostLayer.create({
          organization: inventory.organization,
          product: inventory.product,
          warehouse: inventory.warehouse,
          sourceType: 'OPENING_BALANCE',
          sourceId: null,
          unitCost,
          quantityReceived: inventory.quantityOnHand,
          quantityRemaining: inventory.quantityOnHand,
          receivedAt: new Date()
        });
      }

      layersCreated += 1;
    }
  }

  return layersCreated;
};

async function run() {
  if (!DB_URL) {
    throw new Error('DB_URL is required to run migrate:financial');
  }

  if (
    !DB_URL.startsWith('mongodb://') &&
    !DB_URL.startsWith('mongodb+srv://')
  ) {
    throw new Error(
      'DB_URL has invalid scheme. Current value must start with "mongodb://" or "mongodb+srv://"'
    );
  }

  await mongoose.connect(DB_URL);
  console.log(`Connected to database (${DRY_RUN ? 'dry-run' : 'write mode'})`);

  const organizations = await Organization.find({ isActive: true })
    .select('_id code')
    .lean();

  const valuationConfigsCreated = await ensureValuationConfigs(organizations);
  const orderBackfill = await backfillSaleOrderPricing(organizations);
  const costLayersCreated = await seedOpeningCostLayers(organizations);

  console.log('--- Financial Migration Summary ---');
  console.log(`Organizations checked: ${organizations.length}`);
  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}Valuation configs created: ${valuationConfigsCreated}`
  );
  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}Orders updated: ${orderBackfill.ordersUpdated}`
  );
  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}Order lines backfilled: ${orderBackfill.linesUpdated}`
  );
  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}Opening cost layers created: ${costLayersCreated}`
  );
}

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('Financial migration completed');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Financial migration failed:', err.message);
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  });
