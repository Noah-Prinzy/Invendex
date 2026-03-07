import API_ENDPOINTS from './endpoints.js';
import { captureFrontendException } from '../observability/errorTracker.js';
import { createRequestTrace } from '../observability/traceContext.js';
import { enqueueOfflineMutation } from '../offline/offlineQueue.js';

class ApiError extends Error {
  constructor(message, statusCode = 500, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

const sanitizeBaseUrl = (value) =>
  String(value || '')
    .trim()
    .replace(/\/+$/, '');

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
const CSRF_HEADER_NAME = 'x-csrf-token';
let csrfToken = '';
const OFFLINE_QUEUE_ENABLED =
  String(process.env.REACT_APP_OFFLINE_QUEUE_ENABLED || 'true')
    .trim()
    .toLowerCase() === 'true';
const CLIENT_DEVICE_ID_KEY = 'ledgerly_client_device_id_v1';

const getClientDeviceId = () => {
  if (typeof window === 'undefined') return 'device_server';

  try {
    const existing = String(
      window.localStorage.getItem(CLIENT_DEVICE_ID_KEY) || ''
    ).trim();
    if (existing) return existing;

    const generated = `device_${Date.now()}_${Math.random()
      .toString(16)
      .slice(2, 10)}`;
    window.localStorage.setItem(CLIENT_DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return 'device_browser';
  }
};

const emitTraceLog = (message, meta = {}) => {
  if (process.env.NODE_ENV === 'production') return;
  if (
    String(process.env.REACT_APP_API_TRACE_LOG || 'false').toLowerCase() !==
    'true'
  )
    return;
  console.info(`[api_trace] ${message}`, meta);
};

const buildUrl = (path) => {
  const normalizedPath = String(path || '').startsWith('/')
    ? String(path)
    : `/${String(path || '')}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const parseJsonSafe = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const parseContentDispositionFilename = (value = '') => {
  const normalized = String(value || '');
  const utf8Match = normalized.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const basicMatch = normalized.match(/filename="?([^";]+)"?/i);
  return basicMatch?.[1] ? String(basicMatch[1]).trim() : '';
};

const request = async ({
  method = 'GET',
  path,
  body = null,
  accessToken = null,
  headers = {},
  idempotencyKey = null
}) => {
  const normalizedMethod = String(method || 'GET').toUpperCase();
  const trace = createRequestTrace({
    method: normalizedMethod,
    path
  });

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method: normalizedMethod,
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        'x-request-id': trace.requestId,
        'x-client-trace-id': trace.clientTraceId,
        'x-device-id': getClientDeviceId(),
        ...(idempotencyKey
          ? { 'idempotency-key': String(idempotencyKey) }
          : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(normalizedMethod !== 'GET' &&
        normalizedMethod !== 'HEAD' &&
        csrfToken
          ? { [CSRF_HEADER_NAME]: csrfToken }
          : {}),
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    const wrappedError = new ApiError(
      'Unable to reach the server. Check your network connection and try again.',
      0,
      {
        requestId: trace.requestId,
        clientTraceId: trace.clientTraceId,
        method: normalizedMethod,
        path
      }
    );

    await captureFrontendException(error, {
      scope: 'api_network_failure',
      requestId: trace.requestId,
      clientTraceId: trace.clientTraceId,
      method: normalizedMethod,
      path
    });

    throw wrappedError;
  }

  const payload = await parseJsonSafe(response);
  const serverRequestId =
    String(response.headers?.get('x-request-id') || '').trim() ||
    trace.requestId;

  emitTraceLog('response_received', {
    requestId: trace.requestId,
    serverRequestId,
    clientTraceId: trace.clientTraceId,
    method: normalizedMethod,
    path,
    statusCode: response.status
  });

  if (!response.ok) {
    const apiError = new ApiError(
      payload?.message || `Request failed (${response.status})`,
      response.status,
      {
        ...(payload || {}),
        trace: {
          requestId: trace.requestId,
          serverRequestId,
          clientTraceId: trace.clientTraceId,
          method: normalizedMethod,
          path
        }
      }
    );

    if (response.status >= 500) {
      await captureFrontendException(apiError, {
        scope: 'api_server_error',
        requestId: trace.requestId,
        serverRequestId,
        clientTraceId: trace.clientTraceId,
        method: normalizedMethod,
        path,
        statusCode: response.status
      });
    }

    throw apiError;
  }

  return payload;
};

const requestBinary = async ({ method = 'GET', path, accessToken = null }) => {
  const normalizedMethod = String(method || 'GET').toUpperCase();
  const trace = createRequestTrace({
    method: normalizedMethod,
    path
  });

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method: normalizedMethod,
      credentials: 'include',
      headers: {
        'x-request-id': trace.requestId,
        'x-client-trace-id': trace.clientTraceId,
        'x-device-id': getClientDeviceId(),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
      }
    });
  } catch {
    throw new ApiError(
      'Unable to reach the server. Check your network connection and try again.',
      0,
      {
        requestId: trace.requestId,
        clientTraceId: trace.clientTraceId,
        method: normalizedMethod,
        path
      }
    );
  }

  if (!response.ok) {
    const payload = await parseJsonSafe(response);
    throw new ApiError(
      payload?.message || `Request failed (${response.status})`,
      response.status,
      payload || null
    );
  }

  const fileName = parseContentDispositionFilename(
    response.headers.get('content-disposition')
  );
  const contentType = String(response.headers.get('content-type') || '').trim();
  const blob = await response.blob();
  return {
    blob,
    fileName,
    contentType
  };
};

export const authLoginRequest = ({ email, password }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_LOGIN,
    body: { email, password }
  });

export const authAdminLoginRequest = ({
  username = '',
  email = '',
  password
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_ADMIN_LOGIN,
    body: { username, email, password }
  });

export const authEmployeeLoginRequest = ({
  companyName,
  username = '',
  email = '',
  password
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_EMPLOYEE_LOGIN,
    body: { companyName, username, email, password }
  });

export const authEmployeeSignupRequest = ({
  companyName,
  username,
  email,
  mobileNumber,
  password,
  confirmPassword
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_EMPLOYEE_SIGNUP,
    body: {
      companyName,
      username,
      email,
      mobileNumber,
      password,
      confirmPassword
    }
  });

export const authApproveEmployeeSignupRequest = ({
  accessToken,
  requestId,
  reason = ''
}) =>
  request({
    method: 'POST',
    path: `${API_ENDPOINTS.AUTH_EMPLOYEE_SIGNUP_APPROVE_BASE}/${requestId}/approve`,
    accessToken,
    body: reason ? { reason } : {}
  }).then(readData);

export const authDeclineEmployeeSignupRequest = ({
  accessToken,
  requestId,
  reason = ''
}) =>
  request({
    method: 'POST',
    path: `${API_ENDPOINTS.AUTH_EMPLOYEE_SIGNUP_APPROVE_BASE}/${requestId}/decline`,
    accessToken,
    body: reason ? { reason } : {}
  }).then(readData);

export const authRegisterRequest = ({
  username,
  email,
  mobileNumber,
  password,
  confirmPassword,
  organizationName
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_REGISTER,
    body: {
      username,
      email,
      mobileNumber,
      password,
      confirmPassword,
      organizationName
    }
  });

export const authVerifyEmailRequest = ({ email }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_VERIFY_EMAIL_REQUEST,
    body: { email }
  });

export const authVerifyEmailConfirmRequest = ({ email, token }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_VERIFY_EMAIL,
    body: { email, token }
  });

export const authForgotPasswordRequest = ({ email }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_FORGOT_PASSWORD,
    body: { email }
  });

export const authResetPasswordRequest = ({
  email,
  token,
  password,
  confirmPassword
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_RESET_PASSWORD,
    body: { email, token, password, confirmPassword }
  });

export const authTwoFactorVerifyLoginRequest = ({
  twoFactorToken,
  code = '',
  recoveryCode = ''
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_2FA_VERIFY_LOGIN,
    body: {
      twoFactorToken,
      ...(String(code || '').trim() ? { code } : {}),
      ...(String(recoveryCode || '').trim() ? { recoveryCode } : {})
    }
  });

export const authCsrfTokenRequest = async () => {
  const payload = await request({
    method: 'GET',
    path: API_ENDPOINTS.AUTH_CSRF_TOKEN
  });

  const token = String(payload?.data?.csrfToken || '').trim();
  if (token) {
    csrfToken = token;
  }

  return payload;
};

export const authRefreshRequest = () =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_REFRESH
  });

export const authMeRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.AUTH_ME,
    accessToken
  });

export const authTwoFactorStatusRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.AUTH_2FA_STATUS,
    accessToken
  });

export const authTwoFactorSetupRequest = ({ accessToken, currentPassword }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_2FA_SETUP,
    accessToken,
    body: {
      currentPassword
    }
  });

export const authTwoFactorEnableRequest = ({
  accessToken,
  currentPassword,
  code
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_2FA_ENABLE,
    accessToken,
    body: {
      currentPassword,
      code
    }
  });

export const authTwoFactorDisableRequest = ({
  accessToken,
  currentPassword,
  code = '',
  recoveryCode = ''
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_2FA_DISABLE,
    accessToken,
    body: {
      currentPassword,
      ...(String(code || '').trim() ? { code } : {}),
      ...(String(recoveryCode || '').trim() ? { recoveryCode } : {})
    }
  });

export const authTwoFactorRegenerateRecoveryCodesRequest = ({
  accessToken,
  currentPassword,
  code = '',
  recoveryCode = ''
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_2FA_RECOVERY_REGENERATE,
    accessToken,
    body: {
      currentPassword,
      ...(String(code || '').trim() ? { code } : {}),
      ...(String(recoveryCode || '').trim() ? { recoveryCode } : {})
    }
  });

export const authListSessionsRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.AUTH_SESSIONS,
    accessToken
  });

export const authRevokeSessionRequest = ({ accessToken, sessionId }) =>
  request({
    method: 'DELETE',
    path: `${API_ENDPOINTS.AUTH_SESSIONS}/${sessionId}`,
    accessToken
  });

export const authLogoutOtherSessionsRequest = (accessToken) =>
  request({
    method: 'DELETE',
    path: API_ENDPOINTS.AUTH_SESSIONS_OTHERS,
    accessToken
  });

export const authUpdatePreferencesRequest = ({
  accessToken,
  uiTheme,
  mobileNumber
}) =>
  request({
    method: 'PATCH',
    path: API_ENDPOINTS.AUTH_ME_PREFERENCES,
    accessToken,
    body: {
      ...(uiTheme !== undefined ? { uiTheme } : {}),
      ...(mobileNumber !== undefined ? { mobileNumber } : {})
    }
  });

export const authLogoutRequest = (accessToken) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_LOGOUT,
    accessToken
  });

const readData = (payload) => payload?.data;

export const getProductsRequest = (accessToken, filters = {}) => {
  const query = new URLSearchParams();
  if (filters?.q) query.set('q', String(filters.q));
  if (filters?.sku) query.set('sku', String(filters.sku));
  if (filters?.barcode) query.set('barcode', String(filters.barcode));
  if (filters?.category) query.set('category', String(filters.category));
  if (filters?.warehouseId)
    query.set('warehouseId', String(filters.warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.PRODUCTS}${suffix}`,
    accessToken
  }).then(readData);
};

export const getDeletedProductsRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.PRODUCTS_DELETED,
    accessToken
  }).then(readData);

