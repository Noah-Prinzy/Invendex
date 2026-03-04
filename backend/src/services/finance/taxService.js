import Order from '../../models/Order.js';
import TaxConfiguration from '../../models/TaxConfiguration.js';

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizeRate = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
};

const computeVatAmount = ({ baseAmount, vatRate, taxInclusivePricing }) => {
  const normalizedBase = Number(baseAmount || 0);
  const normalizedRate = normalizeRate(vatRate) / 100;

  if (normalizedRate <= 0 || normalizedBase <= 0) {
    return 0;
  }

  if (taxInclusivePricing) {
    const vatPortion = normalizedBase - normalizedBase / (1 + normalizedRate);
    return roundMoney(vatPortion);
  }

  return roundMoney(normalizedBase * normalizedRate);
};

export const getOrCreateTaxConfiguration = async (
  organizationId,
  { session = null } = {}
) => {
  const query = TaxConfiguration.findOne({
    organization: organizationId
  });
  if (session) {
    query.session(session);
  }
  let config = await query;
  if (config) return config;

  if (session) {
    [config] = await TaxConfiguration.create(
      [
        {
          organization: organizationId
        }
      ],
      { session }
    );
    return config;
  }

  return TaxConfiguration.create({
    organization: organizationId
  });
};

export const updateTaxConfiguration = async ({
  organizationId,
  vatEnabled,
  vatRate,
  importTaxEnabled,
  importTaxRate,
  taxInclusivePricing,
  countryCode,
  currencyCode,
  taxAuthorityName,
  taxRegistrationNumber,
  regime,
  defaultTaxCategory,
  updatedBy = null
}) => {
  const config = await getOrCreateTaxConfiguration(organizationId);
  if (!config.regionProfile || typeof config.regionProfile !== 'object') {
    config.regionProfile = {};
  }

  if (typeof vatEnabled === 'boolean') {
    config.vatEnabled = vatEnabled;
  }
  if (vatRate !== undefined) {
    config.vatRate = normalizeRate(vatRate);
  }
  if (typeof importTaxEnabled === 'boolean') {
    config.importTaxEnabled = importTaxEnabled;
  }
  if (importTaxRate !== undefined) {
    config.importTaxRate = normalizeRate(importTaxRate);
  }
  if (typeof taxInclusivePricing === 'boolean') {
    config.taxInclusivePricing = taxInclusivePricing;
  }
  if (countryCode != null) {
    config.countryCode = String(countryCode).trim().toUpperCase() || 'UG';
  }
  if (currencyCode != null) {
    config.currencyCode = String(currencyCode).trim().toUpperCase() || 'UGX';
  }
  if (taxAuthorityName != null) {
    config.regionProfile.taxAuthorityName = String(
      taxAuthorityName || ''
    ).trim();
  }
  if (taxRegistrationNumber != null) {
    config.regionProfile.taxRegistrationNumber = String(
      taxRegistrationNumber || ''
    ).trim();
  }
  if (regime != null) {
    config.regionProfile.regime = String(regime || '')
      .trim()
      .toUpperCase();
  }
  if (defaultTaxCategory != null) {
    config.regionProfile.defaultTaxCategory = String(defaultTaxCategory || '')
      .trim()
      .toUpperCase();
  }

  config.updatedBy = updatedBy || null;
  config.lastReviewedAt = new Date();

  await config.save();
  return config;
};

export const applySaleTaxDefaults = async ({
  organizationId,
  type,
  products,
  session = null
}) => {
  if (String(type || '').toLowerCase() !== 'sale') {
    return {
      products,
      taxConfig: null
    };
  }

  const taxConfig = await getOrCreateTaxConfiguration(organizationId, {
    session
  });
  const normalizedProducts = Array.isArray(products)
    ? products.map((line) => ({ ...line }))
    : [];

  for (const line of normalizedProducts) {
    const quantity = Number(line.quantity || 0);
    const unitSalePrice = Number(line.unitSalePrice || 0);
    const discountAmount = Number(line.discountAmount || 0);
    const hadExplicitTaxAmount =
      line.taxAmount != null && Number.isFinite(Number(line.taxAmount));

    if (!Number.isFinite(Number(line.discountAmount))) {
      line.discountAmount = 0;
    }
    if (!hadExplicitTaxAmount) {
      line.taxAmount = 0;
    }

    if (!taxConfig.vatEnabled) {
      line.taxAmount = 0;
      continue;
    }

    if (hadExplicitTaxAmount) {
      continue;
    }

    const taxableBase = Math.max(quantity * unitSalePrice - discountAmount, 0);
    line.taxAmount = computeVatAmount({
      baseAmount: taxableBase,
      vatRate: taxConfig.vatRate,
      taxInclusivePricing: taxConfig.taxInclusivePricing
    });
  }

  return {
    products: normalizedProducts,
    taxConfig
  };
};

export const getVatComplianceSummary = async ({
  organizationId,
  from = null,
  to = null
}) => {
  const match = {
    organization: organizationId,
    type: 'sale',
    status: 'completed'
  };

  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        subtotalRevenue: { $sum: '$subtotalRevenue' },
        totalDiscount: { $sum: '$totalDiscount' },
        totalTax: { $sum: '$totalTax' },
        netRevenue: { $sum: '$netRevenue' }
      }
    }
  ]);

  const summary = rows[0] || {
    orderCount: 0,
    subtotalRevenue: 0,
    totalDiscount: 0,
    totalTax: 0,
    netRevenue: 0
  };

  return {
    from: from || null,
    to: to || null,
    orderCount: Number(summary.orderCount || 0),
    subtotalRevenue: roundMoney(summary.subtotalRevenue),
    totalDiscount: roundMoney(summary.totalDiscount),
    totalTaxCollected: roundMoney(summary.totalTax),
    netRevenue: roundMoney(summary.netRevenue)
  };
};

export default {
  getOrCreateTaxConfiguration,
  updateTaxConfiguration,
  applySaleTaxDefaults,
  getVatComplianceSummary
};
