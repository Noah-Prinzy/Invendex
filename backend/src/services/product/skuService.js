import Product from '../../models/Product.js';
import ProductSkuSequence from '../../models/ProductSkuSequence.js';
import { AppError } from '../../errors/AppError.js';

const DEFAULT_SKU_PREFIX = 'PRD';
const DEFAULT_SKU_DIGITS = 6;
const MAX_SKU_GENERATION_ATTEMPTS = 100;

const sanitizeToken = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const compactToken = (value) => sanitizeToken(value).replace(/-/g, '').trim();

export const normalizeManualSku = (value) => sanitizeToken(value);

export const deriveSkuPrefix = ({ category, name, prefixOverride } = {}) => {
  const explicitPrefix = compactToken(prefixOverride);
  if (explicitPrefix) {
    return explicitPrefix.slice(0, 8);
  }

  const categoryPrefix = compactToken(category);
  if (categoryPrefix) {
    return categoryPrefix.slice(0, 6);
  }

  const namePrefix = compactToken(name);
  if (namePrefix) {
    return namePrefix.slice(0, 6);
  }

  return DEFAULT_SKU_PREFIX;
};

const reserveNextSequenceValue = async ({
  organizationId,
  prefix,
  session
}) => {
  const sequence = await ProductSkuSequence.findOneAndUpdate(
    {
      organization: organizationId,
      prefix
    },
    {
      $inc: { nextValue: 1 }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      ...(session ? { session } : {})
    }
  );

  const sequenceAfterUpdate = Number(sequence?.nextValue || 1);
  return Math.max(1, sequenceAfterUpdate - 1);
};

const formatSku = (prefix, value) =>
  `${prefix}-${String(value).padStart(DEFAULT_SKU_DIGITS, '0')}`;

const skuExists = async ({ organizationId, sku, session }) => {
  let query = Product.exists({
    organization: organizationId,
    sku
  });
  if (session) query = query.session(session);
  const existing = await query;
  return Boolean(existing);
};

export const generateUniqueSku = async ({
  organizationId,
  category,
  name,
  prefixOverride,
  session = null
}) => {
  const prefix = deriveSkuPrefix({ category, name, prefixOverride });

  for (let attempt = 0; attempt < MAX_SKU_GENERATION_ATTEMPTS; attempt += 1) {
    const sequenceValue = await reserveNextSequenceValue({
      organizationId,
      prefix,
      session
    });
    const candidate = formatSku(prefix, sequenceValue);
    const exists = await skuExists({ organizationId, sku: candidate, session });
    if (!exists) return candidate;
  }

  throw new AppError('Unable to generate a unique SKU. Retry request.', 500);
};

export const previewUniqueSku = async ({
  organizationId,
  category,
  name,
  prefixOverride,
  session = null,
  cursorByPrefix = new Map()
}) => {
  const prefix = deriveSkuPrefix({ category, name, prefixOverride });
  let nextValue = Number(cursorByPrefix.get(prefix) || 0);

  if (!nextValue) {
    let query = ProductSkuSequence.findOne({
      organization: organizationId,
      prefix
    }).select('nextValue');
    if (session) query = query.session(session);
    const sequence = await query.lean();
    nextValue = Math.max(1, Number(sequence?.nextValue || 1));
  }

  for (let attempt = 0; attempt < MAX_SKU_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = formatSku(prefix, nextValue);
    const exists = await skuExists({ organizationId, sku: candidate, session });
    if (!exists) {
      cursorByPrefix.set(prefix, nextValue + 1);
      return candidate;
    }
    nextValue += 1;
  }

  throw new AppError('Unable to preview a unique SKU. Retry request.', 500);
};