export const getProductsHealthScoreRequest = ({
  accessToken,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.PRODUCTS_HEALTH_SCORE}${suffix}`,
    accessToken
  }).then(readData);
};

export const getDashboardTopSellingItemsRequest = ({
  accessToken,
  days = 30,
  limit = 10,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  query.set('days', String(days));
  query.set('limit', String(limit));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.DASHBOARD_TOP_SELLING_ITEMS}${suffix}`,
    accessToken
  }).then(readData);
};

export const getDashboardTurnoverSkusRequest = ({
  accessToken,
  days = 30,
  limit = 20,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  query.set('days', String(days));
  query.set('limit', String(limit));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.DASHBOARD_TURNOVER_SKUS}${suffix}`,
    accessToken
  }).then(readData);
};

export const getDashboardSlowMovingSkusRequest = ({
  accessToken,
  days = 60,
  limit = 20,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  query.set('days', String(days));
  query.set('limit', String(limit));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.DASHBOARD_SLOW_MOVING_SKUS}${suffix}`,
    accessToken
  }).then(readData);
};

export const getDashboardStockAgingBucketsRequest = ({
  accessToken,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.DASHBOARD_STOCK_AGING_BUCKETS}${suffix}`,
    accessToken
  }).then(readData);
};

export const getDashboardSupplierRankingRequest = ({
  accessToken,
  days = 180,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  query.set('days', String(days));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.DASHBOARD_SUPPLIER_RANKING}${suffix}`,
    accessToken
  }).then(readData);
};

