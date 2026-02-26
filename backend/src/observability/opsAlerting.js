import OperationalAlert from '../models/OperationalAlert.js';
import { logger } from './logger.js';

const ALERT_LEVELS = new Set(['INFO', 'WARN', 'ERROR', 'CRITICAL']);

const normalizeSeverity = (value) => {
  const normalized = String(value || 'WARN')
    .trim()
    .toUpperCase();
  if (ALERT_LEVELS.has(normalized)) return normalized;
  return 'WARN';
};

const postAlertWebhook = async ({ severity, category, message, context }) => {
  const webhookUrl = String(process.env.OPS_ALERT_WEBHOOK_URL || '').trim();
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        severity,
        category,
        message,
        context,
        occurredAt: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(
        Number(process.env.OPS_ALERT_WEBHOOK_TIMEOUT_MS || 2000)
      )
    });
  } catch (error) {
    logger.warn('ops_alert_webhook_failed', {
      reason: error?.message || 'Unknown webhook failure',
      category,
      severity
    });
  }
};

export const raiseOperationalAlert = async ({
  severity = 'WARN',
  category,
  message,
  context = {},
  source = 'system',
  organizationId = null
}) => {
  const normalizedSeverity = normalizeSeverity(severity);
  const normalizedCategory = String(category || 'general').trim();
  const normalizedMessage = String(message || '').trim();

  if (!normalizedMessage) {
    return null;
  }

  const alert = await OperationalAlert.create({
    organization: organizationId || null,
    severity: normalizedSeverity,
    category: normalizedCategory,
    message: normalizedMessage,
    context,
    source
  });

  logger.warn('operational_alert_raised', {
    severity: normalizedSeverity,
    category: normalizedCategory,
    message: normalizedMessage,
    organizationId: organizationId ? String(organizationId) : null
  });

  await postAlertWebhook({
    severity: normalizedSeverity,
    category: normalizedCategory,
    message: normalizedMessage,
    context: {
      ...(context || {}),
      organizationId: organizationId ? String(organizationId) : null,
      source
    }
  });

  return alert;
};

export const listOperationalAlerts = async ({
  organizationId = null,
  severity = null,
  limit = 50,
  includeResolved = false
}) => {
  const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const query = {};

  if (organizationId) {
    query.organization = organizationId;
  }
  if (severity) {
    query.severity = normalizeSeverity(severity);
  }
  if (!includeResolved) {
    query.resolved = false;
  }

  return OperationalAlert.find(query)
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .lean();
};

export const resolveOperationalAlert = async ({ alertId }) => {
  return OperationalAlert.findByIdAndUpdate(
    alertId,
    {
      $set: {
        resolved: true,
        resolvedAt: new Date()
      }
    },
    {
      new: true
    }
  );
};

export default {
  raiseOperationalAlert,
  listOperationalAlerts,
  resolveOperationalAlert
};
