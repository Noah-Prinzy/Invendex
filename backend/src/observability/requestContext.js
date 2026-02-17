import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

const requestContextStore = new AsyncLocalStorage();

const resolveIncomingRequestId = req => {
  const rawHeader =
    req.headers['x-request-id'] || req.headers['x-correlation-id'] || null;

  const value = String(rawHeader || '').trim();
  if (!value) {
    return randomUUID();
  }

  return value.slice(0, 120);
};

export const requestContextMiddleware = (req, res, next) => {
  const requestId = resolveIncomingRequestId(req);
  const startedAt = Date.now();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  requestContextStore.run({ requestId, startedAt }, () => next());
};

export const getRequestContext = () => requestContextStore.getStore() || null;

export default {
  requestContextMiddleware,
  getRequestContext
};
