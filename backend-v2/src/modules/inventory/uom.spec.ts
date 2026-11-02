import {
  convertQuantityToBaseUnits,
  normalizeQuantityUnit,
  resolvePurchaseToBaseFactor
} from './uom';

describe('uom conversion (ported from legacy uomConversionService)', () => {
  it('prefers an explicit integer override factor', () => {
    expect(
      resolvePurchaseToBaseFactor({
        product: { uom: { purchaseToBaseFactor: 12 } },
        overrideFactor: 24
      })
    ).toBe(24);
    expect(
      resolvePurchaseToBaseFactor({
        product: { uom: { purchaseToBaseFactor: 12 } },
        overrideFactor: 2.5
      })
    ).toBeNaN();
  });

  it('falls back to the product factor, else NaN', () => {
    expect(
      resolvePurchaseToBaseFactor({
        product: { uom: { purchaseToBaseFactor: 6 } },
        overrideFactor: null
      })
    ).toBe(6);
    expect(
      resolvePurchaseToBaseFactor({ product: null, overrideFactor: undefined })
    ).toBeNaN();
  });

  it('converts purchase units to base units', () => {
    expect(
      convertQuantityToBaseUnits({
        quantity: 2,
        quantityUnit: 'purchase',
        purchaseToBaseFactor: 24
      })
    ).toBe(48);
    expect(
      convertQuantityToBaseUnits({ quantity: 7, quantityUnit: 'base' })
    ).toBe(7);
    expect(normalizeQuantityUnit('PURCHASE')).toBe('purchase');
    expect(normalizeQuantityUnit('anything')).toBe('base');
    expect(
      convertQuantityToBaseUnits({
        quantity: 2,
        quantityUnit: 'purchase',
        purchaseToBaseFactor: 0
      })
    ).toBeNaN();
  });
});
