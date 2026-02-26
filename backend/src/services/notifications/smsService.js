import { logger } from '../../observability/logger.js';

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const resolveSmsProvider = () =>
  String(process.env.SMS_PROVIDER || 'none')
    .trim()
    .toLowerCase();

const normalizePhone = (value) =>
  String(value || '')
    .replace(/\s+/g, '')
    .trim();

const sendViaTwilio = async ({ to, message }) => {
  const accountSid = String(process.env.SMS_TWILIO_ACCOUNT_SID || '').trim();
  const authToken = String(process.env.SMS_TWILIO_AUTH_TOKEN || '').trim();
  const fromNumber = String(process.env.SMS_TWILIO_FROM || '').trim();

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      'Twilio SMS configuration missing: SMS_TWILIO_ACCOUNT_SID, SMS_TWILIO_AUTH_TOKEN, SMS_TWILIO_FROM'
    );
  }

  const form = new URLSearchParams({
    To: to,
    From: fromNumber,
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
      signal: AbortSignal.timeout(Number(process.env.SMS_TIMEOUT_MS || 4000))
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
    status: payload?.status || null
  };
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

export const getDefaultLowStockRecipients = () =>
  parseCsv(process.env.SMS_LOW_STOCK_RECIPIENTS);

export default {
  sendSms,
  sendBulkSms,
  getDefaultLowStockRecipients
};
