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

export const authLoginRequest = ({ email, password }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_LOGIN,
    body: { email, password }
  });

export const authAdminLoginRequest = ({ email, password }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_ADMIN_LOGIN,
    body: { email, password }
  });

export const authEmployeeLoginRequest = ({
  companyName,
  email,
  password,
  inviteCode = ''
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_EMPLOYEE_LOGIN,
    body: { companyName, email, password, inviteCode }
  });

export const authRegisterRequest = ({
  email,
  password,
  confirmPassword,
  organizationName
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_REGISTER,
    body: { email, password, confirmPassword, organizationName }
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

export const authLogoutRequest = (accessToken) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_LOGOUT,
    accessToken
  });

const readData = (payload) => payload?.data;

export const getProductsRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.PRODUCTS,
    accessToken
  }).then(readData);

export const getPurchaseOrdersRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.PURCHASE_ORDERS,
    accessToken
  }).then(readData);

export const getUsersRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.USERS,
    accessToken
  }).then(readData);

export const getOnlineUsersRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.USERS_ONLINE,
    accessToken
  }).then(readData);

export const getUserInvitesRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.USERS_INVITES,
    accessToken
  }).then(readData);

export const createUserInviteRequest = ({
  accessToken,
  email = '',
  expiresInHours = 72
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.USERS_INVITES,
    accessToken,
    body: { email, expiresInHours }
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

export const getProductsLowStockSummaryRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.PRODUCTS_LOW_STOCK_SUMMARY,
    accessToken
  }).then(readData);

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

export const getReportPurchaseOrderStatusSummaryRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.REPORT_PO_STATUS_SUMMARY,
    accessToken
  }).then(readData);

export const getReportSpendSummaryRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.REPORT_SPEND_SUMMARY,
    accessToken
  }).then(readData);

export const getReportSpendBySupplierRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.REPORT_SPEND_BY_SUPPLIER,
    accessToken
  }).then(readData);

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
  authCsrfTokenRequest,
  authRefreshRequest,
  authMeRequest,
  authLogoutRequest,
  getUsersRequest,
  getOnlineUsersRequest,
  getUserInvitesRequest,
  createUserInviteRequest,
  revokeUserInviteRequest,
  updateUserStatusRequest,
  getPurchaseOrdersRequest,
  getProductsRequest,
  getProductsLowStockSummaryRequest,
  adjustProductStockRequest,
  receivePurchaseOrderRequest,
  getSuppliersRequest,
  getSupplierRankingsRequest,
  getReportPurchaseOrderStatusSummaryRequest,
  getReportSpendSummaryRequest,
  getReportSpendBySupplierRequest,
  getObservabilityPingRequest,
  getObservabilityRuntimeRequest,
  mobileSyncBootstrapRequest,
  mobileSyncMutationsRequest
};
