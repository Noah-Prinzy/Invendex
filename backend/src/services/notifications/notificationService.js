/**
 * ðŸ“¤ Notification Service
 * Email / SMS / Webhook ready
 */
import nodemailer from 'nodemailer';
import {
  getDefaultLowStockRecipients,
  sendBulkSms,
  sendBulkWhatsApp
} from './smsService.js';
import { logger } from '../../observability/logger.js';

const APP_WEB_URL = String(process.env.APP_WEB_URL || '').trim();

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const resolveAppAssetUrl = (assetPath = '') => {
  const normalizedBaseUrl = APP_WEB_URL.replace(/\/+$/, '');
  const normalizedAssetPath = `/${String(assetPath || '')
    .trim()
    .replace(/^\/+/, '')}`;

  if (!normalizedBaseUrl || normalizedAssetPath === '/') {
    return '';
  }

  return `${normalizedBaseUrl}${normalizedAssetPath}`;
};

const buildOperationalEmailShell = ({
  title,
  eyebrow = 'Inventra operations',
  headline,
  intro,
  detailRows = [],
  primaryActionLabel = '',
  primaryActionHref = '',
  supportMessage = ''
}) => {
  const logoUrl = resolveAppAssetUrl('/apple-touch-icon.png');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title || 'Inventra')}</title>
    <style>
      body {
        margin: 0;
        padding: 28px 16px;
        background:
          radial-gradient(circle at top, rgba(88, 179, 255, 0.24), transparent 34%),
          linear-gradient(180deg, #07111f 0%, #0d1727 54%, #111c2f 100%);
        color: #eff7ff;
        font-family: "Segoe UI", Arial, sans-serif;
      }
      .shell {
        max-width: 620px;
        margin: 0 auto;
      }
      .card {
        border-radius: 28px;
        padding: 32px;
        border: 1px solid rgba(174, 227, 255, 0.18);
        background: rgba(7, 17, 31, 0.88);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.3);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .brand-badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(174, 227, 255, 0.14);
        color: #aee3ff;
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .logo {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        object-fit: cover;
      }
      h1 {
        margin: 22px 0 10px;
        font-size: 30px;
        line-height: 1.14;
      }
      p {
        margin: 0;
        color: rgba(239, 247, 255, 0.84);
        line-height: 1.65;
        font-size: 15px;
      }
      .details {
        margin-top: 20px;
        padding: 18px;
        border-radius: 20px;
        background: rgba(174, 227, 255, 0.07);
        border: 1px solid rgba(174, 227, 255, 0.12);
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 9px 0;
        border-bottom: 1px solid rgba(174, 227, 255, 0.08);
      }
      .detail-row:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .detail-label {
        color: rgba(239, 247, 255, 0.58);
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-top: 22px;
        min-width: 184px;
        min-height: 48px;
        padding: 0 18px;
        border-radius: 16px;
        color: #04111f !important;
        font-weight: 700;
        text-decoration: none;
        background: linear-gradient(135deg, #aee3ff 0%, #63b6ff 100%);
      }
      .support {
        margin-top: 18px;
        color: rgba(239, 247, 255, 0.62);
        font-size: 13px;
      }
      @media (max-width: 640px) {
        .card {
          padding: 24px;
        }
        .detail-row {
          flex-direction: column;
          gap: 6px;
        }
        .button {
          width: 100%;
          min-width: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="card">
        <div class="brand">
          ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Inventra logo" />` : ''}
          <span class="brand-badge">${escapeHtml(eyebrow)}</span>
        </div>
        <h1>${escapeHtml(headline || title || 'Inventra')}</h1>
        <p>${escapeHtml(intro || '')}</p>
        ${
          detailRows.length
            ? `<div class="details">
                ${detailRows
                  .map(
                    ({ label, value }) => `
                      <div class="detail-row">
                        <span class="detail-label">${escapeHtml(label)}</span>
                        <strong>${escapeHtml(value)}</strong>
                      </div>
                    `
                  )
                  .join('')}
              </div>`
            : ''
        }
        ${
          primaryActionLabel && primaryActionHref
            ? `<a class="button" href="${escapeHtml(primaryActionHref)}">${escapeHtml(primaryActionLabel)}</a>`
            : ''
        }
        ${
          supportMessage
            ? `<div class="support">${escapeHtml(supportMessage)}</div>`
            : ''
        }
      </div>
    </div>
  </body>
</html>`;
};

export const buildSupplierNotificationEmailHtml = ({
  supplierName = 'Supplier',
  subject = 'Supplier notification',
  message = '',
  metadata = {}
}) =>
  buildOperationalEmailShell({
    title: subject,
    eyebrow: 'Inventra supplier',
    headline: subject,
    intro: message,
    detailRows: [
      { label: 'Supplier', value: supplierName || 'Supplier' },
      metadata?.organizationName
        ? { label: 'Workspace', value: metadata.organizationName }
        : null,
      metadata?.reference
        ? { label: 'Reference', value: metadata.reference }
        : null
    ].filter(Boolean),
    primaryActionLabel: APP_WEB_URL ? 'Open Inventra' : '',
    primaryActionHref: APP_WEB_URL || '',
    supportMessage:
      'Reply directly to this email if you need to coordinate fulfillment or update the order details.'
  });

export const buildLowStockEmailHtml = ({
  organizationName = 'Organization',
  sku = '',
  productName = '',
  currentStock = 0,
  reorderLevel = 0
}) =>
  buildOperationalEmailShell({
    title: `Inventra low-stock alert (${organizationName})`,
    eyebrow: 'Inventra inventory',
    headline: 'Low stock requires attention',
    intro: `${productName || 'Product'} is now at or below its reorder threshold in ${organizationName}.`,
    detailRows: [
      { label: 'Workspace', value: organizationName || 'Organization' },
      { label: 'Product', value: productName || 'Product' },
      { label: 'SKU', value: sku || 'N/A' },
      { label: 'Current stock', value: String(Number(currentStock || 0)) },
      { label: 'Reorder level', value: String(Number(reorderLevel || 0)) }
    ],
    primaryActionLabel: APP_WEB_URL ? 'Review inventory' : '',
    primaryActionHref: APP_WEB_URL || '',
    supportMessage:
      'Use the inventory dashboard to review the affected warehouse, generate a purchase order, or acknowledge the alert.'
  });

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
  const fromName = String(process.env.SMTP_FROM_NAME || 'Inventra').trim();
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
      'x-inventra-notification': 'true'
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
    html: buildSupplierNotificationEmailHtml({
      supplierName: supplier?.name || supplier?.companyName || 'Supplier',
      subject: String(subject || 'Supplier notification'),
      message: String(message || '').trim(),
      metadata
    }),
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
    `Inventra low-stock alert (${organizationName})`,
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

export const sendLowStockEmailNotification = async ({
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
      channel: 'email',
      skipped: true,
      reason: 'No low-stock email recipients configured'
    };
  }

  const subject = `Inventra low-stock alert (${organizationName})`;
  const text = [
    `Organization: ${organizationName}`,
    `Product: ${productName || 'Product'}`,
    `SKU: ${sku || 'N/A'}`,
    `Current stock: ${Number(currentStock || 0)}`,
    `Reorder level: ${Number(reorderLevel || 0)}`
  ].join('\n');

  const outcome = await sendEmailNotification({
    to: targetRecipients.join(', '),
    subject,
    text,
    html: buildLowStockEmailHtml({
      organizationName,
      sku,
      productName,
      currentStock,
      reorderLevel
    }),
    metadata: {
      organizationName,
      sku,
      productName,
      currentStock: Number(currentStock || 0),
      reorderLevel: Number(reorderLevel || 0)
    }
  });

  return {
    ...outcome,
    recipients: targetRecipients
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
    `Inventra low-stock alert (${organizationName})`,
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
  sendLowStockEmailNotification,
  sendLowStockSmsNotification,
  sendLowStockWhatsappNotification
};