export const getDashboardDeadStockRequest = ({
  accessToken,
  days = 90,
  warehouseId = null,
  limit = 100
}) => {
  const query = new URLSearchParams();
  query.set('days', String(days));
  query.set('limit', String(limit));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.DASHBOARD_DEAD_STOCK}${suffix}`,
    accessToken
  }).then(readData);
};

export const getDashboardInventoryAdvisorRequest = ({
  accessToken,
  days = 30,
  warehouseId = null,
  limit = 25
}) => {
  const query = new URLSearchParams();
  query.set('days', String(days));
  query.set('limit', String(limit));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.DASHBOARD_INVENTORY_ADVISOR}${suffix}`,
    accessToken
  }).then(readData);
};

export const getDashboardDeadStockRescueRequest = ({
  accessToken,
  days = 90,
  warehouseId = null,
  limit = 50
}) => {
  const query = new URLSearchParams();
  query.set('days', String(days));
  query.set('limit', String(limit));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.DASHBOARD_DEAD_STOCK_RESCUE}${suffix}`,
    accessToken
  }).then(readData);
};

export const getDashboardDigitalTwinRequest = ({
  accessToken,
  warehouseId = null,
  zoneLimit = 12,
  binLimitPerZone = 120
}) => {
  const query = new URLSearchParams();
  query.set('zoneLimit', String(zoneLimit));
  query.set('binLimitPerZone', String(binLimitPerZone));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.DASHBOARD_DIGITAL_TWIN}${suffix}`,
    accessToken
  }).then(readData);
};

export const getAiDemandAnomaliesRequest = ({
  accessToken,
  productId,
  days = 180,
  zThreshold = 2.5,
  minDemand = 1
}) => {
  const normalizedProductId = String(productId || '').trim();
  if (!normalizedProductId) {
    return Promise.resolve({
      productId: null,
      anomalyCount: 0,
      anomalies: [],
      status: 'missing_product'
    });
  }

  const query = new URLSearchParams();
  query.set('days', String(days));
  query.set('zThreshold', String(zThreshold));
  query.set('minDemand', String(minDemand));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.AI_ANOMALIES}/${normalizedProductId}${suffix}`,
    accessToken
  }).then(readData);
};

export const getAiSupplierReliabilityRequest = ({
  accessToken,
  days = 180,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  query.set('days', String(days));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.AI_SUPPLIER_RELIABILITY}${suffix}`,
    accessToken
  }).then(readData);
};

export const createProductRequest = ({
  accessToken,
  name,
  sku = '',
  skuPrefix = '',
  isVariant = false,
  parentProduct = '',
  variantAttributes = {},
  uom = null,
  price,
  category = '',
  description = '',
  lowStockThreshold = 5,
  barcode = '',
  barcodeType = ''
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.PRODUCTS,
    accessToken,
    body: {
      name,
      ...(String(sku || '').trim() ? { sku } : {}),
      ...(String(skuPrefix || '').trim() ? { skuPrefix } : {}),
      price,
      category,
      description,
      lowStockThreshold,
      isVariant: isVariant === true,
      ...(String(parentProduct || '').trim()
        ? { parentProduct: String(parentProduct || '').trim() }
        : {}),
      ...(variantAttributes &&
      typeof variantAttributes === 'object' &&
      Object.keys(variantAttributes).length
        ? { variantAttributes }
        : {}),
      ...(uom && typeof uom === 'object' ? { uom } : {}),
      ...(String(barcode || '').trim() ? { barcode } : {}),
      ...(String(barcodeType || '').trim() ? { barcodeType } : {})
    }
  }).then(readData);

export const createProductsBulkImportRequest = ({
  accessToken,
  products,
  fieldMap = {},
  options = {}
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.PRODUCTS_BULK_IMPORT,
    accessToken,
    body: {
      products,
      fieldMap,
      options
    }
  }).then(readData);

export const createProductsBulkImportJobRequest = ({
  accessToken,
  products,
  fieldMap = {},
  options = {}
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.PRODUCTS_BULK_IMPORT_JOBS,
    accessToken,
    body: {
      products,
      fieldMap,
      options
    }
  }).then(readData);

