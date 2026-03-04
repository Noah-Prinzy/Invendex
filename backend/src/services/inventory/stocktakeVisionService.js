import crypto from 'node:crypto';

import { AppError } from '../../errors/AppError.js';
import StocktakeSession from '../../models/StocktakeSession.js';

const MAX_IMAGE_BYTES = Math.max(
  256 * 1024,
  Number(process.env.STOCKTAKE_VISION_MAX_IMAGE_BYTES || 5 * 1024 * 1024)
);

const normalizeProvider = (value) =>
  String(value || 'mock')
    .trim()
    .toLowerCase();

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
};

const toFloat = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const normalizeMimeType = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (!normalized.startsWith('image/')) return 'image/jpeg';
  return normalized;
};

const getVisionPolicy = () => ({
  minConfidenceToAutoApply: clamp(
    toFloat(process.env.STOCKTAKE_VISION_POLICY_MIN_CONFIDENCE, 0.72),
    0,
    1
  ),
  maxVarianceRatioToAutoApply: clamp(
    toFloat(process.env.STOCKTAKE_VISION_POLICY_MAX_VARIANCE_RATIO, 0.45),
    0,
    10
  ),
  maxAbsoluteVarianceToAutoApply: Math.max(
    0,
    toInteger(process.env.STOCKTAKE_VISION_POLICY_MAX_ABSOLUTE_VARIANCE, 30)
  ),
  requireManualReviewForFlagged: normalizeBoolean(
    process.env.STOCKTAKE_VISION_POLICY_REQUIRE_REVIEW,
    true
  )
});

const extractImagePayload = ({ imageDataUrl = '', imageBase64 = '' }) => {
  const rawDataUrl = String(imageDataUrl || '').trim();
  const rawBase64 = String(imageBase64 || '').trim();

  if (!rawDataUrl && !rawBase64) {
    throw new AppError('imageDataUrl or imageBase64 is required', 400);
  }

  if (rawDataUrl) {
    const match = rawDataUrl.match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
    );
    if (!match) {
      throw new AppError('imageDataUrl must be a valid base64 data URL', 400);
    }

    const mimeType = normalizeMimeType(match[1]);
    const base64Payload = String(match[2] || '').trim();
    const bytes = Buffer.from(base64Payload, 'base64');
    if (!bytes.length) {
      throw new AppError('Provided image payload is empty', 400);
    }
    if (bytes.length > MAX_IMAGE_BYTES) {
      throw new AppError(
        `Image is too large. Max allowed is ${MAX_IMAGE_BYTES} bytes`,
        413
      );
    }

    return {
      mimeType,
      bytes,
      base64Payload
    };
  }

  const bytes = Buffer.from(rawBase64, 'base64');
  if (!bytes.length) {
    throw new AppError('Provided image payload is empty', 400);
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new AppError(
      `Image is too large. Max allowed is ${MAX_IMAGE_BYTES} bytes`,
      413
    );
  }

  return {
    mimeType: 'image/jpeg',
    bytes,
    base64Payload: rawBase64
  };
};

const buildLineLookup = (lines = []) => {
  const byProductId = new Map();
  const bySku = new Map();

  for (const line of lines) {
    const productId = String(line?.product || '').trim();
    const sku = String(line?.sku || '')
      .trim()
      .toUpperCase();
    if (!productId || !sku) continue;
    byProductId.set(productId, line);
    bySku.set(sku, line);
  }

  return { byProductId, bySku };
};

const toStableUnit = (source) => {
  const digest = crypto
    .createHash('sha256')
    .update(String(source || ''))
    .digest();
  const value = digest.readUInt16BE(0);
  return value / 65535;
};

const runMockShelfCount = ({ lines, imageBytes, confidenceThreshold }) => {
  const imageDigest = crypto
    .createHash('sha256')
    .update(imageBytes)
    .digest('hex');
  const counts = [];

  for (const line of lines) {
    const productId = String(line?.product || '').trim();
    const sku = String(line?.sku || '').trim();
    if (!productId || !sku) continue;

    const expected = Math.max(0, toInteger(line?.expectedQuantity, 0));
    const weight = toStableUnit(`${imageDigest}:${sku}`);
    const factor = 0.55 + weight * 0.9;
    const estimatedQuantity = Math.max(0, Math.round(expected * factor));
    const confidence = clamp(
      0.56 + toStableUnit(`${sku}:${imageDigest}`) * 0.36,
      0.01,
      0.99
    );

    if (confidence < confidenceThreshold) continue;

    counts.push({
      productId,
      sku,
      productName: String(line?.productName || '').trim() || null,
      expectedQuantity: expected,
      estimatedQuantity,
      confidence: Number(confidence.toFixed(2)),
      source: 'mock_estimator'
    });
  }

  counts.sort((a, b) => b.confidence - a.confidence);
  return {
    provider: 'mock',
    counts,
    unmatchedDetections: [],
    warnings: [
      'Using MOCK vision provider. Configure STOCKTAKE_VISION_PROVIDER=http for real CV service integration.'
    ]
  };
};

