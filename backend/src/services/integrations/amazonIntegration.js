import { getAmazonApiConfig } from '../../config/apiKeys.js';
import { AppError } from '../../errors/AppError.js';
import { ERROR_CODES } from '../../errors/errorCodes.js';

const REGION_ENDPOINTS = Object.freeze({
  na: 'https://sellingpartnerapi-na.amazon.com',
  eu: 'https://sellingpartnerapi-eu.amazon.com',
  fe: 'https://sellingpartnerapi-fe.amazon.com'
});

export const getAmazonIntegrationStatus = () => {
  const config = getAmazonApiConfig();
  return {
    provider: 'amazon',
    configured: config.isConfigured,
    missingKeys: config.missingKeys,
    region: config.region,
    endpoint: config.endpoint || REGION_ENDPOINTS[config.region] || null,
    marketplaceIds: config.marketplaceIds,
    capabilities: [
      'Selling Partner API readiness check',
      'Catalog sync foundation',
      'Order sync foundation'
    ],
    note: 'Amazon SP-API requests require AWS SigV4 signing, so this module currently provides readiness and config helpers only.'
  };
};

export const getAmazonSellingPartnerRequestContext = () => {
  const config = getAmazonApiConfig();
  if (!config.isConfigured) {
    throw new AppError(
      `Amazon integration is not configured. Missing: ${config.missingKeys.join(', ')}`,
      503,
      ERROR_CODES.INTEGRATION_NOT_CONFIGURED
    );
  }

  return {
    region: config.region,
    endpoint: config.endpoint || REGION_ENDPOINTS[config.region] || null,
    sellerId: config.sellerId,
    marketplaceIds: config.marketplaceIds
  };
};

export default {
  getAmazonIntegrationStatus,
  getAmazonSellingPartnerRequestContext
};