export const getProductsBulkImportJobStatusRequest = ({ accessToken, jobId }) =>
  request({
    method: 'GET',
    path: `${API_ENDPOINTS.PRODUCTS_BULK_IMPORT_JOBS}/${jobId}`,
    accessToken
  }).then(readData);

export const softDeleteProductRequest = ({ accessToken, productId }) =>
  request({
    method: 'DELETE',
    path: `${API_ENDPOINTS.PRODUCTS}/${productId}`,
    accessToken
  }).then(readData);

export const restoreDeletedProductRequest = ({ accessToken, productId }) =>
  request({
    method: 'PATCH',
    path: `${API_ENDPOINTS.PRODUCTS}/${productId}/restore`,
    accessToken
  }).then(readData);

export const permanentlyDeleteProductRequest = ({ accessToken, productId }) =>
  request({
    method: 'DELETE',
    path: `${API_ENDPOINTS.PRODUCTS}/${productId}/permanent`,
    accessToken
  }).then(readData);

export const downloadProductLabelRequest = ({
  accessToken,
  productId,
  type = 'auto',
  scale = 3,
  includeText = true
}) => {
  const query = new URLSearchParams();
  if (String(type || '').trim()) query.set('type', String(type || '').trim());
  if (Number.isFinite(Number(scale))) query.set('scale', String(scale));
  query.set('includeText', includeText === false ? 'false' : 'true');
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return requestBinary({
    method: 'GET',
    path: `${API_ENDPOINTS.PRODUCTS_LABEL}/${productId}/label${suffix}`,
    accessToken
  });
};

export const getPurchaseOrdersRequest = ({
  accessToken,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.PURCHASE_ORDERS}${suffix}`,
    accessToken
  }).then(readData);
};

export const getUsersRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.USERS,
    accessToken
  }).then(readData);

export const getUserRolePermissionsMatrixRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.USERS_ROLE_PERMISSIONS_MATRIX,
    accessToken
  }).then(readData);

export const updateUserRolePermissionsMatrixRequest = ({
  accessToken,
  role,
  permissions = []
}) =>
  request({
    method: 'PATCH',
    path: `${API_ENDPOINTS.USERS_ROLE_PERMISSIONS_MATRIX}/${role}`,
    accessToken,
    body: { permissions }
  }).then(readData);

export const getNotificationsRequest = ({
  accessToken,
  limit = 20,
  unreadOnly = false,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  query.set('limit', String(limit));
  if (unreadOnly) {
    query.set('unreadOnly', 'true');
  }
  if (warehouseId) {
    query.set('warehouseId', String(warehouseId));
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.NOTIFICATIONS}${suffix}`,
    accessToken
  }).then(readData);
};

export const markNotificationReadRequest = ({ accessToken, notificationId }) =>
  request({
    method: 'PATCH',
    path: `${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`,
    accessToken
  }).then(readData);

export const markAllNotificationsReadRequest = ({
  accessToken,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  if (warehouseId) {
    query.set('warehouseId', String(warehouseId));
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'PATCH',
    path: `${API_ENDPOINTS.NOTIFICATIONS_READ_ALL}${suffix}`,
    accessToken
  }).then(readData);
};

export const getSettingsRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.SETTINGS,
    accessToken
  }).then(readData);

export const patchSettingsRequest = ({ accessToken, payload }) =>
  request({
    method: 'PATCH',
    path: API_ENDPOINTS.SETTINGS,
    accessToken,
    body: payload || {}
  }).then(readData);

export const getFinanceValuationConfigRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.FINANCE_VALUATION_METHOD,
    accessToken
  }).then(readData);

export const patchFinanceValuationConfigRequest = ({
  accessToken,
  defaultMethod,
  allowMethodOverride
}) =>
  request({
    method: 'PATCH',
    path: API_ENDPOINTS.FINANCE_VALUATION_METHOD,
    accessToken,
    body: {
      defaultMethod,
      ...(allowMethodOverride !== undefined ? { allowMethodOverride } : {})
    }
  }).then(readData);

export const getFinanceTaxConfigRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.FINANCE_TAX_CONFIG,
    accessToken
  }).then(readData);

export const patchFinanceTaxConfigRequest = ({ accessToken, payload }) =>
  request({
    method: 'PATCH',
    path: API_ENDPOINTS.FINANCE_TAX_CONFIG,
    accessToken,
    body: payload || {}
  }).then(readData);

export const getFinanceNotificationSettingsRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.FINANCE_NOTIFICATION_SETTINGS,
    accessToken
  }).then(readData);

export const patchFinanceNotificationSettingsRequest = ({
  accessToken,
  payload
}) =>
  request({
    method: 'PATCH',
    path: API_ENDPOINTS.FINANCE_NOTIFICATION_SETTINGS,
    accessToken,
    body: payload || {}
  }).then(readData);

export const getFinanceRealtimeStatsRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.FINANCE_REALTIME_STATS,
    accessToken
  }).then(readData);

