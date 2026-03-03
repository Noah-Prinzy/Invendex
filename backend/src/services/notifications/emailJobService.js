import {
  BACKGROUND_JOB_TYPES,
  createBackgroundJob
} from '../jobs/backgroundJobService.js';
import {
  sendEmailNotification,
  sendLowStockSmsNotification
} from './notificationService.js';
import { logger } from '../../observability/logger.js';

const sanitizeMetadata = (metadata) =>
  metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : {};

export const queueEmailNotification = async ({
  organizationId,
  createdBy = null,
  to,
  subject,
  text,
  html = null,
  notificationType = 'GENERIC',
  dedupeKey = null,
  metadata = {}
}) => {
  const normalizedOrganizationId = String(organizationId || '').trim();
  const payload = {
    notificationType: String(notificationType || 'GENERIC')
      .trim()
      .toUpperCase(),
    to: String(to || '').trim(),
    subject: String(subject || '').trim(),
    text: String(text || '').trim(),
    html: html ? String(html) : null,
    metadata: sanitizeMetadata(metadata)
  };

  if (!payload.to || !payload.subject || !payload.text) {
    return {
      queued: false,
      skipped: true,
      reason: 'email_payload_incomplete'
    };
  }

  if (!normalizedOrganizationId) {
    const delivery = await sendEmailNotification(payload);
    return {
      queued: false,
      fallbackDelivery: delivery
    };
  }

  try {
    const job = await createBackgroundJob({
      organizationId: normalizedOrganizationId,
      createdBy,
      type: BACKGROUND_JOB_TYPES.EMAIL_NOTIFICATION,
      payload,
      dedupeKey: String(dedupeKey || '').trim() || null
    });

    return {
      queued: true,
      jobId: job?.id || null
    };
  } catch (error) {
    logger.warn('queue_email_notification_failed_fallback_to_direct_send', {
      organizationId: normalizedOrganizationId,
      to: payload.to,
      notificationType: payload.notificationType,
      err: error
    });

    const delivery = await sendEmailNotification(payload);
    return {
      queued: false,
      fallbackDelivery: delivery
    };
  }
};

export const queueLowStockSmsNotification = async (payload) => {
  try {
    const smsResult = await sendLowStockSmsNotification(payload);
    return { queued: false, result: smsResult };
  } catch (error) {
    logger.warn('send_low_stock_sms_failed', {
      err: error,
      organizationName: payload?.organizationName || null,
      sku: payload?.sku || null
    });
    return {
      queued: false,
      result: {
        success: false,
        channel: 'sms',
        skipped: false,
        reason: String(error?.message || 'SMS send failed')
      }
    };
  }
};

export default {
  queueEmailNotification,
  queueLowStockSmsNotification
};
