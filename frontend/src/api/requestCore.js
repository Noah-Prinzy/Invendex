import { createRequestTrace } from '../observability/traceContext.js';

export class ApiError extends Error {
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

export const API_BASE_URL = getDefaultBaseUrl();

const CSRF_HEADER_NAME = 'x-csrf-token';
const CLIENT_DEVICE_ID_KEY = 'invendex_client_device_id_v1';
let csrfToken = '';
let errorTrackerModulePromise = null;

const loadErrorTracker = async () => {
  if (!errorTrackerModulePromise) {
    errorTrackerModulePromise = import('../observability/errorTracker.js');
  }
  return errorTrackerModulePromise;
};

const captureRequestException = async (error, context) => {
  try {
    const { captureFrontendException } = await loadErrorTracker();
    await captureFrontendException(error, context);
  } catch {
    // Ignore observability failures and preserve the original request error.
  }
};

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

export const setCsrfToken = (value) => {
  const normalizedToken = String(value || '').trim();
  if (normalizedToken) {
    csrfToken = normalizedToken;
  }
  return normalizedToken;
};

export const request = async ({
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

    await captureRequestException(error, {
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
      await captureRequestException(apiError, {
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

export const requestBinary = async ({
  method = 'GET',
  path,
  accessToken = null
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

export const readData = (payload) => payload?.data;