export const getFinanceExchangeRatesRequest = ({
  accessToken,
  baseCurrencyCode = null
}) => {
  const query = new URLSearchParams();
  if (baseCurrencyCode) {
    query.set('baseCurrencyCode', String(baseCurrencyCode).toUpperCase());
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.FINANCE_EXCHANGE_RATES}${suffix}`,
    accessToken
  }).then(readData);
};

export const putFinanceExchangeRatesRequest = ({
  accessToken,
  baseCurrencyCode = null,
  rates = []
}) =>
  request({
    method: 'PUT',
    path: API_ENDPOINTS.FINANCE_EXCHANGE_RATES,
    accessToken,
    body: {
      ...(String(baseCurrencyCode || '').trim()
        ? { baseCurrencyCode: String(baseCurrencyCode).trim().toUpperCase() }
        : {}),
      rates: Array.isArray(rates) ? rates : []
    }
  }).then(readData);

export const convertFinanceCurrencyRequest = ({
  accessToken,
  amount,
  fromCurrencyCode,
  toCurrencyCode
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.FINANCE_CONVERT_CURRENCY,
    accessToken,
    body: {
      amount,
      fromCurrencyCode: String(fromCurrencyCode || '')
        .trim()
        .toUpperCase(),
      toCurrencyCode: String(toCurrencyCode || '')
        .trim()
        .toUpperCase()
    }
  }).then(readData);

export const getFinanceInventoryValuationRequest = ({
  accessToken,
  warehouseId = null,
  method = null,
  currencyCode = null
}) => {
  const query = new URLSearchParams();
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  if (method) query.set('method', String(method));
  if (currencyCode) query.set('currencyCode', String(currencyCode));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.FINANCE_VALUATION}${suffix}`,
    accessToken
  }).then(readData);
};

export const getFinanceCogsEntriesRequest = ({
  accessToken,
  from = null,
  to = null,
  productId = null,
  warehouseId = null,
  currencyCode = null
}) => {
  const query = new URLSearchParams();
  if (from) query.set('from', String(from));
  if (to) query.set('to', String(to));
  if (productId) query.set('productId', String(productId));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  if (currencyCode) query.set('currencyCode', String(currencyCode));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.FINANCE_COGS}${suffix}`,
    accessToken
  }).then(readData);
};

export const getFinanceGrossMarginRequest = ({
  accessToken,
  from = null,
  to = null,
  groupBy = 'day',
  warehouseId = null,
  currencyCode = null
}) => {
  const query = new URLSearchParams();
  if (from) query.set('from', String(from));
  if (to) query.set('to', String(to));
  if (groupBy) query.set('groupBy', String(groupBy));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  if (currencyCode) query.set('currencyCode', String(currencyCode));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.FINANCE_GROSS_MARGIN}${suffix}`,
    accessToken
  }).then(readData);
};

export const getFinanceDeadStockRequest = ({
  accessToken,
  days = null,
  warehouseId = null,
  currencyCode = null
}) => {
  const query = new URLSearchParams();
  if (days !== null && days !== undefined && days !== '') {
    query.set('days', String(days));
  }
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  if (currencyCode) query.set('currencyCode', String(currencyCode));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.FINANCE_DEAD_STOCK}${suffix}`,
    accessToken
  }).then(readData);
};

export const getOnlineUsersRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.USERS_ONLINE,
    accessToken
  }).then(readData);

export const getUserProductivityRequest = ({
  accessToken,
  days = 7,
  limit = 25
}) => {
  const query = new URLSearchParams();
  query.set('days', String(days));
  query.set('limit', String(limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.USERS_PRODUCTIVITY}${suffix}`,
    accessToken
  }).then(readData);
};

export const getUserInvitesRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.USERS_INVITES,
    accessToken
  }).then(readData);

export const createUserInviteRequest = ({
  accessToken,
  email = '',
  expiresInHours = null
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.USERS_INVITES,
    accessToken,
    body: {
      email,
      ...(Number.isFinite(Number(expiresInHours))
        ? { expiresInHours: Number(expiresInHours) }
        : {})
    }
  }).then(readData);

export const revokeUserInviteRequest = ({ accessToken, inviteId }) =>
  request({
    method: 'PATCH',
    path: `${API_ENDPOINTS.USERS_INVITES}/${inviteId}/revoke`,
    accessToken
  }).then(readData);

export const updateUserStatusRequest = ({ accessToken, userId, isActive }) =>
  request({
    method: 'PATCH',
    path: `${API_ENDPOINTS.USERS}/${userId}/status`,
    accessToken,
    body: { isActive }
  }).then(readData);

export const updateUserRoleRequest = ({ accessToken, userId, role }) =>
  request({
    method: 'PATCH',
    path: `${API_ENDPOINTS.USERS}/${userId}/role`,
    accessToken,
    body: { role }
  }).then(readData);

export const getProductsLowStockSummaryRequest = ({
  accessToken,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.PRODUCTS_LOW_STOCK_SUMMARY}${suffix}`,
    accessToken
  }).then(readData);
};

export const adjustProductStockRequest = async ({
  accessToken,
  productId,
  amount,
  reason,
  warehouseId,
  idempotencyKey = null
}) => {
  try {
    return await request({
      method: 'PATCH',
      path: `${API_ENDPOINTS.PRODUCTS}/${productId}/stock`,
      accessToken,
      idempotencyKey,
      body: {
        amount,
        reason,
        warehouseId
      }
    }).then(readData);
  } catch (error) {
    if (
      OFFLINE_QUEUE_ENABLED &&
      error instanceof ApiError &&
      error.statusCode === 0
    ) {
      const queued = enqueueOfflineMutation({
        mutationId: idempotencyKey || null,
        type: 'inventory.adjust',
        payload: {
          productId,
          warehouseId,
          amount,
          reason
        }
      });

      return {
        queued: true,
        offlineMutationId: queued.mutationId,
        queueSize: queued.queueSize
      };
    }

    throw error;
  }
};

export const listInventoryStocktakesRequest = ({
  accessToken,
  warehouseId = null,
  status = '',
  limit = 50
}) => {
  const query = new URLSearchParams();
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  if (status) query.set('status', String(status).toUpperCase());
  query.set('limit', String(limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.INVENTORY_STOCKTAKES}${suffix}`,
    accessToken
  }).then(readData);
};

export const getInventoryStocktakeSessionRequest = ({
  accessToken,
  sessionId
}) =>
  request({
    method: 'GET',
    path: `${API_ENDPOINTS.INVENTORY_STOCKTAKES}/${sessionId}`,
    accessToken
  }).then(readData);

