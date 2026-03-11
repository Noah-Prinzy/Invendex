import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DEFAULT_SECRET_BYTES = 20;
const DEFAULT_TOTP_DIGITS = 6;
const DEFAULT_TOTP_STEP_SECONDS = 30;
const DEFAULT_TOTP_WINDOW = 1;
const DEFAULT_RECOVERY_CODES_COUNT = 10;
const DEFAULT_RECOVERY_SEGMENT_LENGTH = 5;

const sanitizeBase32 = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/=+$/g, '')
    .replace(/\s+/g, '');

const sanitizeRecoveryCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const timingSafeEquals = (a, b) => {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

export const encodeBase32 = (buffer) => {
  const source = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (!source.length) return '';

  let bits = 0;
  let value = 0;
  let encoded = '';

  for (const byte of source) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      encoded += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    encoded += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return encoded;
};

export const decodeBase32 = (value) => {
  const normalized = sanitizeBase32(value);
  if (!normalized) return Buffer.alloc(0);

  let bits = 0;
  let working = 0;
  const output = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) {
      throw new Error('Invalid base32 value');
    }

    working = (working << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((working >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
};

export const generateBase32Secret = (bytes = DEFAULT_SECRET_BYTES) => {
  const length = Number(bytes);
  const safeLength =
    Number.isFinite(length) && length >= 10 && length <= 128
      ? Math.floor(length)
      : DEFAULT_SECRET_BYTES;
  return encodeBase32(crypto.randomBytes(safeLength));
};

const computeTotpAtStep = ({
  base32Secret,
  counter,
  digits = DEFAULT_TOTP_DIGITS
}) => {
  const secret = decodeBase32(base32Secret);
  if (!secret.length) {
    throw new Error('TOTP secret cannot be empty');
  }

  const challenge = Buffer.alloc(8);
  challenge.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secret).update(challenge).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const modulus = 10 ** Number(digits || DEFAULT_TOTP_DIGITS);
  return String(codeInt % modulus).padStart(Number(digits), '0');
};

export const computeTotp = ({
  base32Secret,
  timestampMs = Date.now(),
  digits = DEFAULT_TOTP_DIGITS,
  stepSeconds = DEFAULT_TOTP_STEP_SECONDS
}) => {
  const step = Math.floor(Number(stepSeconds || DEFAULT_TOTP_STEP_SECONDS));
  const now = Number(timestampMs || Date.now());
  const counter = Math.floor(now / 1000 / step);
  return computeTotpAtStep({
    base32Secret,
    counter,
    digits
  });
};

export const verifyTotp = ({
  base32Secret,
  code,
  timestampMs = Date.now(),
  digits = DEFAULT_TOTP_DIGITS,
  stepSeconds = DEFAULT_TOTP_STEP_SECONDS,
  window = DEFAULT_TOTP_WINDOW
}) => {
  const submitted = String(code || '').trim();
  if (!/^\d{6,8}$/.test(submitted)) return false;
  if (!base32Secret) return false;

  const now = Number(timestampMs || Date.now());
  const step = Math.floor(Number(stepSeconds || DEFAULT_TOTP_STEP_SECONDS));
  const currentCounter = Math.floor(now / 1000 / step);
  const drift = Math.max(0, Number(window || DEFAULT_TOTP_WINDOW));

  for (let offset = -drift; offset <= drift; offset += 1) {
    const expected = computeTotpAtStep({
      base32Secret,
      counter: currentCounter + offset,
      digits
    });
    if (timingSafeEquals(expected, submitted)) {
      return true;
    }
  }

  return false;
};

const buildRecoveryCode = (segmentLength = DEFAULT_RECOVERY_SEGMENT_LENGTH) => {
  const normalizedLength =
    Number.isFinite(Number(segmentLength)) && Number(segmentLength) >= 4
      ? Math.floor(Number(segmentLength))
      : DEFAULT_RECOVERY_SEGMENT_LENGTH;

  const left = crypto
    .randomBytes(normalizedLength)
    .toString('hex')
    .slice(0, normalizedLength)
    .toUpperCase();
  const right = crypto
    .randomBytes(normalizedLength)
    .toString('hex')
    .slice(0, normalizedLength)
    .toUpperCase();
  return `${left}-${right}`;
};

export const generateRecoveryCodes = (count = DEFAULT_RECOVERY_CODES_COUNT) => {
  const normalizedCount =
    Number.isFinite(Number(count)) && Number(count) >= 1 && Number(count) <= 50
      ? Math.floor(Number(count))
      : DEFAULT_RECOVERY_CODES_COUNT;

  const codes = [];
  for (let index = 0; index < normalizedCount; index += 1) {
    codes.push(buildRecoveryCode());
  }
  return codes;
};

export const hashRecoveryCode = (value) =>
  crypto.createHash('sha256').update(sanitizeRecoveryCode(value)).digest('hex');

export const matchesRecoveryCodeHash = ({ recoveryCode, hash }) => {
  if (!recoveryCode || !hash) return false;
  const candidateHash = hashRecoveryCode(recoveryCode);
  return timingSafeEquals(candidateHash, String(hash || ''));
};

export const buildOtpAuthUri = ({ issuer, accountName, base32Secret }) => {
  const normalizedIssuer = String(issuer || 'Invendex').trim() || 'Invendex';
  const normalizedAccount = String(accountName || 'user').trim() || 'user';
  const normalizedSecret = sanitizeBase32(base32Secret);
  if (!normalizedSecret) {
    throw new Error('base32Secret is required');
  }

  const label = encodeURIComponent(`${normalizedIssuer}:${normalizedAccount}`);
  const query = new URLSearchParams({
    secret: normalizedSecret,
    issuer: normalizedIssuer,
    algorithm: 'SHA1',
    digits: String(DEFAULT_TOTP_DIGITS),
    period: String(DEFAULT_TOTP_STEP_SECONDS)
  });
  return `otpauth://totp/${label}?${query.toString()}`;
};

export const normalizeRecoveryCodeInput = sanitizeRecoveryCode;

export default {
  encodeBase32,
  decodeBase32,
  generateBase32Secret,
  computeTotp,
  verifyTotp,
  generateRecoveryCodes,
  hashRecoveryCode,
  matchesRecoveryCodeHash,
  buildOtpAuthUri,
  normalizeRecoveryCodeInput
};
