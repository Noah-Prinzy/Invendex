import { logger } from './logger.js';

const canForwardErrors = () =>
  Boolean(String(process.env.ERROR_TRACKING_WEBHOOK_URL || '').trim());

const postErrorWebhook = async payload => {
  if (!canForwardErrors()) return;

  try {
    await fetch(process.env.ERROR_TRACKING_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    logger.warn('error_webhook_delivery_failed', {
      reason: err.message
    });
  }
};

export const captureException = async (error, context = {}) => {
  const payload = {
    errorName: error?.name || 'Error',
    errorMessage: error?.message || 'Unknown error',
    stack: error?.stack || null,
    context,
    occurredAt: new Date().toISOString()
  };

  logger.error('exception_captured', payload);
  await postErrorWebhook(payload);
};

export default {
  captureException
};