export const createInventoryStocktakeSessionRequest = ({
  accessToken,
  warehouseId,
  title = '',
  notes = '',
  productIds = []
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.INVENTORY_STOCKTAKES,
    accessToken,
    body: {
      warehouseId,
      ...(String(title || '').trim()
        ? { title: String(title || '').trim() }
        : {}),
      ...(String(notes || '').trim()
        ? { notes: String(notes || '').trim() }
        : {}),
      ...(Array.isArray(productIds) && productIds.length ? { productIds } : {})
    }
  }).then(readData);

export const submitInventoryStocktakeCountsRequest = ({
  accessToken,
  sessionId,
  counts
}) =>
  request({
    method: 'PATCH',
    path: `${API_ENDPOINTS.INVENTORY_STOCKTAKES}/${sessionId}/counts`,
    accessToken,
    body: {
      counts
    }
  }).then(readData);

export const approveInventoryStocktakeSessionRequest = ({
  accessToken,
  sessionId
}) =>
  request({
    method: 'POST',
    path: `${API_ENDPOINTS.INVENTORY_STOCKTAKES}/${sessionId}/approve`,
    accessToken
  }).then(readData);

export const scanInventoryStocktakeImageRequest = ({
  accessToken,
  sessionId,
  imageDataUrl = '',
  imageBase64 = '',
  maxDetections = 50,
  confidenceThreshold = 0.35
}) =>
  request({
    method: 'POST',
    path: `${API_ENDPOINTS.INVENTORY_STOCKTAKES}/${sessionId}/vision-scan`,
    accessToken,
    body: {
      ...(String(imageDataUrl || '').trim()
        ? { imageDataUrl: String(imageDataUrl || '').trim() }
        : {}),
      ...(String(imageBase64 || '').trim()
        ? { imageBase64: String(imageBase64 || '').trim() }
        : {}),
      ...(Number.isFinite(Number(maxDetections))
        ? { maxDetections: Number(maxDetections) }
        : {}),
      ...(Number.isFinite(Number(confidenceThreshold))
        ? { confidenceThreshold: Number(confidenceThreshold) }
        : {})
    }
  }).then(readData);

export const receivePurchaseOrderRequest = ({
  accessToken,
  purchaseOrderId,
  idempotencyKey = null
}) =>
  request({
    method: 'PATCH',
    path: `${API_ENDPOINTS.PURCHASE_ORDERS}/${purchaseOrderId}/receive`,
    accessToken,
    idempotencyKey
  }).then(readData);

export const getWarehousesRequest = (
  accessToken,
  { includeInactive = false, includeArchived = false } = {}
) => {
  const query = new URLSearchParams();
  if (includeInactive) query.set('includeInactive', 'true');
  if (includeArchived) query.set('includeArchived', 'true');
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.WAREHOUSES}${suffix}`,
    accessToken
  })
    .then(readData)
    .then((payload) => {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.items)) return payload.items;
      return [];
    });
};

export const createWarehouseRequest = ({
  accessToken,
  name,
  code = '',
  region = '',
  address = null,
  managerUserId = null
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.WAREHOUSES,
    accessToken,
    body: {
      name,
      ...(String(code || '').trim() ? { code } : {}),
      ...(String(region || '').trim() ? { region } : {}),
      ...(address && typeof address === 'object' ? { address } : {}),
      ...(managerUserId === null || managerUserId === ''
        ? { managerUserId: null }
        : { managerUserId })
    }
  }).then(readData);

export const updateWarehouseRequest = ({ accessToken, warehouseId, payload }) =>
  request({
    method: 'PATCH',
    path: `${API_ENDPOINTS.WAREHOUSES}/${warehouseId}`,
    accessToken,
    body: payload
  }).then(readData);

export const archiveWarehouseRequest = ({ accessToken, warehouseId }) =>
  request({
    method: 'PATCH',
    path: `${API_ENDPOINTS.WAREHOUSES}/${warehouseId}/archive`,
    accessToken
  }).then(readData);

export const restoreWarehouseRequest = ({
  accessToken,
  warehouseId,
  activateOnRestore = true
}) =>
  request({
    method: 'PATCH',
    path: `${API_ENDPOINTS.WAREHOUSES}/${warehouseId}/restore`,
    accessToken,
    body: {
      activateOnRestore: Boolean(activateOnRestore)
    }
  }).then(readData);

export const getSuppliersRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.SUPPLIERS,
    accessToken
  }).then(readData);

export const getSupplierRankingsRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.SUPPLIERS_RANKINGS,
    accessToken
  }).then(readData);

export const getWmsMovementLedgerRequest = ({
  accessToken,
  warehouseId = null,
  productId = null,
  type = null,
  limit = 100
}) => {
  const query = new URLSearchParams();
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  if (productId) query.set('productId', String(productId));
  if (type) query.set('type', String(type));
  query.set('limit', String(limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.WMS_MOVEMENTS}${suffix}`,
    accessToken
  }).then(readData);
};

export const getWmsBinInventoryRequest = ({
  accessToken,
  binId,
  warehouseId = null,
  limit = 200
}) => {
  const normalizedBinId = String(binId || '').trim();
  if (!normalizedBinId) {
    return Promise.resolve({
      bin: null,
      totals: {
        lines: 0,
        quantityOnHand: 0,
        quantityReserved: 0,
        quantityAvailable: 0,
        inventoryValue: 0
      },
      items: []
    });
  }

  const query = new URLSearchParams();
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  query.set('limit', String(limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.WMS_BINS}/${normalizedBinId}/inventory${suffix}`,
    accessToken
  }).then(readData);
};

export const getWmsBinMovementsRequest = ({
  accessToken,
  binId,
  warehouseId = null,
  type = null,
  limit = 200
}) => {
  const normalizedBinId = String(binId || '').trim();
  if (!normalizedBinId) {
    return Promise.resolve({
      bin: null,
      totals: {
        count: 0,
        quantity: 0,
        inboundQuantity: 0,
        outboundQuantity: 0,
        byType: {}
      },
      movements: []
    });
  }

  const query = new URLSearchParams();
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  if (String(type || '').trim()) query.set('type', String(type || '').trim());
  query.set('limit', String(limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.WMS_BINS}/${normalizedBinId}/movements${suffix}`,
    accessToken
  }).then(readData);
};

