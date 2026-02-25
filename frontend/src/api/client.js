import API_ENDPOINTS from './endpoints.js';

class ApiError extends Error {
  constructor(message, statusCode = 500, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

const sanitizeBaseUrl = value => String(value || '').trim().replace(/\/+$/, '');

const getDefaultBaseUrl = () => {
  const envBase = sanitizeBaseUrl(process.env.REACT_APP_API_BASE_URL);
  if (envBase) return envBase;

  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  const currentOrigin = window.location.origin;
  if (window.location.port === '3000') {
    return 'http://localhost:4000';
  }
  return sanitizeBaseUrl(currentOrigin);
};

const API_BASE_URL = getDefaultBaseUrl();

const buildUrl = path => {
  const normalizedPath = String(path || '').startsWith('/')
    ? String(path)
    : `/${String(path || '')}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const parseJsonSafe = async response => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const request = async ({
  method = 'GET',
  path,
  body = null,
  accessToken = null,
  headers = {}
}) => {
  const response = await fetch(buildUrl(path), {
    method,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new ApiError(
      payload?.message || `Request failed (${response.status})`,
      response.status,
      payload
    );
  }

  return payload;
};

export const authLoginRequest = ({ email, password }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_LOGIN,
    body: { email, password }
  });

export const authRegisterRequest = ({ email, password, organizationName }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_REGISTER,
    body: { email, password, organizationName }
  });

export const authRefreshRequest = () =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_REFRESH
  });

export const authMeRequest = accessToken =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.AUTH_ME,
    accessToken
  });

export const authLogoutRequest = accessToken =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_LOGOUT,
    accessToken
  });

const readData = payload => payload?.data;

export const getProductsRequest = accessToken =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.PRODUCTS,
    accessToken
  }).then(readData);

export const getProductsLowStockSummaryRequest = accessToken =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.PRODUCTS_LOW_STOCK_SUMMARY,
    accessToken
  }).then(readData);

export const getSuppliersRequest = accessToken =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.SUPPLIERS,
    accessToken
  }).then(readData);

export const getSupplierRankingsRequest = accessToken =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.SUPPLIERS_RANKINGS,
    accessToken
  }).then(readData);

export const getReportPurchaseOrderStatusSummaryRequest = accessToken =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.REPORT_PO_STATUS_SUMMARY,
    accessToken
  }).then(readData);

export const getReportSpendSummaryRequest = accessToken =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.REPORT_SPEND_SUMMARY,
    accessToken
  }).then(readData);

export const getReportSpendBySupplierRequest = accessToken =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.REPORT_SPEND_BY_SUPPLIER,
    accessToken
  }).then(readData);

export { ApiError, API_BASE_URL };

export default {
  request,
  authLoginRequest,
  authRegisterRequest,
  authRefreshRequest,
  authMeRequest,
  authLogoutRequest,
  getProductsRequest,
  getProductsLowStockSummaryRequest,
  getSuppliersRequest,
  getSupplierRankingsRequest,
  getReportPurchaseOrderStatusSummaryRequest,
  getReportSpendSummaryRequest,
  getReportSpendBySupplierRequest
};
