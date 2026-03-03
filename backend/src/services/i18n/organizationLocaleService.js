import OrganizationSettings from '../../models/OrganizationSettings.js';
import TaxConfiguration from '../../models/TaxConfiguration.js';

const normalizeCurrencyCode = (value, fallback = 'UGX') => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return normalized.length === 3 ? normalized : fallback;
};

const normalizeCountryCode = (value, fallback = 'UG') => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (normalized.length === 2 || normalized.length === 3) return normalized;
  return fallback;
};

const normalizeLocale = (value, fallback = 'en-UG') => {
  const normalized = String(value || '').trim();
  if (!normalized) return fallback;
  return normalized;
};

const normalizeTimezone = (value, fallback = 'UTC') => {
  const normalized = String(value || '').trim();
  if (!normalized) return fallback;

  try {
    Intl.DateTimeFormat('en-US', { timeZone: normalized }).format(new Date());
    return normalized;
  } catch {
    return fallback;
  }
};

export const resolveOrganizationLocaleContext = async ({
  organizationId,
  session = null
}) => {
  const settingsQuery = OrganizationSettings.findOne({
    organization: organizationId
  })
    .select(
      'companyProfile.timezone companyProfile.currencyCode companyProfile.locale companyProfile.countryCode companyProfile.dateFormat'
    )
    .lean();
  const taxQuery = TaxConfiguration.findOne({
    organization: organizationId
  })
    .select('countryCode currencyCode')
    .lean();

  if (session) {
    settingsQuery.session(session);
    taxQuery.session(session);
  }

  const [settings, taxConfig] = await Promise.all([settingsQuery, taxQuery]);

  return {
    timezone: normalizeTimezone(settings?.companyProfile?.timezone, 'UTC'),
    currencyCode: normalizeCurrencyCode(
      settings?.companyProfile?.currencyCode || taxConfig?.currencyCode,
      'UGX'
    ),
    locale: normalizeLocale(settings?.companyProfile?.locale, 'en-UG'),
    countryCode: normalizeCountryCode(
      settings?.companyProfile?.countryCode || taxConfig?.countryCode,
      'UG'
    ),
    dateFormat:
      String(settings?.companyProfile?.dateFormat || '').trim() || 'YYYY-MM-DD'
  };
};

export const buildTimeBucketExpression = ({
  dateField,
  period = 'month',
  timezone = 'UTC'
}) => {
  const normalizedPeriod =
    String(period || '').toLowerCase() === 'day' ? 'day' : 'month';
  const format = normalizedPeriod === 'day' ? '%Y-%m-%d' : '%Y-%m';

  return {
    $dateToString: {
      format,
      date: `$${String(dateField || '').replace(/^\$+/, '')}`,
      timezone: normalizeTimezone(timezone, 'UTC')
    }
  };
};

export default {
  buildTimeBucketExpression,
  resolveOrganizationLocaleContext
};
