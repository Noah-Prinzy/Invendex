import ExchangeRate from '../../models/ExchangeRate.js';
import OrganizationSettings from '../../models/OrganizationSettings.js';
import { AppError } from '../../errors/AppError.js';

const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const roundRate = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 1_000_000) / 1_000_000;

export const normalizeCurrencyCode = (value, fallback = 'UGX') => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();

  if (CURRENCY_CODE_REGEX.test(normalized)) {
    return normalized;
  }
  return String(fallback || 'UGX')
    .trim()
    .toUpperCase();
};

export const getOrganizationBaseCurrencyCode = async (
  organizationId,
  { session = null } = {}
) => {
  const query = OrganizationSettings.findOne({
    organization: organizationId
  })
    .select('companyProfile.currencyCode')
    .lean();
  if (session) {
    query.session(session);
  }

  const settings = await query;
  return normalizeCurrencyCode(settings?.companyProfile?.currencyCode, 'UGX');
};

const ensureNumericPositiveRate = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive number`, 400);
  }
  return roundRate(parsed);
};

const normalizeRateRow = (row = {}) => {
  const quoteCurrencyCode = normalizeCurrencyCode(row.quoteCurrencyCode, '');
  if (!CURRENCY_CODE_REGEX.test(quoteCurrencyCode)) {
    throw new AppError(
      'quoteCurrencyCode must be a 3-letter currency code',
      400
    );
  }

  return {
    quoteCurrencyCode,
    rate: ensureNumericPositiveRate(row.rate, 'rate'),
    source:
      String(row.source || '')
        .trim()
        .toUpperCase() === 'SYSTEM'
        ? 'SYSTEM'
        : 'MANUAL'
  };
};

const resolveBaseCurrencyCode = async ({
  organizationId,
  baseCurrencyCode = null,
  session = null
}) => {
  const organizationBaseCurrencyCode = await getOrganizationBaseCurrencyCode(
    organizationId,
    { session }
  );

  if (!baseCurrencyCode) {
    return organizationBaseCurrencyCode;
  }

  const normalizedRequestedBase = normalizeCurrencyCode(baseCurrencyCode, '');
  if (!CURRENCY_CODE_REGEX.test(normalizedRequestedBase)) {
    throw new AppError(
      'baseCurrencyCode must be a 3-letter currency code',
      400
    );
  }

  if (normalizedRequestedBase !== organizationBaseCurrencyCode) {
    throw new AppError(
      'baseCurrencyCode must match organization company profile currency',
      400
    );
  }

  return organizationBaseCurrencyCode;
};

const listExchangeRateRows = async ({
  organizationId,
  baseCurrencyCode,
  session = null
}) => {
  const query = ExchangeRate.find({
    organization: organizationId,
    baseCurrencyCode
  })
    .sort({ quoteCurrencyCode: 1 })
    .lean();
  if (session) {
    query.session(session);
  }
  return query;
};

export const getExchangeRates = async ({
  organizationId,
  baseCurrencyCode = null,
  session = null
}) => {
  const resolvedBaseCurrencyCode = await resolveBaseCurrencyCode({
    organizationId,
    baseCurrencyCode,
    session
  });

  const rows = await listExchangeRateRows({
    organizationId,
    baseCurrencyCode: resolvedBaseCurrencyCode,
    session
  });

  return {
    baseCurrencyCode: resolvedBaseCurrencyCode,
    rates: rows.map((row) => ({
      id: row._id,
      quoteCurrencyCode: row.quoteCurrencyCode,
      rate: roundRate(row.rate),
      source: row.source,
      effectiveAt: row.effectiveAt,
      updatedAt: row.updatedAt
    }))
  };
};

export const upsertExchangeRates = async ({
  organizationId,
  baseCurrencyCode = null,
  rates = [],
  updatedBy = null,
  session = null
}) => {
  const normalizedRates = Array.isArray(rates) ? rates : [];
  if (!normalizedRates.length) {
    throw new AppError('rates must include at least one row', 400);
  }

  const resolvedBaseCurrencyCode = await resolveBaseCurrencyCode({
    organizationId,
    baseCurrencyCode,
    session
  });

  const dedupeMap = new Map();
  for (const row of normalizedRates) {
    const normalizedRow = normalizeRateRow(row);
    if (normalizedRow.quoteCurrencyCode === resolvedBaseCurrencyCode) {
      throw new AppError(
        'quoteCurrencyCode cannot equal baseCurrencyCode',
        400
      );
    }
    dedupeMap.set(normalizedRow.quoteCurrencyCode, normalizedRow);
  }

  const operations = Array.from(dedupeMap.values()).map((row) => ({
    updateOne: {
      filter: {
        organization: organizationId,
        baseCurrencyCode: resolvedBaseCurrencyCode,
        quoteCurrencyCode: row.quoteCurrencyCode
      },
      update: {
        $set: {
          rate: row.rate,
          source: row.source,
          updatedBy: updatedBy || null,
          effectiveAt: new Date()
        }
      },
      upsert: true
    }
  }));

  await ExchangeRate.bulkWrite(operations, {
    session: session || undefined
  });

  return getExchangeRates({
    organizationId,
    baseCurrencyCode: resolvedBaseCurrencyCode,
    session
  });
};

const findRateRow = async ({
  organizationId,
  baseCurrencyCode,
  quoteCurrencyCode,
  session = null
}) => {
  const query = ExchangeRate.findOne({
    organization: organizationId,
    baseCurrencyCode,
    quoteCurrencyCode
  }).lean();
  if (session) {
    query.session(session);
  }
  return query;
};

export const resolveExchangeRate = async ({
  organizationId,
  fromCurrencyCode,
  toCurrencyCode,
  session = null
}) => {
  const from = normalizeCurrencyCode(fromCurrencyCode, '');
  const to = normalizeCurrencyCode(toCurrencyCode, '');
  if (!CURRENCY_CODE_REGEX.test(from) || !CURRENCY_CODE_REGEX.test(to)) {
    throw new AppError(
      'fromCurrencyCode and toCurrencyCode must be 3-letter currency codes',
      400
    );
  }

  if (from === to) {
    return {
      fromCurrencyCode: from,
      toCurrencyCode: to,
      rate: 1,
      path: `${from}->${to}`
    };
  }

  const organizationBaseCurrencyCode = await getOrganizationBaseCurrencyCode(
    organizationId,
    { session }
  );

  const direct = await findRateRow({
    organizationId,
    baseCurrencyCode: from,
    quoteCurrencyCode: to,
    session
  });
  if (direct) {
    return {
      fromCurrencyCode: from,
      toCurrencyCode: to,
      rate: roundRate(direct.rate),
      path: `${from}->${to}`
    };
  }

  const reverse = await findRateRow({
    organizationId,
    baseCurrencyCode: to,
    quoteCurrencyCode: from,
    session
  });
  if (reverse) {
    return {
      fromCurrencyCode: from,
      toCurrencyCode: to,
      rate: roundRate(1 / Number(reverse.rate || 1)),
      path: `${from}<-${to}`
    };
  }

  if (from === organizationBaseCurrencyCode) {
    const baseToTarget = await findRateRow({
      organizationId,
      baseCurrencyCode: organizationBaseCurrencyCode,
      quoteCurrencyCode: to,
      session
    });

    if (baseToTarget) {
      return {
        fromCurrencyCode: from,
        toCurrencyCode: to,
        rate: roundRate(baseToTarget.rate),
        path: `${organizationBaseCurrencyCode}->${to}`
      };
    }
  } else if (to === organizationBaseCurrencyCode) {
    const baseToSource = await findRateRow({
      organizationId,
      baseCurrencyCode: organizationBaseCurrencyCode,
      quoteCurrencyCode: from,
      session
    });

    if (baseToSource) {
      return {
        fromCurrencyCode: from,
        toCurrencyCode: to,
        rate: roundRate(1 / Number(baseToSource.rate || 1)),
        path: `${from}->${organizationBaseCurrencyCode}`
      };
    }
  } else {
    const [baseToFrom, baseToTo] = await Promise.all([
      findRateRow({
        organizationId,
        baseCurrencyCode: organizationBaseCurrencyCode,
        quoteCurrencyCode: from,
        session
      }),
      findRateRow({
        organizationId,
        baseCurrencyCode: organizationBaseCurrencyCode,
        quoteCurrencyCode: to,
        session
      })
    ]);

    if (baseToFrom && baseToTo) {
      const crossRate =
        Number(baseToTo.rate || 0) /
        Math.max(Number(baseToFrom.rate || 0), 1e-9);
      return {
        fromCurrencyCode: from,
        toCurrencyCode: to,
        rate: roundRate(crossRate),
        path: `${from}->${organizationBaseCurrencyCode}->${to}`
      };
    }
  }

  throw new AppError(`Exchange rate not configured for ${from} -> ${to}`, 409);
};

export const convertCurrencyAmount = async ({
  organizationId,
  amount,
  fromCurrencyCode,
  toCurrencyCode,
  session = null
}) => {
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount)) {
    throw new AppError('amount must be a valid number', 400);
  }

  const resolution = await resolveExchangeRate({
    organizationId,
    fromCurrencyCode,
    toCurrencyCode,
    session
  });

  return {
    fromCurrencyCode: resolution.fromCurrencyCode,
    toCurrencyCode: resolution.toCurrencyCode,
    rate: resolution.rate,
    path: resolution.path,
    originalAmount: roundMoney(normalizedAmount),
    convertedAmount: roundMoney(normalizedAmount * resolution.rate)
  };
};

export const buildCurrencyConversionContext = async ({
  organizationId,
  targetCurrencyCode = null,
  session = null
}) => {
  const baseCurrencyCode = await getOrganizationBaseCurrencyCode(
    organizationId,
    {
      session
    }
  );

  const currencyCode = normalizeCurrencyCode(
    targetCurrencyCode,
    baseCurrencyCode
  );
  if (currencyCode === baseCurrencyCode) {
    return {
      baseCurrencyCode,
      currencyCode,
      converted: false,
      rate: 1
    };
  }

  const resolution = await resolveExchangeRate({
    organizationId,
    fromCurrencyCode: baseCurrencyCode,
    toCurrencyCode: currencyCode,
    session
  });

  return {
    baseCurrencyCode,
    currencyCode,
    converted: true,
    rate: resolution.rate,
    path: resolution.path
  };
};

export const applyConversion = (amount, context) =>
  roundMoney(Number(amount || 0) * Number(context?.rate || 1));

export default {
  normalizeCurrencyCode,
  getOrganizationBaseCurrencyCode,
  getExchangeRates,
  upsertExchangeRates,
  resolveExchangeRate,
  convertCurrencyAmount,
  buildCurrencyConversionContext,
  applyConversion
};
