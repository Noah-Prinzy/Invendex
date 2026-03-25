import { getQuickBooksApiConfig } from '../../config/apiKeys.js';
import { AppError } from '../../errors/AppError.js';
import { ERROR_CODES } from '../../errors/errorCodes.js';
import { logger } from '../../observability/logger.js';

const DEFAULT_TIMEOUT_MS = 8000;

const getQuickBooksBaseUrl = (environment) =>
  environment === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';

const getRequestTimeoutMs = (value = DEFAULT_TIMEOUT_MS) => {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(parsed, 1000), 20_000);
};

const getConfiguredQuickBooksApi = () => {
  const config = getQuickBooksApiConfig();
  if (config.isConfigured) return config;

  throw new AppError(
    `QuickBooks integration is not configured. Missing: ${config.missingKeys.join(', ')}`,
    503,
    ERROR_CODES.INTEGRATION_NOT_CONFIGURED
  );
};

const runQuickBooksRequest = async ({
  pathname,
  searchParams = null,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) => {
  const config = getConfiguredQuickBooksApi();
  const baseUrl = getQuickBooksBaseUrl(config.environment);
  const url = new URL(pathname, baseUrl);

  if (searchParams && typeof searchParams === 'object') {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value == null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('QuickBooks request timed out')),
    getRequestTimeoutMs(timeoutMs)
  );

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${config.accessToken}`
      },
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error?.name === 'AbortError') {
      throw new AppError(
        'QuickBooks request timed out',
        504,
        ERROR_CODES.INTEGRATION_TIMEOUT
      );
    }

    logger.warn('quickbooks_request_failed', {
      error: error?.message || 'Unknown QuickBooks request failure'
    });
    throw new AppError(
      'Unable to reach QuickBooks',
      502,
      ERROR_CODES.INTEGRATION_REQUEST_FAILED
    );
  }

  clearTimeout(timeout);

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AppError(
      `QuickBooks request failed with status ${response.status}`,
      response.status >= 500 ? 502 : response.status,
      ERROR_CODES.INTEGRATION_REQUEST_FAILED
    );
  }

  return payload;
};

export const getQuickBooksIntegrationStatus = () => {
  const config = getQuickBooksApiConfig();
  return {
    provider: 'quickbooks',
    configured: config.isConfigured,
    missingKeys: config.missingKeys,
    environment: config.environment,
    companyId: config.companyId || null,
    capabilities: [
      'Company info preview',
      'Accounting sync foundation',
      'Invoice export foundation'
    ]
  };
};

export const fetchQuickBooksCompanyInfoPreview = async () => {
  const config = getConfiguredQuickBooksApi();
  const payload = await runQuickBooksRequest({
    pathname: `/v3/company/${encodeURIComponent(
      config.companyId
    )}/companyinfo/${encodeURIComponent(config.companyId)}`
  });

  const info = payload?.CompanyInfo || {};
  return {
    companyName: info?.CompanyName || null,
    legalName: info?.LegalName || null,
    country: info?.Country || null,
    email: info?.Email?.Address || null,
    supportedLanguages: Array.isArray(info?.SupportedLanguages)
      ? info.SupportedLanguages
      : []
  };
};

export default {
  getQuickBooksIntegrationStatus,
  fetchQuickBooksCompanyInfoPreview
};