const normalizeProviderResponse = ({
  responseBody,
  lines,
  confidenceThreshold
}) => {
  const { byProductId, bySku } = buildLineLookup(lines);
  const rawCounts = Array.isArray(responseBody?.counts)
    ? responseBody.counts
    : Array.isArray(responseBody?.detections)
      ? responseBody.detections
      : [];
  const unmatched = [];
  const warnings = [];
  const merged = new Map();

  if (
    responseBody &&
    typeof responseBody === 'object' &&
    responseBody.counts !== undefined &&
    !Array.isArray(responseBody.counts)
  ) {
    throw new AppError('Vision provider returned invalid counts payload', 502);
  }

  for (const row of rawCounts) {
    const rawProductId = String(row?.productId || '').trim();
    const rawSku = String(row?.sku || '')
      .trim()
      .toUpperCase();
    const matchedLine =
      (rawProductId ? byProductId.get(rawProductId) : null) ||
      (rawSku ? bySku.get(rawSku) : null);

    if (!matchedLine) {
      unmatched.push({
        sku: rawSku || null,
        productId: rawProductId || null,
        estimatedQuantity: toInteger(row?.estimatedQuantity, 0),
        confidence: clamp(toFloat(row?.confidence, 0), 0, 1)
      });
      continue;
    }

    const productId = String(matchedLine.product || '').trim();
    const confidence = clamp(toFloat(row?.confidence, 0.65), 0, 1);
    if (confidence < confidenceThreshold) continue;

    const estimatedQuantity = Math.max(0, toInteger(row?.estimatedQuantity, 0));
    const next = {
      productId,
      sku: String(matchedLine.sku || '').trim(),
      productName: String(matchedLine.productName || '').trim() || null,
      expectedQuantity: Math.max(0, toInteger(matchedLine.expectedQuantity, 0)),
      estimatedQuantity,
      confidence: Number(confidence.toFixed(2)),
      source: String(row?.source || 'provider')
        .trim()
        .toLowerCase()
    };

    const existing = merged.get(productId);
    if (!existing || next.confidence > existing.confidence) {
      merged.set(productId, next);
    }
  }

  if (!rawCounts.length) {
    warnings.push('Provider returned no detections.');
  }

  return {
    counts: Array.from(merged.values()).sort(
      (a, b) => b.confidence - a.confidence
    ),
    unmatchedDetections: unmatched,
    warnings
  };
};

const applyPolicyToCounts = ({ counts = [], policy }) => {
  const normalizedCounts = Array.isArray(counts) ? counts : [];
  const withPolicy = normalizedCounts.map((row) => {
    const expectedQuantity = Math.max(0, toInteger(row?.expectedQuantity, 0));
    const estimatedQuantity = Math.max(0, toInteger(row?.estimatedQuantity, 0));
    const confidence = clamp(toFloat(row?.confidence, 0), 0, 1);
    const variance = estimatedQuantity - expectedQuantity;
    const varianceRatio = Number(
      (Math.abs(variance) / Math.max(expectedQuantity, 1)).toFixed(4)
    );

    const reviewReasons = [];
    if (confidence < policy.minConfidenceToAutoApply) {
      reviewReasons.push('LOW_CONFIDENCE');
    }
    if (varianceRatio > policy.maxVarianceRatioToAutoApply) {
      reviewReasons.push('HIGH_VARIANCE_RATIO');
    }
    if (Math.abs(variance) > policy.maxAbsoluteVarianceToAutoApply) {
      reviewReasons.push('HIGH_ABSOLUTE_VARIANCE');
    }

    const autoApplyEligible = reviewReasons.length === 0;

    return {
      ...row,
      expectedQuantity,
      estimatedQuantity,
      confidence: Number(confidence.toFixed(2)),
      variance,
      varianceRatio: Number(varianceRatio.toFixed(2)),
      autoApplyEligible,
      reviewReasons
    };
  });

  return withPolicy;
};

