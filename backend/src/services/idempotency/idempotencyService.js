import crypto from 'node:crypto';
import IdempotencyRequest, {
  IDEMPOTENCY_SCOPES
} from '../../models/IdempotencyRequest.js';
import { AppError } from '../../errors/AppError.js';

export const IDEMPOTENCY_SCOPE = {
  MANUAL_STOCK_ADJUSTMENT: 'MANUAL_STOCK_ADJUSTMENT',
  RECEIVE_PURCHASE_ORDER: 'RECEIVE_PURCHASE_ORDER'
};

const DEFAULT_TTL_DAYS = 7;

const parseTtlDays = () => {
  const parsed = Number(process.env.IDEMPOTENCY_KEY_TTL_DAYS);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TTL_DAYS;
  }
  return Math.floor(parsed);
};

const buildExpiresAt = () => {
  const ttlDays = parseTtlDays();
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
};

const normalizeIdempotencyKey = (rawValue) => {
  const key = String(rawValue || '').trim();
  return key || null;
};

const buildRequestHash = (payload) =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify(payload || null))
    .digest('hex');

const serializeResult = (value) =>
  value === undefined ? null : JSON.parse(JSON.stringify(value));

export const extractIdempotencyKeyFromRequest = (req) => {
  if (!req) return null;

  const headerValue =
    req.get('Idempotency-Key') || req.get('X-Idempotency-Key') || null;
  if (headerValue) {
    return normalizeIdempotencyKey(headerValue);
  }

  return normalizeIdempotencyKey(req.body?.idempotencyKey);
};

const assertScope = (scope) => {
  if (!IDEMPOTENCY_SCOPES.includes(scope)) {
    throw new AppError('Invalid idempotency scope', 500);
  }
};

const assertKey = (key) => {
  if (!key) return;
  if (key.length > 128) {
    throw new AppError('Idempotency key must be 128 characters or fewer', 400);
  }
};

export const runIdempotentOperation = async ({
  organizationId,
  scope,
  idempotencyKey = null,
  requestFingerprint = null,
  operation
}) => {
  if (typeof operation !== 'function') {
    throw new AppError('Idempotent operation callback is required', 500);
  }

  const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
  if (!normalizedKey) {
    const result = await operation();
    return {
      result,
      replayed: false,
      keyUsed: false
    };
  }

  if (!organizationId) {
    throw new AppError('organizationId is required for idempotent operations');
  }

  assertScope(scope);
  assertKey(normalizedKey);

  const requestHash = buildRequestHash(requestFingerprint);

  let claim = null;
  try {
    claim = await IdempotencyRequest.create({
      organization: organizationId,
      scope,
      key: normalizedKey,
      requestHash,
      status: 'PROCESSING',
      expiresAt: buildExpiresAt()
    });
  } catch (err) {
    if (err?.code !== 11000) {
      throw err;
    }
  }

  if (!claim) {
    const existing = await IdempotencyRequest.findOne({
      organization: organizationId,
      scope,
      key: normalizedKey
    }).lean();

    if (!existing) {
      throw new AppError('Failed to resolve idempotency key state', 409);
    }

    if (existing.requestHash !== requestHash) {
      throw new AppError(
        'Idempotency key already used with a different request payload',
        409
      );
    }

    if (existing.status === 'COMPLETED') {
      return {
        result: existing.responseData,
        replayed: true,
        keyUsed: true
      };
    }

    if (existing.status === 'PROCESSING') {
      throw new AppError(
        'A request with this idempotency key is already in progress',
        409
      );
    }

    throw new AppError(
      'A previous request with this idempotency key failed. Retry with a new key.',
      409
    );
  }

  try {
    const result = await operation();
    const serialized = serializeResult(result);

    await IdempotencyRequest.findByIdAndUpdate(claim._id, {
      $set: {
        status: 'COMPLETED',
        responseData: serialized,
        errorMessage: null,
        completedAt: new Date(),
        failedAt: null
      }
    });

    return {
      result,
      replayed: false,
      keyUsed: true
    };
  } catch (err) {
    await IdempotencyRequest.findByIdAndUpdate(claim._id, {
      $set: {
        status: 'FAILED',
        errorMessage: String(err?.message || 'Unknown error'),
        failedAt: new Date()
      }
    });
    throw err;
  }
};

export default {
  IDEMPOTENCY_SCOPE,
  extractIdempotencyKeyFromRequest,
  runIdempotentOperation
};