export const getAuditLogsRequest = ({
  accessToken,
  page = 1,
  limit = 50,
  user = null,
  action = null,
  resource = null,
  warehouseId = null,
  success = null,
  from = null,
  to = null
}) => {
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', String(limit));
  if (user) query.set('user', String(user));
  if (action) query.set('action', String(action));
  if (resource) query.set('resource', String(resource));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  if (success !== null && success !== undefined && success !== 'all') {
    query.set('success', String(success));
  }
  if (from) query.set('from', String(from));
  if (to) query.set('to', String(to));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.AUDIT_LOGS}${suffix}`,
    accessToken
  }).then(readData);
};

export const getReportPurchaseOrderStatusSummaryRequest = ({
  accessToken,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.REPORT_PO_STATUS_SUMMARY}${suffix}`,
    accessToken
  }).then(readData);
};

export const getReportSpendSummaryRequest = ({
  accessToken,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.REPORT_SPEND_SUMMARY}${suffix}`,
    accessToken
  }).then(readData);
};

export const getReportSpendBySupplierRequest = ({
  accessToken,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.REPORT_SPEND_BY_SUPPLIER}${suffix}`,
    accessToken
  }).then(readData);
};

export const queueReportExportJobRequest = ({
  accessToken,
  reportType,
  warehouseId = null,
  format = 'xlsx'
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.REPORT_EXPORT_JOBS,
    accessToken,
    body: {
      reportType,
      format,
      ...(warehouseId ? { warehouseId } : {})
    }
  }).then(readData);

export const getReportExportJobStatusRequest = ({ accessToken, jobId }) =>
  request({
    method: 'GET',
    path: `${API_ENDPOINTS.REPORT_EXPORT_JOBS}/${jobId}`,
    accessToken
  }).then(readData);

export const downloadReportExportJobRequest = async ({
  accessToken,
  jobId
}) => {
  const file = await requestBinary({
    method: 'GET',
    path: `${API_ENDPOINTS.REPORT_EXPORT_JOBS}/${jobId}/download`,
    accessToken
  });

  return {
    blob: file.blob,
    fileName:
      file.fileName ||
      `report-export-${Date.now()}.${
        file.contentType.includes('application/pdf')
          ? 'pdf'
          : file.contentType.includes(
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              )
            ? 'xlsx'
            : 'csv'
      }`,
    contentType: file.contentType
  };
};

export const queueInventoryReportExportJobRequest = ({
  accessToken,
  format = 'csv',
  from = null,
  to = null,
  warehouseId = null
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.INVENTORY_REPORT_EXPORT_JOBS,
    accessToken,
    body: {
      format,
      ...(String(from || '').trim() ? { from } : {}),
      ...(String(to || '').trim() ? { to } : {}),
      ...(warehouseId ? { warehouseId } : {})
    }
  }).then(readData);

export const getInventoryReportExportJobStatusRequest = ({
  accessToken,
  jobId
}) =>
  request({
    method: 'GET',
    path: `${API_ENDPOINTS.INVENTORY_REPORT_EXPORT_JOBS}/${jobId}`,
    accessToken
  }).then(readData);

export const downloadInventoryReportExportJobRequest = async ({
  accessToken,
  jobId
}) => {
  const file = await requestBinary({
    method: 'GET',
    path: `${API_ENDPOINTS.INVENTORY_REPORT_EXPORT_JOBS}/${jobId}/download`,
    accessToken
  });

  return {
    blob: file.blob,
    fileName:
      file.fileName ||
      `inventory-report-export-${Date.now()}.${
        file.contentType.includes(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
          ? 'xlsx'
          : 'csv'
      }`,
    contentType: file.contentType
  };
};

export const getObservabilityPingRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.OBSERVABILITY_PING,
    accessToken
  }).then(readData);

export const getObservabilityRuntimeRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.OBSERVABILITY_RUNTIME,
    accessToken
  }).then(readData);

export const seedOnboardingSampleDataRequest = ({
  accessToken,
  force = false
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.ONBOARDING_SEED_SAMPLE,
    accessToken,
    body: {
      force: Boolean(force)
    }
  }).then(readData);

export const getOnboardingStatusRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.ONBOARDING_STATUS,
    accessToken
  }).then(readData);

export const createOnboardingWarehouseRequest = ({
  accessToken,
  name,
  code = '',
  region = '',
  address = null,
  managerUserId = ''
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.ONBOARDING_WAREHOUSES,
    accessToken,
    body: {
      name,
      ...(String(code || '').trim() ? { code } : {}),
      ...(String(region || '').trim() ? { region } : {}),
      ...(address && typeof address === 'object' ? { address } : {}),
      ...(String(managerUserId || '').trim() ? { managerUserId } : {})
    }
  }).then(readData);