const runHttpShelfCount = async ({
  lines,
  imageBase64,
  mimeType,
  maxDetections,
  confidenceThreshold
}) => {
  const url = String(process.env.STOCKTAKE_VISION_HTTP_URL || '').trim();
  if (!url) {
    throw new AppError(
      'STOCKTAKE_VISION_HTTP_URL is required when STOCKTAKE_VISION_PROVIDER=http',
      500
    );
  }

  const token = String(process.env.STOCKTAKE_VISION_HTTP_TOKEN || '').trim();
  const timeoutMs = Math.max(
    1000,
    Math.min(
      45000,
      Number(process.env.STOCKTAKE_VISION_HTTP_TIMEOUT_MS || 12000)
    )
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        contractVersion: 1,
        imageBase64,
        mimeType,
        maxDetections,
        confidenceThreshold,
        sessionContext: {
          totalSkuHints: lines.length
        },
        skuHints: lines.map((line) => ({
          productId: String(line?.product || '').trim(),
          sku: String(line?.sku || '').trim(),
          productName: String(line?.productName || '').trim(),
          expectedQuantity: Math.max(0, toInteger(line?.expectedQuantity, 0))
        }))
      }),
      signal: controller.signal
    });
  } catch (error) {
    throw new AppError(
      `Vision provider request failed: ${String(error?.message || 'unknown error')}`,
      502
    );
  } finally {
    clearTimeout(timeout);
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new AppError(
      String(payload?.message || `Vision provider failed (${response.status})`),
      502
    );
  }

  const normalized = normalizeProviderResponse({
    responseBody: payload,
    lines,
    confidenceThreshold
  });

  return {
    provider: 'http',
    ...normalized,
    warnings: [
      ...(Array.isArray(payload?.warnings)
        ? payload.warnings.map((item) => String(item))
        : []),
      ...(Array.isArray(normalized.warnings) ? normalized.warnings : [])
    ]
  };
};

export const analyzeStocktakeImageCounts = async ({
  organizationId,
  stocktakeSessionId,
  imageDataUrl = '',
  imageBase64 = '',
  maxDetections = 50,
  confidenceThreshold = 0.35
}) => {
  const session = await StocktakeSession.findOne({
    _id: stocktakeSessionId,
    organization: organizationId
  })
    .select('status lines')
    .lean();

  if (!session) {
    throw new AppError('Stocktake session not found', 404);
  }

  const sessionStatus = String(session.status || '').toUpperCase();
  if (!['OPEN', 'IN_REVIEW'].includes(sessionStatus)) {
    throw new AppError(
      'Vision scan is allowed only for OPEN or IN_REVIEW stocktake sessions',
      409
    );
  }

  const lines = Array.isArray(session.lines) ? session.lines : [];
  if (!lines.length) {
    throw new AppError('Stocktake session has no lines to analyze', 400);
  }

  const parsedMaxDetections = clamp(toInteger(maxDetections, 50), 1, 200);
  const parsedConfidenceThreshold = clamp(
    toFloat(confidenceThreshold, 0.35),
    0,
    1
  );

  const { bytes, mimeType, base64Payload } = extractImagePayload({
    imageDataUrl,
    imageBase64
  });

  const provider = normalizeProvider(process.env.STOCKTAKE_VISION_PROVIDER);
  const policy = getVisionPolicy();

  let providerResult;
  if (provider === 'http') {
    providerResult = await runHttpShelfCount({
      lines,
      imageBase64: base64Payload,
      mimeType,
      maxDetections: parsedMaxDetections,
      confidenceThreshold: parsedConfidenceThreshold
    });
  } else {
    providerResult = runMockShelfCount({
      lines,
      imageBytes: bytes,
      confidenceThreshold: parsedConfidenceThreshold
    });
  }

  const counts = Array.isArray(providerResult?.counts)
    ? providerResult.counts.slice(0, parsedMaxDetections)
    : [];
  const policyEvaluatedCounts = applyPolicyToCounts({ counts, policy });
  const eligibleCounts = policyEvaluatedCounts.filter(
    (row) => row.autoApplyEligible
  );
  const reviewRequiredCounts = policyEvaluatedCounts.filter(
    (row) => !row.autoApplyEligible
  );

  return {
    sessionId: String(stocktakeSessionId),
    provider: providerResult?.provider || provider || 'mock',
    generatedAt: new Date().toISOString(),
    imageMeta: {
      mimeType,
      bytes: bytes.length
    },
    limits: {
      maxDetections: parsedMaxDetections,
      confidenceThreshold: parsedConfidenceThreshold
    },
    policy: {
      ...policy,
      blockedAutoApply: Boolean(
        policy.requireManualReviewForFlagged && reviewRequiredCounts.length > 0
      )
    },
    counts: policyEvaluatedCounts,
    autoApplySummary: {
      eligibleCount: eligibleCounts.length,
      reviewRequiredCount: reviewRequiredCounts.length
    },
    eligibleCounts,
    reviewRequiredCounts,
    unmatchedDetections: Array.isArray(providerResult?.unmatchedDetections)
      ? providerResult.unmatchedDetections
      : [],
    warnings: Array.isArray(providerResult?.warnings)
      ? providerResult.warnings
      : []
  };
};

export default {
  analyzeStocktakeImageCounts
};
