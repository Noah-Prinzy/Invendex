import CogsEntry from '../../models/CogsEntry.js';
import { AppError } from '../../errors/AppError.js';

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const normalizeGroupBy = (value) => {
  const normalized = String(value || 'day').toLowerCase();
  if (['day', 'product', 'category'].includes(normalized)) {
    return normalized;
  }
  return 'day';
};

const buildDateRange = ({ from, to }) => {
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  return Object.keys(range).length ? range : null;
};

const getLineRevenue = (order, lineIndex) => {
  const line = order.products?.[lineIndex];
  if (!line) return 0;

  if (Number.isFinite(Number(line.lineRevenue))) {
    return Number(line.lineRevenue);
  }

  const qty = Number(line.quantity || 0);
  const unitSalePrice = Number(line.unitSalePrice || 0);
  const discountAmount = Number(line.discountAmount || 0);
  const taxAmount = Number(line.taxAmount || 0);

  return roundMoney(qty * unitSalePrice - discountAmount + taxAmount);
};

export const getGrossMarginReport = async ({
  organizationId,
  from = null,
  to = null,
  groupBy = 'day'
}) => {
  const normalizedGroupBy = normalizeGroupBy(groupBy);
  const recordedAtRange = buildDateRange({ from, to });

  const cogsQuery = {
    organization: organizationId
  };
  if (recordedAtRange) {
    cogsQuery.recordedAt = recordedAtRange;
  }

  const entries = await CogsEntry.find(cogsQuery)
    .populate('product', 'name sku category')
    .populate('orderId', 'products createdAt netRevenue')
    .lean();

  if (!entries.length) {
    return {
      groupBy: normalizedGroupBy,
      totals: {
        revenue: 0,
        cogs: 0,
        grossMargin: 0,
        grossMarginPct: 0
      },
      items: []
    };
  }

  const bucket = new Map();
  let totalRevenue = 0;
  let totalCogs = 0;

  for (const entry of entries) {
    if (!entry.orderId) continue;
    const lineRevenue = getLineRevenue(entry.orderId, entry.orderLineIndex);
    const cogs = Number(entry.totalCogs || 0);
    const margin = roundMoney(lineRevenue - cogs);

    totalRevenue += lineRevenue;
    totalCogs += cogs;

    let key = '';
    if (normalizedGroupBy === 'day') {
      key = new Date(entry.recordedAt).toISOString().slice(0, 10);
    } else if (normalizedGroupBy === 'product') {
      key = String(entry.product?._id || entry.product || 'unknown');
    } else {
      key = String(entry.product?.category || 'uncategorized');
    }

    if (!bucket.has(key)) {
      bucket.set(key, {
        key,
        date: normalizedGroupBy === 'day' ? key : null,
        productId: normalizedGroupBy === 'product' ? key : null,
        productName:
          normalizedGroupBy === 'product'
            ? entry.product?.name || 'Unknown Product'
            : null,
        category: normalizedGroupBy === 'category' ? key : null,
        revenue: 0,
        cogs: 0,
        grossMargin: 0
      });
    }

    const row = bucket.get(key);
    row.revenue = roundMoney(row.revenue + lineRevenue);
    row.cogs = roundMoney(row.cogs + cogs);
    row.grossMargin = roundMoney(row.grossMargin + margin);
  }

  const items = Array.from(bucket.values()).map((row) => ({
    ...row,
    grossMarginPct:
      row.revenue > 0 ? roundMoney((row.grossMargin / row.revenue) * 100) : 0
  }));

  items.sort((a, b) => {
    if (normalizedGroupBy === 'day') {
      return String(a.date).localeCompare(String(b.date));
    }
    return b.grossMargin - a.grossMargin;
  });

  const grossMargin = roundMoney(totalRevenue - totalCogs);
  return {
    groupBy: normalizedGroupBy,
    totals: {
      revenue: roundMoney(totalRevenue),
      cogs: roundMoney(totalCogs),
      grossMargin,
      grossMarginPct:
        totalRevenue > 0 ? roundMoney((grossMargin / totalRevenue) * 100) : 0
    },
    items
  };
};

export const validateGrossMarginQuery = ({ groupBy }) => {
  const normalized = normalizeGroupBy(groupBy);
  if (!['day', 'product', 'category'].includes(normalized)) {
    throw new AppError('Invalid groupBy value', 400);
  }
  return normalized;
};

export default {
  getGrossMarginReport,
  validateGrossMarginQuery
};
