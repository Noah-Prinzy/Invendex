import { getShopifyApiConfig } from '../../config/apiKeys.js';
import { AppError } from '../../errors/AppError.js';
import { ERROR_CODES } from '../../errors/errorCodes.js';
import { logger } from '../../observability/logger.js';

const DEFAULT_TIMEOUT_MS = 8000;

const normalizeLimit = (value, fallback = 10) => {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 50);
};

const getRequestTimeoutMs = (value = DEFAULT_TIMEOUT_MS) => {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(parsed, 1000), 20_000);
};

const getConfiguredShopifyApi = () => {
  const config = getShopifyApiConfig();
  if (config.isConfigured) return config;

  throw new AppError(
    `Shopify integration is not configured. Missing: ${config.missingKeys.join(', ')}`,
    503,
    ERROR_CODES.INTEGRATION_NOT_CONFIGURED
  );
};

const buildShopifyUrl = ({
  storeDomain,
  apiVersion,
  pathname,
  searchParams
}) => {
  const normalizedStoreDomain = String(storeDomain || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
  const normalizedPath = String(pathname || '')
    .trim()
    .replace(/^\/+/, '');

  const url = new URL(
    `/admin/api/${encodeURIComponent(apiVersion)}/${normalizedPath}`,
    `https://${normalizedStoreDomain}`
  );

  if (searchParams && typeof searchParams === 'object') {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value == null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  return url;
};

const runShopifyRequest = async ({
  pathname,
  searchParams = null,
  method = 'GET',
  body = null,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) => {
  const config = getConfiguredShopifyApi();
  const requestUrl = buildShopifyUrl({
    storeDomain: config.storeDomain,
    apiVersion: config.apiVersion,
    pathname,
    searchParams
  });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('Shopify request timed out')),
    getRequestTimeoutMs(timeoutMs)
  );

  let response;
  try {
    response = await fetch(requestUrl, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': config.adminApiAccessToken
      },
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error?.name === 'AbortError') {
      throw new AppError(
        'Shopify request timed out',
        504,
        ERROR_CODES.INTEGRATION_TIMEOUT
      );
    }

    logger.warn('shopify_request_failed', {
      error: error?.message || 'Unknown Shopify request failure'
    });
    throw new AppError(
      'Unable to reach Shopify',
      502,
      ERROR_CODES.INTEGRATION_REQUEST_FAILED
    );
  }

  clearTimeout(timeout);

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AppError(
      `Shopify request failed with status ${response.status}`,
      response.status >= 500 ? 502 : response.status,
      ERROR_CODES.INTEGRATION_REQUEST_FAILED
    );
  }

  return payload;
};

export const getShopifyIntegrationStatus = () => {
  const config = getShopifyApiConfig();
  return {
    provider: 'shopify',
    configured: config.isConfigured,
    missingKeys: config.missingKeys,
    storeDomain: config.storeDomain || null,
    apiVersion: config.apiVersion || null,
    capabilities: [
      'Catalog preview',
      'Order sync foundation',
      'Product import foundation'
    ]
  };
};

export const fetchShopifyProductsPreview = async ({ limit = 10 } = {}) => {
  const payload = await runShopifyRequest({
    pathname: 'products.json',
    searchParams: {
      limit: normalizeLimit(limit)
    }
  });

  const products = Array.isArray(payload?.products) ? payload.products : [];
  return products.map((product) => ({
    id: product?.id || null,
    title: product?.title || null,
    status: product?.status || null,
    vendor: product?.vendor || null,
    productType: product?.product_type || null,
    variantsCount: Array.isArray(product?.variants)
      ? product.variants.length
      : 0
  }));
};

export default {
  getShopifyIntegrationStatus,
  fetchShopifyProductsPreview
};
