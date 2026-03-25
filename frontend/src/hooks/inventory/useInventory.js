import { useMemo } from 'react';

const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolveStock = (product) =>
  toNumber(
    product?.stock ??
      product?.quantityOnHand ??
      product?.inventory?.quantityOnHand ??
      0
  );

const resolvePrice = (product) =>
  toNumber(product?.price ?? product?.unitPrice ?? product?.sellingPrice ?? 0);

const useInventory = ({
  products = [],
  lowStockSummary = [],
  healthScore = null
} = {}) =>
  useMemo(() => {
    const productRows = Array.isArray(products) ? products : [];
    const productCount = productRows.length;
    const unitsOnHand = productRows.reduce(
      (sum, product) => sum + resolveStock(product),
      0
    );
    const estimatedInventoryValue = productRows.reduce(
      (sum, product) => sum + resolveStock(product) * resolvePrice(product),
      0
    );
    const lowStockCount = Array.isArray(lowStockSummary)
      ? lowStockSummary.length
      : 0;
    const topStockedProducts = productRows
      .map((product, index) => ({
        id: product?._id || product?.id || product?.sku || `product-${index}`,
        label: product?.sku || product?.name || `Product ${index + 1}`,
        value: resolveStock(product),
        note:
          product?.name && product?.sku && product.name !== product.sku
            ? String(product.name)
            : ''
      }))
      .filter((product) => product.value > 0)
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);

    return {
      productCount,
      unitsOnHand,
      estimatedInventoryValue,
      lowStockCount,
      healthBand: String(healthScore?.band || '').trim() || null,
      healthScoreValue: toNumber(healthScore?.score),
      topStockedProducts
    };
  }, [healthScore, lowStockSummary, products]);

export default useInventory;
