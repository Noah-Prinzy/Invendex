/**
 * 📤 Notification Service
 * Email / SMS / Webhook ready
 */
import nodemailer from 'nodemailer';
import {
  getDefaultLowStockRecipients,
  sendBulkSms,
  sendBulkWhatsApp
} from './smsService.js';
import { logger } from '../../observability/logger.js';

const parseBooleanEnv = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const toFinitePort = (value, fallback = 587) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return fallback;
  }
  return Math.floor(parsed);
};

const resolveSmtpConfig = () => {
  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  const fromEmail = String(process.env.SMTP_FROM_EMAIL || '').trim();
  const fromName = String(process.env.SMTP_FROM_NAME || 'Ledgerly').trim();
  const port = toFinitePort(process.env.SMTP_PORT, 587);
  const secure = parseBooleanEnv(process.env.SMTP_SECURE, port === 465);
  const requireTls = parseBooleanEnv(process.env.SMTP_REQUIRE_TLS, false);
  const explicitToggle = String(process.env.EMAIL_NOTIFICATIONS_ENABLED || '')
    .trim()
    .toLowerCase();

  const isConfigured = Boolean(host && fromEmail);
  const isEnabled =
    explicitToggle === 'false'
      ? false
      : explicitToggle === 'true' || isConfigured;

  return {
    host,
    port,
    secure,
    requireTls,
    user,
    pass,
    fromEmail,
    fromName,
    isConfigured,
    isEnabled
  };
};

let cachedTransporter = null;
let cachedConfigFingerprint = '';

const buildConfigFingerprint = (config) =>
  JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTls: config.requireTls,
    hasUser: Boolean(config.user),
    hasPass: Boolean(config.pass)
  });

const getEmailTransporter = (config) => {
  const fingerprint = buildConfigFingerprint(config);
  if (cachedTransporter && cachedConfigFingerprint === fingerprint) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTls,
    auth:
      config.user && config.pass
        ? {
            user: config.user,
            pass: config.pass
          }
        : undefined
  });
  cachedConfigFingerprint = fingerprint;
  return cachedTransporter;
};

export const sendEmailNotification = async ({
  to,
  subject,
  text,
  html = null,
  metadata = {}
}) => {
  const config = resolveSmtpConfig();
  if (!config.isEnabled) {
    return {
      success: false,
      channel: 'email',
      skipped: true,
      reason: 'Email notifications are disabled'
    };
  }

  if (!config.isConfigured) {
    logger.warn('notification_email_skipped_missing_smtp_config', {
      to,
      subject
    });
    return {
      success: false,
      channel: 'email',
      skipped: true,
      reason: 'SMTP is not configured'
    };
  }

  const transporter = getEmailTransporter(config);
  const info = await transporter.sendMail({
    from: `${config.fromName} <${config.fromEmail}>`,
    to,
    subject,
    text,
    html: html || undefined,
    headers: {
      'x-ledgerly-notification': 'true'
    }
  });

  logger.info('notification_email_sent', {
    to,
    subject,
    messageId: info?.messageId || null,
    metadata
  });

  return {
    success: true,
    channel: 'email',
    recipient: to,
    messageId: info?.messageId || null
  };
};

export const sendSupplierNotification = async ({
  supplier,
  subject,
  message,
  metadata = {}
}) => {
  if (!supplier?.email) {
    throw new Error('Supplier email not available');
  }

  return sendEmailNotification({
    to: supplier.email,
    subject: String(subject || 'Supplier notification'),
    text: String(message || '').trim(),
    metadata
  });
};

export const sendLowStockSmsNotification = async ({
  organizationName = 'Organization',
  sku,
  productName,
  currentStock,
  reorderLevel,
  recipients = []
}) => {
  const targetRecipients = Array.from(
    new Set([
      ...getDefaultLowStockRecipients(),
      ...(Array.isArray(recipients) ? recipients : [])
    ])
  );

  if (!targetRecipients.length) {
    return {
      success: false,
      channel: 'sms',
      skipped: true,
      reason: 'No low-stock recipients configured'
    };
  }

  const message = [
    `Ledgerly low-stock alert (${organizationName})`,
    `${productName || 'Product'} [${sku || 'N/A'}]`,
    `Stock: ${Number(currentStock || 0)} | Reorder: ${Number(reorderLevel || 0)}`
  ].join(' | ');

  const smsResult = await sendBulkSms({
    recipients: targetRecipients,
    message
  });

  return {
    success: smsResult.deliveredCount > 0,
    channel: 'sms',
    recipients: targetRecipients,
    ...smsResult
  };
};

export const sendLowStockWhatsappNotification = async ({
  organizationName = 'Organization',
  sku,
  productName,
  currentStock,
  reorderLevel,
  recipients = []
}) => {
  const targetRecipients = Array.from(
    new Set(
      (Array.isArray(recipients) ? recipients : [])
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    )
  );

  if (!targetRecipients.length) {
    return {
      success: false,
      channel: 'whatsapp',
      skipped: true,
      reason: 'No low-stock WhatsApp recipients configured'
    };
  }

  const message = [
    `Ledgerly low-stock alert (${organizationName})`,
    `${productName || 'Product'} [${sku || 'N/A'}]`,
    `Stock: ${Number(currentStock || 0)} | Reorder: ${Number(reorderLevel || 0)}`
  ].join(' | ');

  const whatsappResult = await sendBulkWhatsApp({
    recipients: targetRecipients,
    message
  });

  return {
    success: whatsappResult.deliveredCount > 0,
    channel: 'whatsapp',
    recipients: targetRecipients,
    ...whatsappResult
  };
};

export default {
  sendEmailNotification,
  sendSupplierNotification,
  sendLowStockSmsNotification,
  sendLowStockWhatsappNotification
};
