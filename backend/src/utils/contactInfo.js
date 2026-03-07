const PHONE_DIGIT_REGEX = /^\d{8,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeMobileNumber = (value) => {
  const normalized = String(value || '')
    .replace(/[^\d+]/g, '')
    .trim();

  if (!normalized) return '';

  if (normalized.startsWith('+')) {
    const digitsOnly = normalized.slice(1).replace(/\D/g, '');
    return digitsOnly ? `+${digitsOnly}` : '';
  }

  return normalized.replace(/\D/g, '');
};

export const isValidMobileNumber = (value) => {
  const normalized = normalizeMobileNumber(value);
  const digitsOnly = normalized.replace(/^\+/, '');
  return PHONE_DIGIT_REGEX.test(digitsOnly);
};

export const normalizeEmailAddress = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

export const isValidEmailAddress = (value) =>
  EMAIL_REGEX.test(normalizeEmailAddress(value));

export const dedupeContacts = (values = [], normalizer = (value) => value) => {
  const seen = new Set();
  const results = [];

  for (const entry of Array.isArray(values) ? values : []) {
    const normalized = String(normalizer(entry) || '').trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    results.push(normalized);
  }

  return results;
};
