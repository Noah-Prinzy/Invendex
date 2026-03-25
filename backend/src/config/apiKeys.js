const asString = (value) => String(value || '').trim();
const asBoolean = (value) =>
  ['1', 'true', 'yes', 'on'].includes(asString(value).toLowerCase());
const toCsv = (value) =>
  asString(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const buildMissingKeys = (entries) =>
  entries
    .filter((entry) => entry.required !== false && !asString(entry.value))
    .map((entry) => entry.key);

const withStatus = ({ provider, values, requiredEntries }) => {
  const missingKeys = buildMissingKeys(requiredEntries);
  return {
    provider,
    isConfigured: missingKeys.length === 0,
    missingKeys,
    ...values
  };
};

export const getShopifyApiConfig = () =>
  withStatus({
    provider: 'shopify',
    values: {
      storeDomain: asString(process.env.SHOPIFY_STORE_DOMAIN),
      adminApiAccessToken: asString(process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN),
      apiVersion: asString(process.env.SHOPIFY_API_VERSION) || '2025-01'
    },
    requiredEntries: [
      {
        key: 'SHOPIFY_STORE_DOMAIN',
        value: process.env.SHOPIFY_STORE_DOMAIN
      },
      {
        key: 'SHOPIFY_ADMIN_API_ACCESS_TOKEN',
        value: process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN
      }
    ]
  });

export const getQuickBooksApiConfig = () =>
  withStatus({
    provider: 'quickbooks',
    values: {
      environment: asBoolean(process.env.QUICKBOOKS_SANDBOX)
        ? 'sandbox'
        : 'production',
      companyId: asString(process.env.QUICKBOOKS_COMPANY_ID),
      clientId: asString(process.env.QUICKBOOKS_CLIENT_ID),
      clientSecret: asString(process.env.QUICKBOOKS_CLIENT_SECRET),
      accessToken: asString(process.env.QUICKBOOKS_ACCESS_TOKEN),
      refreshToken: asString(process.env.QUICKBOOKS_REFRESH_TOKEN),
      redirectUri: asString(process.env.QUICKBOOKS_REDIRECT_URI)
    },
    requiredEntries: [
      {
        key: 'QUICKBOOKS_COMPANY_ID',
        value: process.env.QUICKBOOKS_COMPANY_ID
      },
      {
        key: 'QUICKBOOKS_ACCESS_TOKEN',
        value: process.env.QUICKBOOKS_ACCESS_TOKEN
      }
    ]
  });

export const getAmazonApiConfig = () =>
  withStatus({
    provider: 'amazon',
    values: {
      region: asString(process.env.AMAZON_SP_API_REGION) || 'na',
      endpoint:
        asString(process.env.AMAZON_SP_API_ENDPOINT) ||
        'https://sellingpartnerapi-na.amazon.com',
      clientId: asString(process.env.AMAZON_SP_API_CLIENT_ID),
      clientSecret: asString(process.env.AMAZON_SP_API_CLIENT_SECRET),
      refreshToken: asString(process.env.AMAZON_SP_API_REFRESH_TOKEN),
      sellerId: asString(process.env.AMAZON_SP_API_SELLER_ID),
      marketplaceIds: toCsv(process.env.AMAZON_SP_API_MARKETPLACE_IDS)
    },
    requiredEntries: [
      {
        key: 'AMAZON_SP_API_CLIENT_ID',
        value: process.env.AMAZON_SP_API_CLIENT_ID
      },
      {
        key: 'AMAZON_SP_API_CLIENT_SECRET',
        value: process.env.AMAZON_SP_API_CLIENT_SECRET
      },
      {
        key: 'AMAZON_SP_API_REFRESH_TOKEN',
        value: process.env.AMAZON_SP_API_REFRESH_TOKEN
      },
      {
        key: 'AMAZON_SP_API_SELLER_ID',
        value: process.env.AMAZON_SP_API_SELLER_ID
      },
      {
        key: 'AMAZON_SP_API_MARKETPLACE_IDS',
        value: process.env.AMAZON_SP_API_MARKETPLACE_IDS
      }
    ]
  });

export const getIntegrationCatalog = () =>
  [getShopifyApiConfig(), getQuickBooksApiConfig(), getAmazonApiConfig()].map(
    (config) => ({
      provider: config.provider,
      isConfigured: config.isConfigured,
      missingKeys: config.missingKeys
    })
  );

export default {
  getShopifyApiConfig,
  getQuickBooksApiConfig,
  getAmazonApiConfig,
  getIntegrationCatalog
};
