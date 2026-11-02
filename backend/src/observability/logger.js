import { getRuntimeConfig } from '../config/envConfig.js';
import { getRequestContext } from './requestContext.js';

const LOG_LEVEL_ORDER = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const getCurrentLogLevel = () => {
  const value = getRuntimeConfig().observability.logLevel;
  return LOG_LEVEL_ORDER[value] ? value : 'info';
};

const shouldEmit = (level) =>
  LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[getCurrentLogLevel()];

const sanitizeMeta = (meta) => {
  if (!meta || typeof meta !== 'object') return {};

  const copy = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value instanceof Error) {
      copy[key] = {
        message: value.message,
        stack: value.stack
      };
      continue;
    }

    if (value === undefined) continue;
    copy[key] = value;
  }

  return copy;
};

const emit = (level, message, meta = {}) => {
  if (!shouldEmit(level)) return;

  const context = getRequestContext();
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    requestId: context?.requestId || null,
    clientTraceId: context?.clientTraceId || null,
    ...sanitizeMeta(meta)
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
};

export const logger = {
  debug: (message, meta) => emit('debug', message, meta),
  info: (message, meta) => emit('info', message, meta),
  warn: (message, meta) => emit('warn', message, meta),
  error: (message, meta) => emit('error', message, meta),
  child: (baseMeta) => ({
    debug: (message, meta) =>
      emit('debug', message, { ...(baseMeta || {}), ...(meta || {}) }),
    info: (message, meta) =>
      emit('info', message, { ...(baseMeta || {}), ...(meta || {}) }),
    warn: (message, meta) =>
      emit('warn', message, { ...(baseMeta || {}), ...(meta || {}) }),
    error: (message, meta) =>
      emit('error', message, { ...(baseMeta || {}), ...(meta || {}) })
  })
};

export default logger;