export const complianceExportRequest = ({
  accessToken,
  includeAudit = false,
  limit = 2000
}) => {
  const query = new URLSearchParams();
  query.set('includeAudit', String(Boolean(includeAudit)));
  query.set('limit', String(limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.COMPLIANCE_EXPORT}${suffix}`,
    accessToken
  }).then(readData);
};

export const complianceDeleteMyAccountRequest = ({
  accessToken,
  currentPassword,
  confirmationText = 'DELETE MY ACCOUNT'
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.COMPLIANCE_DELETE_ACCOUNT,
    accessToken,
    body: {
      currentPassword,
      confirmationText
    }
  }).then(readData);

export const complianceDeleteOrganizationRequest = ({
  accessToken,
  currentPassword,
  confirmationText
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.COMPLIANCE_DELETE_ORGANIZATION,
    accessToken,
    body: {
      currentPassword,
      confirmationText
    }
  }).then(readData);

export const mobileSyncBootstrapRequest = ({
  accessToken,
  since = null,
  limit = 200,
  warehouseId = null
}) => {
  const query = new URLSearchParams();
  if (since) query.set('since', String(since));
  if (limit) query.set('limit', String(limit));
  if (warehouseId) query.set('warehouseId', String(warehouseId));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.MOBILE_SYNC_BOOTSTRAP}${suffix}`,
    accessToken
  }).then(readData);
};

export const mobileSyncMutationsRequest = ({
  accessToken,
  deviceId,
  mutations
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.MOBILE_SYNC_MUTATIONS,
    accessToken,
    body: {
      deviceId,
      mutations
    }
  }).then(readData);

export { ApiError, API_BASE_URL };

export default {
  request,
  authLoginRequest,
  authAdminLoginRequest,
  authEmployeeLoginRequest,
  authRegisterRequest,
  authVerifyEmailRequest,
  authVerifyEmailConfirmRequest,
  authForgotPasswordRequest,
  authResetPasswordRequest,
  authTwoFactorVerifyLoginRequest,
  authCsrfTokenRequest,
  authRefreshRequest,
  authMeRequest,
  authTwoFactorStatusRequest,
  authTwoFactorSetupRequest,
  authTwoFactorEnableRequest,
  authTwoFactorDisableRequest,
  authTwoFactorRegenerateRecoveryCodesRequest,
  authListSessionsRequest,
  authRevokeSessionRequest,
  authLogoutOtherSessionsRequest,
  authUpdatePreferencesRequest,
  authLogoutRequest,
  getUsersRequest,
  getUserRolePermissionsMatrixRequest,
  updateUserRolePermissionsMatrixRequest,
  getNotificationsRequest,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
  getSettingsRequest,
  patchSettingsRequest,
  getFinanceValuationConfigRequest,
  patchFinanceValuationConfigRequest,
  getFinanceTaxConfigRequest,
  patchFinanceTaxConfigRequest,
  getFinanceNotificationSettingsRequest,
  patchFinanceNotificationSettingsRequest,
  getFinanceRealtimeStatsRequest,
  getFinanceExchangeRatesRequest,
  putFinanceExchangeRatesRequest,
  convertFinanceCurrencyRequest,
  getFinanceInventoryValuationRequest,
  getFinanceCogsEntriesRequest,
  getFinanceGrossMarginRequest,
  getFinanceDeadStockRequest,
  getOnlineUsersRequest,
  getUserProductivityRequest,
  getUserInvitesRequest,
  createUserInviteRequest,
  revokeUserInviteRequest,
  updateUserStatusRequest,
  updateUserRoleRequest,
  getPurchaseOrdersRequest,
  getProductsRequest,
  getDeletedProductsRequest,
  getProductsHealthScoreRequest,
  getDashboardTopSellingItemsRequest,
  getDashboardTurnoverSkusRequest,
  getDashboardSlowMovingSkusRequest,
  getDashboardStockAgingBucketsRequest,
  getDashboardSupplierRankingRequest,
  getDashboardDeadStockRequest,
  getDashboardInventoryAdvisorRequest,
  getDashboardDeadStockRescueRequest,
  getDashboardDigitalTwinRequest,
  getAiDemandAnomaliesRequest,
  getAiSupplierReliabilityRequest,
  createProductRequest,
  createProductsBulkImportRequest,
  createProductsBulkImportJobRequest,
  getProductsBulkImportJobStatusRequest,
  softDeleteProductRequest,
  restoreDeletedProductRequest,
  permanentlyDeleteProductRequest,
  downloadProductLabelRequest,
  getProductsLowStockSummaryRequest,
  adjustProductStockRequest,
  listInventoryStocktakesRequest,
  getInventoryStocktakeSessionRequest,
  createInventoryStocktakeSessionRequest,
  submitInventoryStocktakeCountsRequest,
  approveInventoryStocktakeSessionRequest,
  scanInventoryStocktakeImageRequest,
  receivePurchaseOrderRequest,
  getWarehousesRequest,
  createWarehouseRequest,
  updateWarehouseRequest,
  archiveWarehouseRequest,
  restoreWarehouseRequest,
  getSuppliersRequest,
  getSupplierRankingsRequest,
  getWmsBinInventoryRequest,
  getWmsBinMovementsRequest,
  getWmsMovementLedgerRequest,
  getAuditLogsRequest,
  getReportPurchaseOrderStatusSummaryRequest,
  getReportSpendSummaryRequest,
  getReportSpendBySupplierRequest,
  queueReportExportJobRequest,
  getReportExportJobStatusRequest,
  downloadReportExportJobRequest,
  queueInventoryReportExportJobRequest,
  getInventoryReportExportJobStatusRequest,
  downloadInventoryReportExportJobRequest,
  getObservabilityPingRequest,
  getObservabilityRuntimeRequest,
  getOnboardingStatusRequest,
  createOnboardingWarehouseRequest,
  seedOnboardingSampleDataRequest,
  complianceExportRequest,
  complianceDeleteMyAccountRequest,
  complianceDeleteOrganizationRequest,
  mobileSyncBootstrapRequest,
  mobileSyncMutationsRequest
};
