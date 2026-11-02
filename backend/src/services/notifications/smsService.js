import { getRuntimeConfig } from '../../config/envConfig.js';
import { logger } from '../../observability/logger.js';

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const resolveSmsProvider = () =>
  getRuntimeConfig().notifications.sms.provider;

const resolveWhatsAppProvider = () =>
  getRuntimeConfig().notifications.sms.whatsappProvider;

const normalizePhone = (value) =>
  String(value || '')
    .replace(/\s+/g, '')
    .trim();

const normalizeWhatsapp = (value) =>
  String(value || '')
    .replace(/^whatsapp:/i, '')
    .replace(/\s+/g, '')
    .trim();

const applyChannelPrefix = ({ value, prefix = '' }) => {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return '';
  const normalizedPrefix = String(prefix || '').trim();
  if (!normalizedPrefix) return normalizedValue;
  if (
    normalizedValue.toLowerCase().startsWith(normalizedPrefix.toLowerCase())
  ) {
    return normalizedValue;
  }
  return `${normalizedPrefix}${normalizedValue}`;
};

const sendViaTwilioMessage = async ({
  to,
  message,
  accountSid,
  authToken,
  fromNumber,
  toPrefix = '',
  fromPrefix = ''
}) => {
  const normalizedTo = applyChannelPrefix({ value: to, prefix: toPrefix });
  const normalizedFrom = applyChannelPrefix({
    value: fromNumber,
    prefix: fromPrefix
  });

  if (!accountSid || !authToken || !normalizedFrom) {
    throw new Error(
      'Twilio SMS configuration missing: SMS_TWILIO_ACCOUNT_SID, SMS_TWILIO_AUTH_TOKEN, SMS_TWILIO_FROM'
    );
  }

  const form = new URLSearchParams({
    To: normalizedTo,
    From: normalizedFrom,
    Body: message
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: form.toString(),
      signal: AbortSignal.timeout(getRuntimeConfig().notifications.sms.timeoutMs)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Twilio SMS request failed (${response.status}): ${errorText}`
    );
  }

  const payload = await response.json();
  return {
    provider: 'twilio',
    sid: payload?.sid || null,
    status: payload?.status || null,
    to: normalizedTo,
    from: normalizedFrom
  };
};

const sendViaTwilio = async ({ to, message }) => {
  const { accountSid, authToken, from: fromNumber } =
    getRuntimeConfig().notifications.sms.twilio;

  return sendViaTwilioMessage({
    to,
    message,
    accountSid,
    authToken,
    fromNumber
  });
};

const sendViaTwilioWhatsapp = async ({ to, message }) => {
  const { accountSid, authToken, from: fromNumber } =
    getRuntimeConfig().notifications.sms.whatsappTwilio;

  return sendViaTwilioMessage({
    to,
    message,
    accountSid,
    authToken,
    fromNumber,
    toPrefix: 'whatsapp:',
    fromPrefix: 'whatsapp:'
  });
};

export const sendSms = async ({ to, message }) => {
  const provider = resolveSmsProvider();
  const normalizedTo = normalizePhone(to);
  const normalizedMessage = String(message || '').trim();

  if (!normalizedTo) {
    throw new Error('SMS recipient phone number is required');
  }
  if (!normalizedMessage) {
    throw new Error('SMS message body is required');
  }

  if (provider === 'none') {
    logger.info('sms_send_skipped_provider_none', {
      to: normalizedTo
    });
    return {
      delivered: false,
      provider: 'none',
      reason: 'SMS_PROVIDER=none'
    };
  }

  if (provider !== 'twilio') {
    throw new Error(`Unsupported SMS provider: ${provider}`);
  }

  const result = await sendViaTwilio({
    to: normalizedTo,
    message: normalizedMessage
  });

  logger.info('sms_sent', {
    provider: result.provider,
    to: normalizedTo,
    sid: result.sid || null
  });

  return {
    delivered: true,
    provider: result.provider,
    metadata: result
  };
};

export const sendBulkSms = async ({ recipients = [], message }) => {
  const uniqueRecipients = Array.from(
    new Set(
      recipients
        .map((entry) => normalizePhone(entry))
        .filter((entry) => Boolean(entry))
    )
  );

  const results = [];
  for (const recipient of uniqueRecipients) {
    try {
      const outcome = await sendSms({ to: recipient, message });
      results.push({
        recipient,
        ok: true,
        ...outcome
      });
    } catch (error) {
      logger.warn('sms_send_failed', {
        recipient,
        reason: error?.message || 'Unknown SMS error'
      });
      results.push({
        recipient,
        ok: false,
        error: error?.message || 'Unknown SMS error'
      });
    }
  }

  return {
    count: results.length,
    deliveredCount: results.filter((row) => row.ok && row.delivered).length,
    results
  };
};

export const sendWhatsApp = async ({ to, message }) => {
  const provider = resolveWhatsAppProvider();
  const normalizedTo = normalizeWhatsapp(to);
  const normalizedMessage = String(message || '').trim();

  if (!normalizedTo) {
    throw new Error('WhatsApp recipient phone number is required');
  }
  if (!normalizedMessage) {
    throw new Error('WhatsApp message body is required');
  }

  if (provider === 'none') {
    logger.info('whatsapp_send_skipped_provider_none', {
      to: normalizedTo
    });
    return {
      delivered: false,
      provider: 'none',
      reason: 'WHATSAPP_PROVIDER=none'
    };
  }

  if (provider !== 'twilio') {
    throw new Error(`Unsupported WhatsApp provider: ${provider}`);
  }

  const result = await sendViaTwilioWhatsapp({
    to: normalizedTo,
    message: normalizedMessage
  });

  logger.info('whatsapp_sent', {
    provider: result.provider,
    to: normalizedTo,
    sid: result.sid || null
  });

  return {
    delivered: true,
    provider: result.provider,
    metadata: result
  };
};

export const sendBulkWhatsApp = async ({ recipients = [], message }) => {
  const uniqueRecipients = Array.from(
    new Set(
      recipients
        .map((entry) => normalizeWhatsapp(entry))
        .filter((entry) => Boolean(entry))
    )
  );

  const results = [];
  for (const recipient of uniqueRecipients) {
    try {
      const outcome = await sendWhatsApp({ to: recipient, message });
      results.push({
        recipient,
        ok: true,
        ...outcome
      });
    } catch (error) {
      logger.warn('whatsapp_send_failed', {
        recipient,
        reason: error?.message || 'Unknown WhatsApp error'
      });
      results.push({
        recipient,
        ok: false,
        error: error?.message || 'Unknown WhatsApp error'
      });
    }
  }

  return {
    count: results.length,
    deliveredCount: results.filter((row) => row.ok && row.delivered).length,
    results
  };
};

export const getDefaultLowStockRecipients = () =>
  [...getRuntimeConfig().notifications.sms.lowStockRecipients];

export default {
  sendSms,
  sendBulkSms,
  sendWhatsApp,
  sendBulkWhatsApp,
  getDefaultLowStockRecipients
};
