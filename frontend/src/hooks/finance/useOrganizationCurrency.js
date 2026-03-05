import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getFinanceExchangeRatesRequest,
  getSettingsRequest
} from '../../api/client.js';

const DEFAULT_STALE_TIME_MS = 45 * 1000;
const DEFAULT_CURRENCY_CODE = 'UGX';
const CURRENCY_SYMBOL_OVERRIDES = Object.freeze({
  UGX: 'USh',
  KES: 'KSh',
  TZS: 'TSh',
  RWF: 'RF',
  ZAR: 'R',
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  INR: '₹'
});

const normalizeCurrencyCode = (value, fallback = DEFAULT_CURRENCY_CODE) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (/^[A-Z]{3}$/.test(normalized)) {
    return normalized;
  }
  return String(fallback || DEFAULT_CURRENCY_CODE)
    .trim()
    .toUpperCase();
};

const roundMoney = (value, precision = 6) => {
  const factor = 10 ** precision;
  const normalized = Number(value || 0);
  if (!Number.isFinite(normalized)) return 0;
  return Math.round((normalized + Number.EPSILON) * factor) / factor;
};

const formatCurrency = ({
  amount,
  currencyCode,
  locale = 'en-US',
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
}) => {
  const normalizedAmount = Number(amount || 0);
  const safeAmount = Number.isFinite(normalizedAmount) ? normalizedAmount : 0;
  const normalizedCurrencyCode = normalizeCurrencyCode(
    currencyCode,
    DEFAULT_CURRENCY_CODE
  );
  const overrideSymbol =
    CURRENCY_SYMBOL_OVERRIDES[normalizedCurrencyCode] || '';

  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrencyCode,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits,
      maximumFractionDigits
    }).format(safeAmount);

    // Some currencies are rendered as ISO codes by Intl in certain locales.
    // Replace with override symbols when available for cleaner UI display.
    if (overrideSymbol && formatted.includes(normalizedCurrencyCode)) {
      return formatted.replace(normalizedCurrencyCode, overrideSymbol).trim();
    }

    return formatted;
  } catch {
    const fallbackSymbol = overrideSymbol || normalizedCurrencyCode;
    return `${fallbackSymbol} ${safeAmount.toFixed(maximumFractionDigits)}`;
  }
};

export const useOrganizationCurrency = ({
  accessToken = null,
  staleTime = DEFAULT_STALE_TIME_MS
} = {}) => {
  const settingsQuery = useQuery({
    queryKey: ['settings:get', String(accessToken || '')],
    enabled: Boolean(accessToken),
    staleTime,
    queryFn: async () => getSettingsRequest(accessToken)
  });

  const baseCurrencyCode = normalizeCurrencyCode(
    settingsQuery.data?.companyProfile?.currencyCode,
    DEFAULT_CURRENCY_CODE
  );
  const preferredDisplayCurrencyCode = normalizeCurrencyCode(
    settingsQuery.data?.finance?.displayCurrencyCode,
    baseCurrencyCode
  );
  const localeCode = String(
    settingsQuery.data?.companyProfile?.locale || 'en-US'
  ).trim();

  const exchangeRatesQuery = useQuery({
    queryKey: [
      'finance:exchange-rates',
      String(accessToken || ''),
      baseCurrencyCode
    ],
    enabled: Boolean(accessToken),
    staleTime,
    queryFn: async () =>
      getFinanceExchangeRatesRequest({
        accessToken,
        baseCurrencyCode
      })
  });

  const availableCurrencyCodes = useMemo(() => {
    const codes = new Set([baseCurrencyCode]);
    const rows = Array.isArray(exchangeRatesQuery.data?.rates)
      ? exchangeRatesQuery.data.rates
      : [];

    for (const row of rows) {
      const quoteCurrencyCode = normalizeCurrencyCode(
        row?.quoteCurrencyCode,
        ''
      );
      if (/^[A-Z]{3}$/.test(quoteCurrencyCode)) {
        codes.add(quoteCurrencyCode);
      }
    }

    return Array.from(codes).sort((a, b) => a.localeCompare(b));
  }, [baseCurrencyCode, exchangeRatesQuery.data?.rates]);

  const hasPreferredRate = useMemo(() => {
    if (preferredDisplayCurrencyCode === baseCurrencyCode) return true;
    return availableCurrencyCodes.includes(preferredDisplayCurrencyCode);
  }, [availableCurrencyCodes, baseCurrencyCode, preferredDisplayCurrencyCode]);

  const currencyCode = hasPreferredRate
    ? preferredDisplayCurrencyCode
    : baseCurrencyCode;

  const conversionRate = useMemo(() => {
    if (currencyCode === baseCurrencyCode) return 1;

    const rows = Array.isArray(exchangeRatesQuery.data?.rates)
      ? exchangeRatesQuery.data.rates
      : [];
    const rateRow = rows.find(
      (row) =>
        normalizeCurrencyCode(row?.quoteCurrencyCode, '') === currencyCode
    );
    const parsedRate = Number(rateRow?.rate || 0);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) return 1;
    return parsedRate;
  }, [baseCurrencyCode, currencyCode, exchangeRatesQuery.data?.rates]);

  const convertFromBaseAmount = useCallback(
    (amount) => roundMoney(Number(amount || 0) * Number(conversionRate || 1)),
    [conversionRate]
  );

  const convertToBaseAmount = useCallback(
    (amount) => {
      const normalizedAmount = Number(amount || 0);
      if (!Number.isFinite(normalizedAmount)) return 0;
      if (currencyCode === baseCurrencyCode)
        return roundMoney(normalizedAmount);
      const rate = Number(conversionRate || 0);
      if (!Number.isFinite(rate) || rate <= 0)
        return roundMoney(normalizedAmount);
      return roundMoney(normalizedAmount / rate);
    },
    [baseCurrencyCode, conversionRate, currencyCode]
  );

  const formatDisplayAmount = useCallback(
    (amount, options = {}) =>
      formatCurrency({
        amount,
        currencyCode,
        locale: localeCode || 'en-US',
        minimumFractionDigits:
          Number.isFinite(Number(options.minimumFractionDigits)) &&
          Number(options.minimumFractionDigits) >= 0
            ? Number(options.minimumFractionDigits)
            : 2,
        maximumFractionDigits:
          Number.isFinite(Number(options.maximumFractionDigits)) &&
          Number(options.maximumFractionDigits) >= 0
            ? Number(options.maximumFractionDigits)
            : 2
      }),
    [currencyCode, localeCode]
  );

  const formatFromBaseAmount = useCallback(
    (amount, options = {}) =>
      formatDisplayAmount(convertFromBaseAmount(amount), options),
    [convertFromBaseAmount, formatDisplayAmount]
  );

  return {
    currencyCode,
    baseCurrencyCode,
    preferredDisplayCurrencyCode,
    conversionRate,
    localeCode,
    availableCurrencyCodes,
    isUsingCurrencyFallback: currencyCode !== preferredDisplayCurrencyCode,
    isLoading:
      settingsQuery.isLoading ||
      settingsQuery.isFetching ||
      exchangeRatesQuery.isLoading ||
      exchangeRatesQuery.isFetching,
    error: settingsQuery.error || exchangeRatesQuery.error || null,
    convertFromBaseAmount,
    convertToBaseAmount,
    formatDisplayAmount,
    formatFromBaseAmount
  };
};

export default useOrganizationCurrency;
