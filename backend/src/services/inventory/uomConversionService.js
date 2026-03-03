const normalizeUnitToken = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

export const INVENTORY_QUANTITY_UNITS = Object.freeze({
  BASE: 'base',
  PURCHASE: 'purchase'
});

export const normalizeQuantityUnit = (value) => {
  const normalized = normalizeUnitToken(value);
  if (normalized === INVENTORY_QUANTITY_UNITS.PURCHASE) {
    return INVENTORY_QUANTITY_UNITS.PURCHASE;
  }
  return INVENTORY_QUANTITY_UNITS.BASE;
};

export const resolvePurchaseToBaseFactor = ({ product, overrideFactor }) => {
  const hasExplicitOverride =
    overrideFactor !== undefined &&
    overrideFactor !== null &&
    String(overrideFactor).trim() !== '';

  if (hasExplicitOverride) {
    const explicitFactor = Number(overrideFactor);
    if (Number.isInteger(explicitFactor) && explicitFactor >= 1) {
      return explicitFactor;
    }
    return Number.NaN;
  }

  const productFactor = Number(product?.uom?.purchaseToBaseFactor);
  if (Number.isInteger(productFactor) && productFactor >= 1) {
    return productFactor;
  }

  return Number.NaN;
};

export const convertQuantityToBaseUnits = ({
  quantity,
  quantityUnit = INVENTORY_QUANTITY_UNITS.BASE,
  purchaseToBaseFactor = 1
}) => {
  const numericQuantity = Number(quantity);
  const factor = Number(purchaseToBaseFactor);
  const normalizedUnit = normalizeQuantityUnit(quantityUnit);

  if (!Number.isFinite(numericQuantity)) {
    return Number.NaN;
  }

  if (!Number.isFinite(factor) || factor < 1 || !Number.isInteger(factor)) {
    return Number.NaN;
  }

  if (normalizedUnit === INVENTORY_QUANTITY_UNITS.PURCHASE) {
    return Number((numericQuantity * Math.floor(factor)).toFixed(6));
  }

  return Number(numericQuantity.toFixed(6));
};

export default {
  INVENTORY_QUANTITY_UNITS,
  normalizeQuantityUnit,
  resolvePurchaseToBaseFactor,
  convertQuantityToBaseUnits
};
