import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import Organization from '../models/Organization.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import User from '../models/User.js';
import EmployeeInvite from '../models/EmployeeInvite.js';
import EmployeeSignupRequest from '../models/EmployeeSignupRequest.js';
import bcrypt from 'bcryptjs';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getAccessTokenSigningSecret,
  verifyAccessToken
} from '../utils/token.js';
import { logAudit } from '../utils/auditLogger.js';
import { logger } from '../observability/logger.js';
import { publishEmployeeSignedIn } from '../realtime/publisher.js';
import { createInAppNotification } from '../services/notifications/inAppNotificationService.js';
import { queueEmailNotification } from '../services/notifications/emailJobService.js';
import { notifyAdminsOfEmployeeAuthEvent } from '../services/notifications/adminAuthAlertService.js';
import {
  isValidMobileNumber,
  normalizeMobileNumber
} from '../utils/contactInfo.js';
import {
  getRefreshCookieOptions,
  getClearRefreshCookieOptions,
  getRuntimeConfig
} from '../config/envConfig.js';
import {
  buildOtpAuthUri,
  generateBase32Secret,
  generateRecoveryCodes,
  hashRecoveryCode,
  matchesRecoveryCodeHash,
  normalizeRecoveryCodeInput,
  verifyTotp
} from '../utils/totp.js';

const MAX_SESSIONS = 5;
const SESSION_ID_PREFIX = 'sess';
const MAX_SESSION_DEVICE_ID_LENGTH = 120;
const MAX_SESSION_USER_AGENT_LENGTH = 255;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const ADMIN_ROLES = new Set(['owner', 'admin']);
const ALLOWED_UI_THEMES = new Set([
  'invendex-classic',
  'glacier-blue',
  'emerald-shift',
  'graphite-noir',
  'sunset-ember',
  'royal-violet',
  'sand-dune',
  'neon-grid'
]);
const DEFAULT_UI_THEME = 'invendex-classic';
const TWO_FACTOR_CHALLENGE_TTL_SECONDS =
  getRuntimeConfig().auth.twoFactorChallengeTtlSeconds;
const TWO_FACTOR_ISSUER = getRuntimeConfig().auth.twoFactorIssuer;
const TWO_FACTOR_RECOVERY_CODES_COUNT = 10;
const APP_WEB_URL = getRuntimeConfig().auth.appWebUrl;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

const buildEmailActionHint = (fallbackMessage = '') => {
  if (!APP_WEB_URL) {
    return fallbackMessage ? `\n\n${fallbackMessage}` : '';
  }
  return `\n\nOpen ${APP_WEB_URL} to continue.`;
};

const resolveAppAssetUrl = (assetPath = '') => {
  const normalizedBaseUrl = String(APP_WEB_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const normalizedAssetPath = `/${String(assetPath || '')
    .trim()
    .replace(/^\/+/, '')}`;

  if (!normalizedBaseUrl || normalizedAssetPath === '/') {
    return '';
  }

  return `${normalizedBaseUrl}${normalizedAssetPath}`;
};

const buildEmployeeSignupDecisionEmailHtml = ({
  title,
  username,
  organizationName,
  decision,
  reason = ''
}) => {
  const normalizedDecision = String(decision || '')
    .trim()
    .toLowerCase();
  const isApproved = normalizedDecision === 'approved';
  const logoUrl = resolveAppAssetUrl('/apple-touch-icon.png');
  const openAppUrl = APP_WEB_URL || '';
  const headline = isApproved
    ? 'Your workspace access is ready'
    : 'Your workspace access request was declined';
  const message = isApproved
    ? `Your Invendex signup request for ${organizationName || 'your organization'} was approved. You can now sign in with your company name, username, and password.`
    : `Your Invendex signup request for ${organizationName || 'your organization'} was declined.`;
  const supportMessage = isApproved
    ? 'If you did not request this account, contact a workspace administrator immediately.'
    : reason
      ? `Reason: ${reason}`
      : 'If you still need access, contact a workspace administrator.';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title || 'Invendex')}</title>
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
          ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Invendex logo" />` : ''}
          <span class="brand-badge">Invendex access</span>
        </div>
        <h1>${escapeHtml(headline)}</h1>
        <p>Hi ${escapeHtml(username || 'there')},</p>
        <p style="margin-top: 10px;">${escapeHtml(message)}</p>
        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Workspace</span>
            <strong>${escapeHtml(organizationName || 'n/a')}</strong>
          </div>
          <div class="detail-row">
            <span class="detail-label">Username</span>
            <strong>${escapeHtml(username || 'n/a')}</strong>
          </div>
          <div class="detail-row">
            <span class="detail-label">Request status</span>
            <strong>${escapeHtml(String(decision || '').toUpperCase())}</strong>
          </div>
        </div>
        ${
          openAppUrl
            ? `<a class="button" href="${escapeHtml(openAppUrl)}">Open Invendex</a>`
            : ''
        }
        <div class="support">${escapeHtml(supportMessage)}</div>
      </div>
    </div>
  </body>
</html>`;
};

const buildAuthTokenEmailHtml = ({
  title,
  eyebrow,
  headline,
  intro,
  recipientLabel,
  organizationName,
  tokenLabel,
  tokenValue,
  expiresText,
  supportMessage
}) => {
  const logoUrl = resolveAppAssetUrl('/apple-touch-icon.png');
  const openAppUrl = APP_WEB_URL || '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title || 'Invendex')}</title>
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
      .token-block {
        margin-top: 20px;
        padding: 18px;
        border-radius: 20px;
        background: rgba(99, 182, 255, 0.12);
        border: 1px solid rgba(99, 182, 255, 0.18);
      }
      .token-label {
        display: block;
        margin-bottom: 8px;
        color: rgba(239, 247, 255, 0.62);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .token-value {
        display: inline-flex;
        font-family: Consolas, "SFMono-Regular", monospace;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #eff7ff;
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
        .token-value {
          font-size: 18px;
          word-break: break-all;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="card">
        <div class="brand">
          ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Invendex logo" />` : ''}
          <span class="brand-badge">${escapeHtml(eyebrow || 'Invendex security')}</span>
        </div>
        <h1>${escapeHtml(headline || title || 'Invendex')}</h1>
        <p>${escapeHtml(intro || '')}</p>
        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Email</span>
            <strong>${escapeHtml(recipientLabel || 'n/a')}</strong>
          </div>
          <div class="detail-row">
            <span class="detail-label">Workspace</span>
            <strong>${escapeHtml(organizationName || 'n/a')}</strong>
          </div>
          <div class="detail-row">
            <span class="detail-label">Expires</span>
            <strong>${escapeHtml(expiresText || 'n/a')}</strong>
          </div>
        </div>
        <div class="token-block">
          <span class="token-label">${escapeHtml(tokenLabel || 'Token')}</span>
          <span class="token-value">${escapeHtml(tokenValue || '')}</span>
        </div>
        ${
          openAppUrl
            ? `<a class="button" href="${escapeHtml(openAppUrl)}">Open Invendex</a>`
            : ''
        }
        <div class="support">${escapeHtml(supportMessage || '')}</div>
      </div>
    </div>
  </body>
</html>`;
};

const buildSecurityAlertEmailHtml = ({
  title,
  eyebrow = 'Invendex security',
  headline,
  intro,
  detailRows = [],
  supportMessage = ''
}) => {
  const logoUrl = resolveAppAssetUrl('/apple-touch-icon.png');
  const openAppUrl = APP_WEB_URL || '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title || 'Invendex')}</title>
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
          ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Invendex logo" />` : ''}
          <span class="brand-badge">${escapeHtml(eyebrow)}</span>
        </div>
        <h1>${escapeHtml(headline || title || 'Invendex')}</h1>
        <p>${escapeHtml(intro || '')}</p>
        ${
          Array.isArray(detailRows) && detailRows.length
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
          openAppUrl
            ? `<a class="button" href="${escapeHtml(openAppUrl)}">Open Invendex</a>`
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

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getTwoFactorChallengeSecret = () => {
  const explicitSecret = getRuntimeConfig().auth.twoFactorChallengeSecret;
  if (explicitSecret) return explicitSecret;
  return getAccessTokenSigningSecret();
};

const signTwoFactorChallenge = (payload) =>
  jwt.sign(payload, getTwoFactorChallengeSecret(), {
    expiresIn: TWO_FACTOR_CHALLENGE_TTL_SECONDS
  });

const verifyTwoFactorChallenge = (token) =>
  jwt.verify(String(token || ''), getTwoFactorChallengeSecret());

const isTwoFactorEnabled = (user) => Boolean(user?.twoFactor?.enabled);

const requireCurrentPasswordMatch = async ({ user, password }) => {
  const normalizedPassword = String(password || '').trim();
  if (!normalizedPassword) {
    throw new AppError('currentPassword is required', 400);
  }

  const isMatch = await bcrypt.compare(normalizedPassword, user.password);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401);
  }
};

const consumeRecoveryCodeIfValid = ({ user, recoveryCode }) => {
  const normalizedCode = normalizeRecoveryCodeInput(recoveryCode);
  if (!normalizedCode) return false;

  if (!Array.isArray(user?.twoFactor?.recoveryCodes)) {
    return false;
  }

  for (const entry of user.twoFactor.recoveryCodes) {
    if (!entry || entry.usedAt) continue;
    if (
      matchesRecoveryCodeHash({
        recoveryCode: normalizedCode,
        hash: entry.codeHash
      })
    ) {
      entry.usedAt = new Date();
      return true;
    }
  }

  return false;
};

const assertTwoFactorProof = ({ user, code, recoveryCode }) => {
  const hasCode = String(code || '').trim().length > 0;
  const hasRecoveryCode = normalizeRecoveryCodeInput(recoveryCode).length > 0;

  if (!hasCode && !hasRecoveryCode) {
    throw new AppError('Provide either code or recoveryCode', 400);
  }

  if (!isTwoFactorEnabled(user)) {
    throw new AppError('Two-factor authentication is not enabled', 409);
  }

  if (hasCode) {
    const isValidCode = verifyTotp({
      base32Secret: user.twoFactor.secret,
      code
    });
    if (isValidCode) {
      return;
    }
  }

  if (hasRecoveryCode) {
    const recoveryMatched = consumeRecoveryCodeIfValid({
      user,
      recoveryCode
    });
    if (recoveryMatched) {
      return;
    }
  }

  throw new AppError('Invalid two-factor code', 401);
};

const buildRecoveryCodeRecords = (plainCodes = []) =>
  plainCodes.map((code) => ({
    codeHash: hashRecoveryCode(code),
    createdAt: new Date(),
    usedAt: null
  }));

const buildTwoFactorStatusPayload = (user) => {
  const recoveryCodes = Array.isArray(user?.twoFactor?.recoveryCodes)
    ? user.twoFactor.recoveryCodes
    : [];

  const remainingRecoveryCodes = recoveryCodes.filter(
    (entry) => !entry?.usedAt
  ).length;

  return {
    enabled: Boolean(user?.twoFactor?.enabled),
    pendingSetup: Boolean(user?.twoFactor?.pendingSecret),
    enabledAt: toIsoTimestamp(user?.twoFactor?.enabledAt),
    lastVerifiedAt: toIsoTimestamp(user?.twoFactor?.lastVerifiedAt),
    remainingRecoveryCodes
  };
};

const isEmailVerificationRequired = () =>
  getRuntimeConfig().auth.requireEmailVerification;

const normalizeEmailInput = (value) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();

const normalizeUsernameInput = (value) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();

const normalizeOrganizationNameInput = (value) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

const normalizeMobileNumberInput = (value) => normalizeMobileNumber(value);

const escapeRegex = (value) =>
  String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hashToken = (token) =>
  crypto
    .createHash('sha256')
    .update(String(token || ''))
    .digest('hex');

const generateRawToken = () => crypto.randomBytes(24).toString('hex');

const buildOrganizationCode = (organizationName, attempt = 0) => {
  const base = String(organizationName || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

  const normalizedBase = base || 'ORG';
  const entropy = `${Date.now().toString().slice(-6)}${Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, '0')}`;

  if (attempt <= 0) {
    return `${normalizedBase}-${entropy}`;
  }

  return `${normalizedBase}-${entropy}-${attempt}`;
};

const generateSessionId = () =>
  `${SESSION_ID_PREFIX}_${crypto.randomBytes(12).toString('hex')}`;

const sanitizeSessionField = (value, maxLength) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (!Number.isFinite(Number(maxLength)) || maxLength <= 0) {
    return normalized;
  }
  return normalized.slice(0, maxLength);
};

const getRequestIpAddress = (req) => {
  const forwardedFor = String(req.headers?.['x-forwarded-for'] || '').trim();
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const directIp = String(req.ip || req.socket?.remoteAddress || '').trim();
  return directIp || null;
};

const extractBearerAccessToken = (req) => {
  const authorizationHeader = String(req.headers?.authorization || '').trim();
  if (!authorizationHeader.startsWith('Bearer ')) {
    return '';
  }

  return String(authorizationHeader.slice(7) || '').trim();
};

const buildSessionMetadata = (req, overrides = {}) => {
  const normalizedSessionId = sanitizeSessionField(
    overrides?.sessionId,
    MAX_SESSION_DEVICE_ID_LENGTH
  );
  const headerDeviceId = sanitizeSessionField(
    req.headers?.['x-device-id'],
    MAX_SESSION_DEVICE_ID_LENGTH
  );
  const providedDeviceId = sanitizeSessionField(
    overrides?.deviceId,
    MAX_SESSION_DEVICE_ID_LENGTH
  );

  return {
    sessionId: normalizedSessionId || generateSessionId(),
    deviceId: providedDeviceId || headerDeviceId || null,
    userAgent: sanitizeSessionField(
      req.headers?.['user-agent'],
      MAX_SESSION_USER_AGENT_LENGTH
    ),
    ipAddress: sanitizeSessionField(
      overrides?.ipAddress || getRequestIpAddress(req),
      MAX_SESSION_USER_AGENT_LENGTH
    ),
    lastUsedAt: new Date()
  };
};

const appendRefreshToken = (user, sessionMetadata = {}) => {
  const refreshToken = generateRefreshToken(user);
  const now = new Date();
  user.refreshTokens.push({
    token: refreshToken,
    sessionId: sanitizeSessionField(
      sessionMetadata?.sessionId,
      MAX_SESSION_DEVICE_ID_LENGTH
    ),
    deviceId: sanitizeSessionField(
      sessionMetadata?.deviceId,
      MAX_SESSION_DEVICE_ID_LENGTH
    ),
    userAgent: sanitizeSessionField(
      sessionMetadata?.userAgent,
      MAX_SESSION_USER_AGENT_LENGTH
    ),
    ipAddress: sanitizeSessionField(
      sessionMetadata?.ipAddress,
      MAX_SESSION_USER_AGENT_LENGTH
    ),
    lastUsedAt: sessionMetadata?.lastUsedAt || now,
    createdAt: now
  });
  if (user.refreshTokens.length > MAX_SESSIONS) {
    user.refreshTokens = user.refreshTokens
      .sort(
        (a, b) =>
          new Date(a?.createdAt || 0).getTime() -
          new Date(b?.createdAt || 0).getTime()
      )
      .slice(-MAX_SESSIONS);
  }

  return {
    refreshToken,
    sessionId:
      user.refreshTokens[user.refreshTokens.length - 1]?.sessionId || null
  };
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', getClearRefreshCookieOptions());
};

const toIsoTimestamp = (value) => {
  if (!value) return null;
  const candidate = new Date(value);
  if (!Number.isFinite(candidate.getTime())) return null;
  return candidate.toISOString();
};

const ensureRefreshTokenSessionShape = (user) => {
  if (!user || !Array.isArray(user.refreshTokens)) return false;
  let changed = false;

  for (const tokenEntry of user.refreshTokens) {
    if (!tokenEntry.sessionId) {
      tokenEntry.sessionId = generateSessionId();
      changed = true;
    }

    if (!tokenEntry.createdAt) {
      tokenEntry.createdAt = new Date();
      changed = true;
    }

    if (!tokenEntry.lastUsedAt) {
      tokenEntry.lastUsedAt = tokenEntry.createdAt || new Date();
      changed = true;
    }
  }

  return changed;
};

const mapRefreshTokenSessions = ({ user, currentToken = '' }) => {
  const sessions = (user.refreshTokens || []).map((entry) => ({
    sessionId: String(entry?.sessionId || ''),
    createdAt: toIsoTimestamp(entry?.createdAt),
    lastUsedAt: toIsoTimestamp(entry?.lastUsedAt || entry?.createdAt),
    deviceId: sanitizeSessionField(
      entry?.deviceId,
      MAX_SESSION_DEVICE_ID_LENGTH
    ),
    userAgent: sanitizeSessionField(
      entry?.userAgent,
      MAX_SESSION_USER_AGENT_LENGTH
    ),
    ipAddress: sanitizeSessionField(
      entry?.ipAddress,
      MAX_SESSION_USER_AGENT_LENGTH
    ),
    current:
      Boolean(currentToken) && String(entry?.token) === String(currentToken)
  }));

  return sessions.sort(
    (a, b) =>
      new Date(b.lastUsedAt || b.createdAt || 0).getTime() -
      new Date(a.lastUsedAt || a.createdAt || 0).getTime()
  );
};

const buildOrganizationPayload = (organization) => {
  if (!organization) return null;
  return {
    _id: organization._id,
    name: organization.name || null,
    code: organization.code || null
  };
};

const resolveOrganizationPayloadById = async (organizationId) => {
  if (!organizationId) return null;
  const organization = await Organization.findById(organizationId)
    .select('_id name code')
    .lean();
  return buildOrganizationPayload(organization);
};

const buildAuthUser = (user, organization = null) => ({
  _id: user._id,
  email: user.email,
  mobileNumber: user.mobileNumber || null,
  username: user.username || null,
  role: user.role,
  twoFactorEnabled: Boolean(user?.twoFactor?.enabled),
  uiTheme: ALLOWED_UI_THEMES.has(String(user.uiTheme || '').trim())
    ? String(user.uiTheme || '').trim()
    : DEFAULT_UI_THEME,
  organization: user.organization || organization?._id || null,
  organizationName: organization?.name || null,
  isVerified: Boolean(user.isVerified),
  isActive: user.isActive !== false
});

const buildUsernameSeedFromEmail = (email) => {
  const base = String(email || '')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');
  return base || 'user';
};

const ensureValidUsername = (username) => {
  const normalized = normalizeUsernameInput(username);
  if (!normalized) {
    return null;
  }

  if (!USERNAME_REGEX.test(normalized)) {
    throw new AppError(
      'username must be 3-32 characters and use letters, numbers, dot, underscore, or hyphen',
      400
    );
  }

  return normalized;
};

const resolveUniqueUsername = async (preferredUsername, fallbackEmail) => {
  const requested = ensureValidUsername(preferredUsername);
  if (requested) {
    const existing = await User.findOne({ username: requested })
      .select('_id')
      .lean();
    if (existing) {
      throw new AppError('Username already exists', 409);
    }
    return requested;
  }

  const seed = buildUsernameSeedFromEmail(fallbackEmail);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate =
      attempt === 0
        ? seed
        : `${seed}${Math.floor(Math.random() * 9000 + 1000).toString()}`;
    if (!USERNAME_REGEX.test(candidate)) continue;

    const existing = await User.findOne({ username: candidate })
      .select('_id')
      .lean();
    if (!existing) {
      return candidate;
    }
  }

  throw new AppError('Unable to generate unique username. Try again.', 500);
};

const buildTokenDebugData = (rawToken) => {
  if (getRuntimeConfig().isProduction) {
    return {};
  }

  return { debugToken: rawToken };
};

const queueAuthEmail = async ({
  organizationId,
  userId = null,
  to,
  subject,
  message,
  html = null,
  notificationType,
  metadata = {}
}) => {
  if (!to || !subject || !message) {
    return;
  }

  try {
    await queueEmailNotification({
      organizationId,
      createdBy: userId,
      to,
      subject,
      text: message,
      html,
      notificationType,
      metadata
    });
  } catch (error) {
    logger.warn('auth_email_queue_failed', {
      to,
      organizationId: organizationId ? String(organizationId) : null,
      notificationType,
      err: error
    });
  }
};

const queueSecurityAlertEmail = async ({
  organizationId,
  userId = null,
  to,
  subject,
  headline,
  intro,
  detailRows = [],
  supportMessage = '',
  notificationType,
  metadata = {}
}) => {
  const plainTextMessage = [
    intro,
    '',
    ...detailRows.map(
      ({ label, value }) =>
        `${String(label || '').trim()}: ${String(value || '').trim()}`
    ),
    buildEmailActionHint(supportMessage)
  ]
    .filter(Boolean)
    .join('\n');

  await queueAuthEmail({
    organizationId,
    userId,
    to,
    subject,
    message: plainTextMessage,
    html: buildSecurityAlertEmailHtml({
      title: subject,
      headline,
      intro,
      detailRows,
      supportMessage
    }),
    notificationType,
    metadata
  });
};

const queueEmployeeSignupDecisionEmail = async ({
  organizationId,
  organizationName,
  to,
  username,
  decision,
  reason = ''
}) => {
  const normalizedDecision = String(decision || '')
    .trim()
    .toLowerCase();
  const normalizedUsername = String(username || '').trim() || 'there';
  const normalizedEmail = normalizeEmailInput(to);

  if (!normalizedEmail) {
    return;
  }

  if (normalizedDecision === 'approved') {
    const message = [
      `Hi ${normalizedUsername},`,
      '',
      `Your Invendex signup request for ${organizationName || 'your organization'} was approved.`,
      'You can now sign in with your username and password.',
      buildEmailActionHint(
        'If you did not request this account, contact an administrator.'
      )
    ].join('\n');

    await queueAuthEmail({
      organizationId,
      to: normalizedEmail,
      subject: 'Your Invendex signup request was approved',
      message,
      html: buildEmployeeSignupDecisionEmailHtml({
        title: 'Your Invendex signup request was approved',
        username: normalizedUsername,
        organizationName: organizationName || 'your organization',
        decision: 'approved'
      }),
      notificationType: 'EMPLOYEE_SIGNUP_APPROVED',
      metadata: {
        organizationName: organizationName || null,
        username: normalizedUsername
      }
    });
    return;
  }

  const message = [
    `Hi ${normalizedUsername},`,
    '',
    `Your Invendex signup request for ${organizationName || 'your organization'} was declined.`,
    reason
      ? `Reason: ${reason}`
      : 'Contact an administrator if you need access.',
    buildEmailActionHint(
      'If you believe this is an error, contact the workspace administrator.'
    )
  ].join('\n');

  await queueAuthEmail({
    organizationId,
    to: normalizedEmail,
    subject: 'Your Invendex signup request was declined',
    message,
    html: buildEmployeeSignupDecisionEmailHtml({
      title: 'Your Invendex signup request was declined',
      username: normalizedUsername,
      organizationName: organizationName || 'your organization',
      decision: 'declined',
      reason
    }),
    notificationType: 'EMPLOYEE_SIGNUP_DECLINED',
    metadata: {
      organizationName: organizationName || null,
      username: normalizedUsername,
      reason: reason || null
    }
  });
};

const buildSyntheticAuditRequest = ({
  reviewedByUserId,
  organizationId,
  path
}) => ({
  user: reviewedByUserId
    ? { _id: reviewedByUserId, organization: organizationId }
    : null,
  organizationId,
  method: 'GET',
  originalUrl: path,
  headers: {
    'user-agent': 'Invendex email action'
  }
});

const reviewEmployeeSignupRequestInternal = async ({
  organizationId,
  requestId,
  decision,
  reviewedByUserId = null,
  reason = '',
  auditRequest = null
}) => {
  const normalizedDecision = String(decision || '')
    .trim()
    .toLowerCase();
  if (!organizationId || !requestId) {
    throw new AppError('organization and request id are required', 400);
  }
  if (!['approve', 'decline'].includes(normalizedDecision)) {
    throw new AppError('decision must be approve or decline', 400);
  }

  if (normalizedDecision === 'approve') {
    const signupRequest = await EmployeeSignupRequest.findOne({
      _id: requestId,
      organization: organizationId,
      status: 'PENDING'
    }).select('+passwordHash');

    if (!signupRequest) {
      throw new AppError('Signup request not found', 404);
    }

    const [existingByEmail, existingByUsername] = await Promise.all([
      User.findOne({ email: signupRequest.email }).select('_id').lean(),
      User.findOne({ username: signupRequest.username }).select('_id').lean()
    ]);

    if (existingByEmail || existingByUsername) {
      throw new AppError(
        'A user with this email or username already exists',
        409
      );
    }

    const organizationSettings = await OrganizationSettings.findOne({
      organization: organizationId
    })
      .select('userAccess.defaultEmployeeRole')
      .lean();

    const defaultEmployeeRole =
      organizationSettings?.userAccess?.defaultEmployeeRole === 'manager'
        ? 'manager'
        : 'staff';

    const createdUser = await User.create({
      email: signupRequest.email,
      mobileNumber: signupRequest.mobileNumber || null,
      username: signupRequest.username,
      password: signupRequest.passwordHash,
      role: defaultEmployeeRole,
      organization: organizationId,
      isVerified: true,
      isActive: true
    });

    signupRequest.status = 'APPROVED';
    signupRequest.reviewedBy = reviewedByUserId || null;
    signupRequest.reviewedAt = new Date();
    signupRequest.declineReason = null;
    await signupRequest.save();

    const organization = await resolveOrganizationPayloadById(organizationId);

    await createInAppNotification({
      organizationId,
      actorUserId: reviewedByUserId || null,
      type: 'employee_signup_approved',
      title: 'Employee signup approved',
      message: `${signupRequest.username} was approved and can now sign in.`,
      severity: 'info',
      entityType: 'EMPLOYEE_SIGNUP_REQUEST',
      entityId: signupRequest._id,
      metadata: {
        signupRequestId: signupRequest._id,
        userId: createdUser._id,
        email: signupRequest.email,
        mobileNumber: signupRequest.mobileNumber || null,
        username: signupRequest.username,
        status: signupRequest.status
      }
    });

    await queueEmployeeSignupDecisionEmail({
      organizationId,
      organizationName: organization?.name || 'your organization',
      to: signupRequest.email,
      username: signupRequest.username,
      decision: 'approved'
    });

    await logAudit({
      req:
        auditRequest ||
        buildSyntheticAuditRequest({
          reviewedByUserId,
          organizationId,
          path: `/auth/employee/signup-requests/${requestId}/approve`
        }),
      action: 'EMPLOYEE_SIGNUP_REQUEST_APPROVE',
      resource: 'AUTH',
      resourceId: signupRequest._id,
      organizationId,
      meta: {
        username: signupRequest.username,
        email: signupRequest.email,
        mobileNumber: signupRequest.mobileNumber || null,
        userId: createdUser._id
      }
    });

    return {
      requestId: signupRequest._id,
      status: signupRequest.status,
      userId: createdUser._id,
      username: createdUser.username,
      organization,
      signupRequest
    };
  }

  const signupRequest = await EmployeeSignupRequest.findOne({
    _id: requestId,
    organization: organizationId,
    status: 'PENDING'
  });

  if (!signupRequest) {
    throw new AppError('Signup request not found', 404);
  }

  signupRequest.status = 'DECLINED';
  signupRequest.reviewedBy = reviewedByUserId || null;
  signupRequest.reviewedAt = new Date();
  signupRequest.declineReason = reason || null;
  await signupRequest.save();

  const organization = await resolveOrganizationPayloadById(organizationId);

  await createInAppNotification({
    organizationId,
    actorUserId: reviewedByUserId || null,
    type: 'employee_signup_declined',
    title: 'Employee signup declined',
    message: `${signupRequest.username} signup request was declined.`,
    severity: 'warning',
    entityType: 'EMPLOYEE_SIGNUP_REQUEST',
    entityId: signupRequest._id,
    metadata: {
      signupRequestId: signupRequest._id,
      email: signupRequest.email,
      username: signupRequest.username,
      status: signupRequest.status,
      reason: reason || null
    }
  });

  await queueEmployeeSignupDecisionEmail({
    organizationId,
    organizationName: organization?.name || 'your organization',
    to: signupRequest.email,
    username: signupRequest.username,
    decision: 'declined',
    reason
  });

  await logAudit({
    req:
      auditRequest ||
      buildSyntheticAuditRequest({
        reviewedByUserId,
        organizationId,
        path: `/auth/employee/signup-requests/${requestId}/decline`
      }),
    action: 'EMPLOYEE_SIGNUP_REQUEST_DECLINE',
    resource: 'AUTH',
    resourceId: signupRequest._id,
    organizationId,
    meta: {
      username: signupRequest.username,
      email: signupRequest.email,
      reason: reason || null
    }
  });

  return {
    requestId: signupRequest._id,
    status: signupRequest.status,
    organization,
    signupRequest
  };
};

const resolveOrganizationByName = async (companyName) => {
  const normalizedCompanyName = normalizeOrganizationNameInput(companyName);
  if (!normalizedCompanyName) return null;

  return Organization.findOne({
    name: new RegExp(`^${escapeRegex(normalizedCompanyName)}$`, 'i'),
    isActive: true
  });
};

const verifyLoginCredentials = async ({
  user,
  loginIdentifier,
  normalizedPassword
}) => {
  if (!user) {
    if (!getRuntimeConfig().isProduction) {
      logger.warn('auth_login_user_not_found', {
        identifier: loginIdentifier,
        identifierLength: String(loginIdentifier || '').length
      });
    }
    throw new AppError('Invalid credentials', 401);
  }

  if (user.isActive === false) {
    throw new AppError(
      'Account is deactivated. Contact an administrator.',
      403
    );
  }

  if (isEmailVerificationRequired() && !user.isVerified) {
    throw new AppError(
      'Email verification required. Please verify your account first.',
      403
    );
  }

  const isMatch = await bcrypt.compare(normalizedPassword, user.password);
  if (!isMatch) {
    if (!getRuntimeConfig().isProduction) {
      logger.warn('auth_login_password_mismatch', {
        identifier: loginIdentifier,
        userId: user._id
      });
    }
    throw new AppError('Invalid credentials', 401);
  }
};

const findUserByUsernameOrEmail = async ({
  username,
  email,
  includePassword = true
}) => {
  const normalizedUsername = normalizeUsernameInput(username);
  const normalizedEmail = normalizeEmailInput(email);
  const selector = includePassword ? '+password' : '';

  if (normalizedUsername) {
    const byUsername = await User.findOne({
      username: normalizedUsername
    }).select(selector);
    if (byUsername) return byUsername;
  }

  if (normalizedEmail) {
    return User.findOne({ email: normalizedEmail }).select(selector);
  }

  return null;
};

const buildTwoFactorChallengePayload = ({
  req,
  user,
  portal = 'generic',
  context = {}
}) => {
  const tokenPayload = {
    type: 'two_factor_login',
    userId: String(user._id),
    organizationId: user.organization ? String(user.organization) : null,
    portal: String(portal || 'generic'),
    sessionMetadata: buildSessionMetadata(req),
    context:
      context && typeof context === 'object' && !Array.isArray(context)
        ? context
        : {}
  };

  return {
    requiresTwoFactor: true,
    twoFactorToken: signTwoFactorChallenge(tokenPayload),
    expiresInSeconds: TWO_FACTOR_CHALLENGE_TTL_SECONDS,
    portal: tokenPayload.portal
  };
};

const finalizeLogin = async ({
  req,
  res,
  user,
  action,
  meta = null,
  sessionMetadata = null
}) => {
  const accessToken = generateAccessToken(user);
  const { refreshToken, sessionId } = appendRefreshToken(
    user,
    sessionMetadata || buildSessionMetadata(req)
  );
  const organization = await resolveOrganizationPayloadById(user.organization);

  await user.save();
  setRefreshCookie(res, refreshToken);

  await logAudit({
    req,
    action,
    resource: 'AUTH',
    resourceId: user._id,
    organizationId: user.organization || null,
    meta
  });

  return {
    accessToken,
    sessionId,
    user: buildAuthUser(user, organization),
    organization
  };
};

export const login = async (req, res, next) => {
  try {
    const normalizedUsername = normalizeUsernameInput(req.body?.username);
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const normalizedPassword = String(req.body?.password || '').trim();

    if ((!normalizedUsername && !normalizedEmail) || !normalizedPassword) {
      throw new AppError('username (or email) and password are required', 400);
    }

    const user = await findUserByUsernameOrEmail({
      username: normalizedUsername,
      email: normalizedEmail,
      includePassword: true
    });
    await verifyLoginCredentials({
      user,
      loginIdentifier: normalizedUsername || normalizedEmail,
      normalizedPassword
    });

    if (isTwoFactorEnabled(user)) {
      return successResponse(
        res,
        buildTwoFactorChallengePayload({
          req,
          user,
          portal: 'generic'
        }),
        'Two-factor authentication required'
      );
    }

    const data = await finalizeLogin({
      req,
      res,
      user,
      action: 'LOGIN',
      meta: {
        portal: 'generic'
      }
    });

    return successResponse(res, data, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const adminLogin = async (req, res, next) => {
  try {
    const normalizedUsername = normalizeUsernameInput(req.body?.username);
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const normalizedPassword = String(req.body?.password || '').trim();

    if ((!normalizedUsername && !normalizedEmail) || !normalizedPassword) {
      throw new AppError('username and password are required', 400);
    }

    const user = await findUserByUsernameOrEmail({
      username: normalizedUsername,
      email: normalizedEmail,
      includePassword: true
    });
    await verifyLoginCredentials({
      user,
      loginIdentifier: normalizedUsername || normalizedEmail,
      normalizedPassword
    });

    if (!ADMIN_ROLES.has(String(user.role || '').toLowerCase())) {
      throw new AppError('Use the employee portal for this account', 403);
    }

    if (isTwoFactorEnabled(user)) {
      return successResponse(
        res,
        buildTwoFactorChallengePayload({
          req,
          user,
          portal: 'admin'
        }),
        'Two-factor authentication required'
      );
    }

    const data = await finalizeLogin({
      req,
      res,
      user,
      action: 'ADMIN_LOGIN',
      meta: {
        portal: 'admin'
      }
    });

    return successResponse(res, data, 'Admin login successful');
  } catch (err) {
    next(err);
  }
};

export const employeeLogin = async (req, res, next) => {
  try {
    const normalizedCompanyName = normalizeOrganizationNameInput(
      req.body?.companyName || req.body?.organizationName
    );
    const normalizedUsername = normalizeUsernameInput(req.body?.username);
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const normalizedPassword = String(req.body?.password || '').trim();
    const inviteCode = String(req.body?.inviteCode || '').trim();

    if (
      !normalizedCompanyName ||
      (!normalizedUsername && !normalizedEmail) ||
      !normalizedPassword
    ) {
      throw new AppError(
        'companyName, username (or email), and password are required',
        400
      );
    }

    const organization = await resolveOrganizationByName(normalizedCompanyName);
    if (!organization) {
      throw new AppError('Invalid credentials', 401);
    }

    let user = await findUserByUsernameOrEmail({
      username: normalizedUsername,
      email: normalizedEmail,
      includePassword: true
    });
    let autoCreated = false;

    if (!user) {
      if (!inviteCode) {
        throw new AppError(
          'Account not found. Submit employee signup request or use a valid invite code.',
          403
        );
      }

      if (!normalizedEmail) {
        throw new AppError('email is required when using invite code', 400);
      }

      const now = new Date();
      const consumedInvite = await EmployeeInvite.findOne({
        organization: organization._id,
        codeHash: hashToken(inviteCode),
        status: 'ACTIVE',
        expiresAt: { $gt: now }
      }).select('+codeHash');

      if (!consumedInvite) {
        throw new AppError('Invalid or expired invite code', 403);
      }

      if (
        consumedInvite.email &&
        String(consumedInvite.email).toLowerCase() !== normalizedEmail
      ) {
        throw new AppError('Invite code does not match this email', 403);
      }

      const organizationSettings = await OrganizationSettings.findOne({
        organization: organization._id
      })
        .select('userAccess.defaultEmployeeRole')
        .lean();

      const defaultEmployeeRole =
        organizationSettings?.userAccess?.defaultEmployeeRole === 'manager'
          ? 'manager'
          : 'staff';

      const inviteUsername = await resolveUniqueUsername(
        normalizedUsername || null,
        normalizedEmail
      );

      user = await User.create({
        email: normalizedEmail,
        username: inviteUsername,
        password: normalizedPassword,
        role: defaultEmployeeRole,
        organization: organization._id,
        isVerified: true,
        isActive: true
      });
      user = await User.findById(user._id).select('+password');
      autoCreated = true;

      consumedInvite.status = 'USED';
      consumedInvite.usedBy = user._id;
      consumedInvite.usedAt = now;
      await consumedInvite.save();
    }

    if (!user || String(user.organization || '') !== String(organization._id)) {
      throw new AppError('Invalid credentials', 401);
    }

    if (ADMIN_ROLES.has(String(user.role || '').toLowerCase())) {
      throw new AppError('Use the admin portal for this account', 403);
    }

    if (!autoCreated) {
      await verifyLoginCredentials({
        user,
        loginIdentifier: normalizedUsername || normalizedEmail,
        normalizedPassword
      });
    }

    if (isTwoFactorEnabled(user)) {
      return successResponse(
        res,
        buildTwoFactorChallengePayload({
          req,
          user,
          portal: 'employee',
          context: {
            organizationName: organization.name
          }
        }),
        'Two-factor authentication required'
      );
    }

    const data = await finalizeLogin({
      req,
      res,
      user,
      action: 'EMPLOYEE_LOGIN',
      meta: {
        portal: 'employee',
        companyName: organization.name
      }
    });

    publishEmployeeSignedIn({
      organizationId: organization._id,
      actorUserId: user._id,
      employee: {
        _id: user._id,
        email: user.email,
        role: user.role,
        organization: organization._id,
        organizationName: organization.name
      }
    });

    await createInAppNotification({
      organizationId: organization._id,
      actorUserId: user._id,
      type: 'employee_signin',
      title: 'Employee signed in',
      message: `${user.username || user.email} signed in to ${organization.name}.`,
      severity: 'info',
      entityType: 'USER',
      entityId: user._id,
      metadata: {
        email: user.email,
        username: user.username || null,
        role: user.role,
        organizationName: organization.name,
        firstLogin: autoCreated
      }
    });

    return successResponse(
      res,
      {
        ...data,
        organization: {
          _id: organization._id,
          name: organization.name,
          code: organization.code
        }
      },
      'Employee login successful'
    );
  } catch (err) {
    next(err);
  }
};

export const requestEmployeeSignup = async (req, res, next) => {
  try {
    const normalizedCompanyName = normalizeOrganizationNameInput(
      req.body?.companyName || req.body?.organizationName
    );
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const normalizedMobileNumber = normalizeMobileNumberInput(
      req.body?.mobileNumber
    );
    const normalizedPassword = String(req.body?.password || '').trim();
    const normalizedConfirmPassword = String(
      req.body?.confirmPassword || ''
    ).trim();
    const normalizedUsername = ensureValidUsername(req.body?.username);

    if (
      !normalizedCompanyName ||
      !normalizedEmail ||
      !normalizedPassword ||
      !normalizedConfirmPassword ||
      !normalizedUsername
    ) {
      throw new AppError(
        'companyName, email, username, password, and confirmPassword are required',
        400
      );
    }

    if (
      req.body?.mobileNumber !== undefined &&
      normalizedMobileNumber &&
      !isValidMobileNumber(normalizedMobileNumber)
    ) {
      throw new AppError('mobileNumber must be a valid phone number', 400);
    }

    if (normalizedPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      throw new AppError('Password and confirmPassword do not match', 400);
    }

    const organization = await resolveOrganizationByName(normalizedCompanyName);
    if (!organization) {
      throw new AppError('Company was not found', 404);
    }

    const [
      existingByEmail,
      existingByUsername,
      pendingByEmail,
      pendingByUsername
    ] = await Promise.all([
      User.findOne({ email: normalizedEmail })
        .select('_id organization')
        .lean(),
      User.findOne({ username: normalizedUsername })
        .select('_id organization')
        .lean(),
      EmployeeSignupRequest.findOne({
        organization: organization._id,
        email: normalizedEmail,
        status: 'PENDING'
      })
        .select('_id')
        .lean(),
      EmployeeSignupRequest.findOne({
        organization: organization._id,
        username: normalizedUsername,
        status: 'PENDING'
      })
        .select('_id')
        .lean()
    ]);

    if (existingByEmail) {
      throw new AppError('Email already exists', 409);
    }

    if (existingByUsername) {
      throw new AppError('Username already exists', 409);
    }

    if (pendingByEmail || pendingByUsername) {
      throw new AppError(
        'A pending signup request already exists for this account',
        409
      );
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);

    const signupRequest = await EmployeeSignupRequest.create({
      organization: organization._id,
      email: normalizedEmail,
      mobileNumber: normalizedMobileNumber || null,
      username: normalizedUsername,
      passwordHash,
      requestedByIp: getRequestIpAddress(req),
      requestedByUserAgent: sanitizeSessionField(
        req.headers?.['user-agent'],
        MAX_SESSION_USER_AGENT_LENGTH
      ),
      status: 'PENDING'
    });

    await createInAppNotification({
      organizationId: organization._id,
      actorUserId: null,
      type: 'employee_signup_request',
      title: 'Employee signup request',
      message: `${normalizedUsername} requested access to ${organization.name}.`,
      severity: 'warning',
      entityType: 'EMPLOYEE_SIGNUP_REQUEST',
      entityId: signupRequest._id,
      metadata: {
        signupRequestId: signupRequest._id,
        email: normalizedEmail,
        mobileNumber: normalizedMobileNumber || null,
        username: normalizedUsername,
        companyName: organization.name,
        status: signupRequest.status
      }
    });

    await notifyAdminsOfEmployeeAuthEvent({
      organizationId: organization._id,
      actorUserId: null,
      eventType: 'employee_signup_request',
      organizationName: organization.name,
      employeeEmail: normalizedEmail,
      employeeUsername: normalizedUsername,
      employeeRole: 'pending',
      employeeMobileNumber: normalizedMobileNumber || null
    });

    await logAudit({
      req,
      action: 'EMPLOYEE_SIGNUP_REQUEST_CREATE',
      resource: 'AUTH',
      resourceId: signupRequest._id,
      organizationId: organization._id,
      meta: {
        email: normalizedEmail,
        mobileNumber: normalizedMobileNumber || null,
        username: normalizedUsername
      }
    });

    return successResponse(
      res,
      {
        requestId: signupRequest._id,
        status: signupRequest.status
      },
      'Signup request submitted. An admin must approve your account.',
      201
    );
  } catch (error) {
    return next(error);
  }
};

export const approveEmployeeSignupRequest = async (req, res, next) => {
  try {
    const organizationId = req.organizationId || req.user?.organization || null;
    const requestId = String(req.params?.id || '').trim();

    const result = await reviewEmployeeSignupRequestInternal({
      organizationId,
      requestId,
      decision: 'approve',
      reviewedByUserId: req.user?._id || null,
      auditRequest: req
    });

    return successResponse(
      res,
      {
        requestId: result.requestId,
        status: result.status,
        userId: result.userId,
        username: result.username
      },
      'Employee signup approved'
    );
  } catch (error) {
    return next(error);
  }
};

export const declineEmployeeSignupRequest = async (req, res, next) => {
  try {
    const organizationId = req.organizationId || req.user?.organization || null;
    const requestId = String(req.params?.id || '').trim();
    const reason = String(req.body?.reason || '').trim();

    const result = await reviewEmployeeSignupRequestInternal({
      organizationId,
      requestId,
      decision: 'decline',
      reviewedByUserId: req.user?._id || null,
      reason,
      auditRequest: req
    });

    return successResponse(
      res,
      {
        requestId: result.requestId,
        status: result.status
      },
      'Employee signup declined'
    );
  } catch (error) {
    return next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    if (!req.user?.email) {
      return successResponse(res, req.user, 'User profile fetched');
    }

    const organization = await resolveOrganizationPayloadById(
      req.user?.organization
    );
    const userPayload = buildAuthUser(req.user, organization);
    return successResponse(
      res,
      {
        ...userPayload,
        organization
      },
      'User profile fetched'
    );
  } catch (err) {
    next(err);
  }
};

export const updateMePreferences = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const requestedTheme = String(req.body?.uiTheme || '').trim();
    const requestedMobileNumber = normalizeMobileNumberInput(
      req.body?.mobileNumber
    );

    if (requestedTheme && !ALLOWED_UI_THEMES.has(requestedTheme)) {
      throw new AppError('Unsupported uiTheme value', 400);
    }

    if (
      req.body?.mobileNumber !== undefined &&
      requestedMobileNumber &&
      !isValidMobileNumber(requestedMobileNumber)
    ) {
      throw new AppError('mobileNumber must be a valid phone number', 400);
    }

    if (requestedTheme) {
      req.user.uiTheme = requestedTheme;
    }
    if (req.body?.mobileNumber !== undefined) {
      req.user.mobileNumber = requestedMobileNumber || null;
    }
    await req.user.save();

    const organization = await resolveOrganizationPayloadById(
      req.user.organization
    );
    const userPayload = buildAuthUser(req.user, organization);

    await logAudit({
      req,
      action: 'UPDATE_USER_PREFERENCES',
      resource: 'AUTH',
      resourceId: req.user._id,
      organizationId: req.user.organization || null,
      meta: {
        ...(requestedTheme ? { uiTheme: requestedTheme } : {}),
        ...(req.body?.mobileNumber !== undefined
          ? {
              mobileNumberUpdated: true
            }
          : {})
      }
    });

    return successResponse(
      res,
      {
        ...userPayload,
        organization
      },
      'User preferences updated'
    );
  } catch (err) {
    next(err);
  }
};

const TWO_FACTOR_PRIVATE_SELECT = [
  '+twoFactor.secret',
  '+twoFactor.pendingSecret',
  '+twoFactor.recoveryCodes',
  '+twoFactor.recoveryCodes.codeHash',
  '+twoFactor.pendingRecoveryCodeHashes'
].join(' ');

const findUserForTwoFactor = async ({ userId, includePassword = false }) => {
  const selection = includePassword
    ? `+password ${TWO_FACTOR_PRIVATE_SELECT}`
    : TWO_FACTOR_PRIVATE_SELECT;
  return User.findById(userId).select(selection);
};

export const getTwoFactorStatus = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await findUserForTwoFactor({ userId: req.user._id });
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    return successResponse(
      res,
      buildTwoFactorStatusPayload(user),
      'Two-factor status fetched'
    );
  } catch (error) {
    return next(error);
  }
};

export const setupTwoFactor = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await findUserForTwoFactor({
      userId: req.user._id,
      includePassword: true
    });
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    await requireCurrentPasswordMatch({
      user,
      password: req.body?.currentPassword
    });

    const base32Secret = generateBase32Secret();
    const recoveryCodes = generateRecoveryCodes(
      TWO_FACTOR_RECOVERY_CODES_COUNT
    );
    const recoveryCodeHashes = recoveryCodes.map((entry) =>
      hashRecoveryCode(entry)
    );

    user.twoFactor = user.twoFactor || {};
    user.twoFactor.pendingSecret = base32Secret;
    user.twoFactor.pendingRecoveryCodeHashes = recoveryCodeHashes;
    await user.save();

    const organization = await resolveOrganizationPayloadById(
      user.organization
    );
    const otpAuthUrl = buildOtpAuthUri({
      issuer: TWO_FACTOR_ISSUER || 'Invendex',
      accountName: user.email,
      base32Secret
    });

    await logAudit({
      req,
      action: 'SETUP_TWO_FACTOR',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: user.organization || null,
      meta: {
        issuer: TWO_FACTOR_ISSUER || 'Invendex',
        organizationId: organization?._id || null
      }
    });

    return successResponse(
      res,
      {
        secret: base32Secret,
        otpAuthUrl,
        recoveryCodes,
        status: buildTwoFactorStatusPayload(user)
      },
      'Two-factor setup initialized'
    );
  } catch (error) {
    return next(error);
  }
};

export const enableTwoFactor = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await findUserForTwoFactor({
      userId: req.user._id,
      includePassword: true
    });
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    await requireCurrentPasswordMatch({
      user,
      password: req.body?.currentPassword
    });

    const pendingSecret = String(user?.twoFactor?.pendingSecret || '').trim();
    if (!pendingSecret) {
      throw new AppError('No pending two-factor setup. Run setup first.', 409);
    }

    const isValidTotp = verifyTotp({
      base32Secret: pendingSecret,
      code: req.body?.code
    });
    if (!isValidTotp) {
      throw new AppError('Invalid two-factor code', 401);
    }

    const pendingRecoveryHashes = Array.isArray(
      user?.twoFactor?.pendingRecoveryCodeHashes
    )
      ? user.twoFactor.pendingRecoveryCodeHashes
      : [];

    user.twoFactor.enabled = true;
    user.twoFactor.secret = pendingSecret;
    user.twoFactor.pendingSecret = null;
    user.twoFactor.recoveryCodes = pendingRecoveryHashes.map((codeHash) => ({
      codeHash,
      usedAt: null,
      createdAt: new Date()
    }));
    user.twoFactor.pendingRecoveryCodeHashes = [];
    user.twoFactor.enabledAt = new Date();
    user.twoFactor.lastVerifiedAt = new Date();
    await user.save();

    await logAudit({
      req,
      action: 'ENABLE_TWO_FACTOR',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: user.organization || null
    });

    return successResponse(
      res,
      buildTwoFactorStatusPayload(user),
      'Two-factor authentication enabled'
    );
  } catch (error) {
    return next(error);
  }
};

export const disableTwoFactor = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await findUserForTwoFactor({
      userId: req.user._id,
      includePassword: true
    });
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    await requireCurrentPasswordMatch({
      user,
      password: req.body?.currentPassword
    });

    assertTwoFactorProof({
      user,
      code: req.body?.code,
      recoveryCode: req.body?.recoveryCode
    });

    user.twoFactor.enabled = false;
    user.twoFactor.secret = null;
    user.twoFactor.pendingSecret = null;
    user.twoFactor.recoveryCodes = [];
    user.twoFactor.pendingRecoveryCodeHashes = [];
    user.twoFactor.enabledAt = null;
    user.twoFactor.lastVerifiedAt = new Date();
    await user.save();

    await logAudit({
      req,
      action: 'DISABLE_TWO_FACTOR',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: user.organization || null
    });

    return successResponse(
      res,
      buildTwoFactorStatusPayload(user),
      'Two-factor authentication disabled'
    );
  } catch (error) {
    return next(error);
  }
};

export const regenerateTwoFactorRecoveryCodes = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await findUserForTwoFactor({
      userId: req.user._id,
      includePassword: true
    });
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    await requireCurrentPasswordMatch({
      user,
      password: req.body?.currentPassword
    });

    assertTwoFactorProof({
      user,
      code: req.body?.code,
      recoveryCode: req.body?.recoveryCode
    });

    const recoveryCodes = generateRecoveryCodes(
      TWO_FACTOR_RECOVERY_CODES_COUNT
    );
    user.twoFactor.recoveryCodes = buildRecoveryCodeRecords(recoveryCodes);
    user.twoFactor.lastVerifiedAt = new Date();
    await user.save();

    await logAudit({
      req,
      action: 'REGENERATE_TWO_FACTOR_RECOVERY_CODES',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: user.organization || null
    });

    return successResponse(
      res,
      {
        recoveryCodes,
        status: buildTwoFactorStatusPayload(user)
      },
      'Two-factor recovery codes regenerated'
    );
  } catch (error) {
    return next(error);
  }
};

export const verifyTwoFactorLogin = async (req, res, next) => {
  try {
    const challengeToken = String(req.body?.twoFactorToken || '').trim();
    if (!challengeToken) {
      throw new AppError('twoFactorToken is required', 400);
    }

    let challengePayload;
    try {
      challengePayload = verifyTwoFactorChallenge(challengeToken);
    } catch {
      throw new AppError('Invalid or expired two-factor token', 401);
    }

    if (challengePayload?.type !== 'two_factor_login') {
      throw new AppError('Invalid two-factor token payload', 401);
    }

    const user = await findUserForTwoFactor({
      userId: challengePayload?.userId,
      includePassword: false
    });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (user.isActive === false) {
      throw new AppError(
        'Account is deactivated. Contact an administrator.',
        403
      );
    }

    if (isEmailVerificationRequired() && !user.isVerified) {
      throw new AppError(
        'Email verification required. Please verify your account first.',
        403
      );
    }

    assertTwoFactorProof({
      user,
      code: req.body?.code,
      recoveryCode: req.body?.recoveryCode
    });

    user.twoFactor.lastVerifiedAt = new Date();

    const portal = String(challengePayload?.portal || 'generic')
      .trim()
      .toLowerCase();
    const authAction =
      portal === 'admin'
        ? 'ADMIN_LOGIN'
        : portal === 'employee'
          ? 'EMPLOYEE_LOGIN'
          : 'LOGIN';

    const data = await finalizeLogin({
      req,
      res,
      user,
      action: authAction,
      meta: {
        portal,
        twoFactorVerified: true
      },
      sessionMetadata:
        challengePayload?.sessionMetadata &&
        typeof challengePayload.sessionMetadata === 'object'
          ? challengePayload.sessionMetadata
          : null
    });

    if (portal === 'employee') {
      const organizationId = user.organization || null;
      const organizationName =
        String(challengePayload?.context?.organizationName || '').trim() ||
        data?.organization?.name ||
        null;

      if (organizationId) {
        publishEmployeeSignedIn({
          organizationId,
          actorUserId: user._id,
          employee: {
            _id: user._id,
            email: user.email,
            role: user.role,
            organization: organizationId,
            organizationName
          }
        });

        await createInAppNotification({
          organizationId,
          actorUserId: user._id,
          type: 'employee_signin',
          title: 'Employee signed in',
          message: `${user.username || user.email} signed in to ${organizationName || 'organization'}.`,
          severity: 'info',
          entityType: 'USER',
          entityId: user._id,
          metadata: {
            email: user.email,
            role: user.role,
            organizationName,
            firstLogin: false
          }
        });
      }
    }

    const loginMessage =
      portal === 'admin'
        ? 'Admin login successful'
        : portal === 'employee'
          ? 'Employee login successful'
          : 'Login successful';

    return successResponse(res, data, loginMessage);
  } catch (error) {
    return next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const oldToken = req.cookies.refreshToken;
    if (!oldToken) {
      clearRefreshCookie(res);
      throw new AppError('Refresh token required', 401);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(oldToken);
    } catch {
      clearRefreshCookie(res);
      throw new AppError('Invalid refresh token', 403);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      clearRefreshCookie(res);
      throw new AppError('Invalid refresh token', 403);
    }

    if (ensureRefreshTokenSessionShape(user)) {
      await user.save();
    }

    const matchedTokenEntry = user.refreshTokens.find(
      (rt) => rt.token === oldToken
    );
    const tokenExists = Boolean(matchedTokenEntry);

    if (!tokenExists) {
      user.refreshTokens = [];
      await user.save();

      await logAudit({
        req,
        action: 'TOKEN_REUSE_DETECTED',
        resource: 'AUTH',
        resourceId: user._id,
        organizationId: user.organization || null
      });

      clearRefreshCookie(res);
      throw new AppError('Session compromised. Please login again.', 403);
    }

    user.refreshTokens = user.refreshTokens.filter(
      (rt) => rt.token !== oldToken
    );

    const { refreshToken: newRefreshToken } = appendRefreshToken(
      user,
      buildSessionMetadata(req, {
        sessionId: matchedTokenEntry?.sessionId || null,
        deviceId: matchedTokenEntry?.deviceId || null
      })
    );
    await user.save();

    setRefreshCookie(res, newRefreshToken);

    const newAccessToken = generateAccessToken(user);

    return successResponse(
      res,
      { accessToken: newAccessToken },
      'Token refreshed'
    );
  } catch (err) {
    next(err);
  }
};

export const getMySessions = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await User.findById(req.user._id).select(
      '_id organization refreshTokens'
    );
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    const shapeChanged = ensureRefreshTokenSessionShape(user);
    if (shapeChanged) {
      await user.save();
    }

    const currentToken = String(req.cookies?.refreshToken || '').trim();
    const sessions = mapRefreshTokenSessions({
      user,
      currentToken
    });

    return successResponse(
      res,
      {
        sessions,
        total: sessions.length
      },
      'Sessions fetched'
    );
  } catch (err) {
    next(err);
  }
};

export const revokeSession = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const sessionId = String(req.params?.sessionId || '').trim();
    if (!sessionId) {
      throw new AppError('sessionId is required', 400);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    const shapeChanged = ensureRefreshTokenSessionShape(user);
    const currentToken = String(req.cookies?.refreshToken || '').trim();
    const sessionToRevoke = user.refreshTokens.find(
      (entry) => String(entry.sessionId || '').trim() === sessionId
    );

    if (!sessionToRevoke) {
      throw new AppError('Session not found', 404);
    }

    const isCurrentSession =
      Boolean(currentToken) && String(sessionToRevoke.token) === currentToken;
    const revokedAt = new Date().toISOString();

    user.refreshTokens = user.refreshTokens.filter(
      (entry) => String(entry.sessionId || '').trim() !== sessionId
    );

    if (shapeChanged || user.isModified('refreshTokens')) {
      await user.save();
    }

    if (isCurrentSession) {
      clearRefreshCookie(res);
    }

    await logAudit({
      req,
      action: 'REVOKE_SESSION',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: user.organization || null,
      meta: {
        sessionId,
        currentSessionRevoked: isCurrentSession
      }
    });

    const organization = await resolveOrganizationPayloadById(
      user.organization
    );
    await queueSecurityAlertEmail({
      organizationId: user.organization || null,
      userId: user._id,
      to: user.email,
      subject: 'Invendex session revoked',
      headline: isCurrentSession
        ? 'Your current session was revoked'
        : 'A session was removed from your account',
      intro: isCurrentSession
        ? 'Your active Invendex session was revoked. Sign in again if you still need access.'
        : 'A signed-in Invendex session was removed from your account.',
      detailRows: [
        {
          label: 'Workspace',
          value: organization?.name || 'your organization'
        },
        {
          label: 'Session ID',
          value: sessionId
        },
        {
          label: 'Device',
          value: sessionToRevoke?.deviceId || 'Unknown device'
        },
        {
          label: 'Revoked at',
          value: revokedAt
        }
      ],
      supportMessage:
        'If you did not expect this change, reset your password and review your account security settings.',
      notificationType: 'AUTH_SESSION_REVOKED',
      metadata: {
        sessionId,
        currentSessionRevoked: isCurrentSession,
        revokedAt
      }
    });

    return successResponse(
      res,
      {
        sessionId,
        currentSessionTerminated: isCurrentSession
      },
      isCurrentSession
        ? 'Current session revoked. Sign in again.'
        : 'Session revoked'
    );
  } catch (err) {
    next(err);
  }
};

export const logoutOtherSessions = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    const shapeChanged = ensureRefreshTokenSessionShape(user);
    const currentToken = String(req.cookies?.refreshToken || '').trim();
    if (!currentToken) {
      throw new AppError(
        'Current session not identified. Sign in again and retry.',
        400
      );
    }

    const previousCount = user.refreshTokens.length;
    user.refreshTokens = user.refreshTokens.filter(
      (entry) => String(entry.token || '') === currentToken
    );
    const removedCount = Math.max(0, previousCount - user.refreshTokens.length);
    const clearedAt = new Date().toISOString();

    if (shapeChanged || removedCount > 0) {
      await user.save();
    }

    await logAudit({
      req,
      action: 'LOGOUT_OTHER_SESSIONS',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: user.organization || null,
      meta: {
        removedCount
      }
    });

    if (removedCount > 0) {
      const organization = await resolveOrganizationPayloadById(
        user.organization
      );
      await queueSecurityAlertEmail({
        organizationId: user.organization || null,
        userId: user._id,
        to: user.email,
        subject: 'Invendex other sessions signed out',
        headline: 'Other sessions were signed out',
        intro:
          'All other Invendex sessions for your account were removed. Your current session remains active.',
        detailRows: [
          {
            label: 'Workspace',
            value: organization?.name || 'your organization'
          },
          {
            label: 'Sessions removed',
            value: String(removedCount)
          },
          {
            label: 'Completed at',
            value: clearedAt
          }
        ],
        supportMessage:
          'If you did not trigger this action, change your password immediately.',
        notificationType: 'AUTH_SESSIONS_CLEARED',
        metadata: {
          removedCount,
          clearedAt
        }
      });
    }

    return successResponse(
      res,
      {
        removedCount
      },
      'Other sessions logged out'
    );
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const cookieToken = req.cookies.refreshToken;
    let user = req.user || null;

    if (!user) {
      const accessToken = extractBearerAccessToken(req);
      if (accessToken) {
        try {
          const decoded = verifyAccessToken(accessToken);
          user = await User.findById(decoded.id);
        } catch {
          user = null;
        }
      }
    }

    if (!user && cookieToken) {
      try {
        const decoded = verifyRefreshToken(cookieToken);
        user = await User.findById(decoded.id);
      } catch {
        user = null;
      }
    }

    if (user && cookieToken) {
      user.refreshTokens = user.refreshTokens.filter(
        (rt) => rt.token !== cookieToken
      );
      await user.save();
    }

    clearRefreshCookie(res);

    if (
      user &&
      !ADMIN_ROLES.has(
        String(user.role || '')
          .trim()
          .toLowerCase()
      ) &&
      user.organization
    ) {
      try {
        const organization = await resolveOrganizationPayloadById(
          user.organization
        );

        await createInAppNotification({
          organizationId: user.organization,
          actorUserId: user._id,
          type: 'employee_signout',
          title: 'Employee signed out',
          message: `${user.username || user.email} signed out of ${organization?.name || 'organization'}.`,
          severity: 'info',
          entityType: 'USER',
          entityId: user._id,
          metadata: {
            email: user.email,
            username: user.username || null,
            role: user.role,
            organizationName: organization?.name || null
          }
        });
      } catch (notificationError) {
        logger.warn('employee_signout_alert_failed', {
          userId: String(user._id || ''),
          organizationId: String(user.organization || ''),
          err: notificationError
        });
      }
    }

    await logAudit({
      req,
      action: 'LOGOUT',
      resource: 'AUTH',
      resourceId: user?._id || req.user?._id,
      organizationId: user?.organization || req.user?.organization || null
    });

    return successResponse(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

export const register = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const normalizedMobileNumber = normalizeMobileNumberInput(
      req.body?.mobileNumber
    );
    const requestedUsername = req.body?.username;
    const normalizedPassword = String(req.body?.password || '').trim();
    const normalizedConfirmPassword = String(
      req.body?.confirmPassword || ''
    ).trim();
    const normalizedOrganizationName = String(
      req.body?.organizationName || req.body?.companyName || ''
    ).trim();

    if (!normalizedEmail || !normalizedPassword || !normalizedConfirmPassword) {
      throw new AppError(
        'Email, password, and confirmPassword are required',
        400
      );
    }

    if (normalizedPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      throw new AppError('Password and confirmPassword do not match', 400);
    }

    if (!normalizedOrganizationName) {
      throw new AppError('organizationName is required', 400);
    }

    if (
      req.body?.mobileNumber !== undefined &&
      normalizedMobileNumber &&
      !isValidMobileNumber(normalizedMobileNumber)
    ) {
      throw new AppError('mobileNumber must be a valid phone number', 400);
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError('Email already exists', 409);
    }

    const normalizedUsername = await resolveUniqueUsername(
      requestedUsername,
      normalizedEmail
    );

    let organization = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        organization = await Organization.create({
          name: normalizedOrganizationName,
          code: buildOrganizationCode(normalizedOrganizationName, attempt)
        });
        break;
      } catch (error) {
        if (error?.code === 11000) {
          continue;
        }
        throw error;
      }
    }

    if (!organization) {
      throw new AppError(
        'Unable to create organization. Please try again.',
        500
      );
    }

    const verificationRequired = isEmailVerificationRequired();

    const user = await User.create({
      email: normalizedEmail,
      mobileNumber: normalizedMobileNumber || null,
      username: normalizedUsername,
      password: normalizedPassword,
      role: 'admin',
      organization: organization._id,
      isVerified: !verificationRequired,
      isActive: true
    });

    let verificationToken = null;
    if (verificationRequired) {
      verificationToken = generateRawToken();
      user.emailVerificationToken = hashToken(verificationToken);
      user.emailVerificationExpiresAt = new Date(
        Date.now() + EMAIL_VERIFICATION_TTL_MS
      );
    }

    let accessToken = null;
    if (!verificationRequired) {
      accessToken = generateAccessToken(user);
      const { refreshToken } = appendRefreshToken(
        user,
        buildSessionMetadata(req)
      );
      setRefreshCookie(res, refreshToken);
    }

    await user.save();

    if (verificationRequired && verificationToken) {
      const verificationMessage = [
        `Hi ${normalizedEmail},`,
        '',
        `Welcome to ${organization.name}.`,
        `Use this verification token to activate your Invendex account: ${verificationToken}`,
        'This token expires in 24 hours.',
        buildEmailActionHint(
          'If you did not create this account, ignore this message.'
        )
      ].join('\n');

      await queueAuthEmail({
        organizationId: organization._id,
        userId: user._id,
        to: normalizedEmail,
        subject: 'Verify your Invendex account',
        message: verificationMessage,
        html: buildAuthTokenEmailHtml({
          title: 'Verify your Invendex account',
          eyebrow: 'Invendex verification',
          headline: 'Verify your account',
          intro: `Hi ${normalizedEmail}, use this verification token to activate your Invendex account.`,
          recipientLabel: normalizedEmail,
          organizationName: organization.name,
          tokenLabel: 'Verification token',
          tokenValue: verificationToken,
          expiresText: '24 hours',
          supportMessage:
            'If you did not create this account, ignore this message.'
        }),
        notificationType: 'AUTH_EMAIL_VERIFICATION',
        metadata: {
          organizationName: organization.name,
          organizationCode: organization.code,
          expiresInHours: 24
        }
      });
    }

    await logAudit({
      req,
      action: 'REGISTER',
      resource: 'AUTH',
      resourceId: user._id,
      organizationId: organization._id,
      meta: {
        organizationName: organization.name,
        organizationCode: organization.code,
        username: normalizedUsername,
        mobileNumberProvided: Boolean(normalizedMobileNumber),
        verificationRequired
      }
    });

    const responseData = {
      accessToken,
      verificationRequired,
      user: buildAuthUser(
        user,
        buildOrganizationPayload({
          _id: organization._id,
          name: organization.name,
          code: organization.code
        })
      ),
      organization: {
        _id: organization._id,
        name: organization.name,
        code: organization.code
      }
    };

    if (verificationRequired && verificationToken) {
      Object.assign(responseData, buildTokenDebugData(verificationToken));
    }

    return successResponse(
      res,
      responseData,
      verificationRequired
        ? 'Account created. Verify email before signing in.'
        : 'Account created successfully',
      201
    );
  } catch (err) {
    next(err);
  }
};

export const requestEmailVerification = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);

    if (!normalizedEmail) {
      throw new AppError('Email is required', 400);
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailVerificationToken +emailVerificationExpiresAt'
    );

    if (!user) {
      return successResponse(
        res,
        null,
        'If the account exists, a verification code has been generated.'
      );
    }

    if (user.isVerified) {
      return successResponse(res, null, 'Email is already verified.');
    }

    const verificationToken = generateRawToken();
    user.emailVerificationToken = hashToken(verificationToken);
    user.emailVerificationExpiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_TTL_MS
    );
    await user.save();

    const organization = await resolveOrganizationPayloadById(
      user.organization
    );
    const verificationMessage = [
      `Hi ${normalizedEmail},`,
      '',
      `Use this verification token to verify your Invendex account: ${verificationToken}`,
      'This token expires in 24 hours.',
      buildEmailActionHint('If you did not request this, ignore this message.')
    ].join('\n');

    await queueAuthEmail({
      organizationId: user.organization || null,
      userId: user._id,
      to: normalizedEmail,
      subject: 'Invendex email verification token',
      message: verificationMessage,
      html: buildAuthTokenEmailHtml({
        title: 'Invendex email verification token',
        eyebrow: 'Invendex verification',
        headline: 'Verify your account',
        intro: `Hi ${normalizedEmail}, use this verification token to verify your Invendex account.`,
        recipientLabel: normalizedEmail,
        organizationName: organization?.name || 'your organization',
        tokenLabel: 'Verification token',
        tokenValue: verificationToken,
        expiresText: '24 hours',
        supportMessage: 'If you did not request this, ignore this message.'
      }),
      notificationType: 'AUTH_EMAIL_VERIFICATION',
      metadata: {
        organizationName: organization?.name || null,
        expiresInHours: 24
      }
    });

    return successResponse(
      res,
      {
        email: normalizedEmail,
        ...buildTokenDebugData(verificationToken)
      },
      'Verification code generated.'
    );
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const token = String(req.body?.token || '').trim();

    if (!normalizedEmail || !token) {
      throw new AppError('Email and token are required', 400);
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailVerificationToken +emailVerificationExpiresAt'
    );

    if (!user) {
      throw new AppError('Invalid verification request', 400);
    }

    if (user.isVerified) {
      return successResponse(res, null, 'Email already verified');
    }

    if (!user.emailVerificationToken || !user.emailVerificationExpiresAt) {
      throw new AppError('No active email verification token', 400);
    }

    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new AppError('Verification token expired', 400);
    }

    if (hashToken(token) !== user.emailVerificationToken) {
      throw new AppError('Invalid verification token', 400);
    }

    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    return successResponse(res, null, 'Email verified successfully');
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);

    if (!normalizedEmail) {
      throw new AppError('Email is required', 400);
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordResetToken +passwordResetExpiresAt'
    );

    if (!user) {
      return successResponse(
        res,
        null,
        'If the account exists, a reset token has been generated.'
      );
    }

    const resetToken = generateRawToken();
    user.passwordResetToken = hashToken(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await user.save();

    const organization = await resolveOrganizationPayloadById(
      user.organization
    );
    const resetMessage = [
      `Hi ${normalizedEmail},`,
      '',
      `Use this password reset token for your Invendex account: ${resetToken}`,
      'This token expires in 1 hour.',
      buildEmailActionHint('If you did not request this, ignore this message.')
    ].join('\n');

    await queueAuthEmail({
      organizationId: user.organization || null,
      userId: user._id,
      to: normalizedEmail,
      subject: 'Invendex password reset token',
      message: resetMessage,
      html: buildAuthTokenEmailHtml({
        title: 'Invendex password reset token',
        eyebrow: 'Invendex security',
        headline: 'Reset your password',
        intro: `Hi ${normalizedEmail}, use this token to reset your Invendex password.`,
        recipientLabel: normalizedEmail,
        organizationName: organization?.name || 'your organization',
        tokenLabel: 'Password reset token',
        tokenValue: resetToken,
        expiresText: '1 hour',
        supportMessage:
          'If you did not request this password reset, ignore this message.'
      }),
      notificationType: 'AUTH_PASSWORD_RESET',
      metadata: {
        organizationName: organization?.name || null,
        expiresInMinutes: 60
      }
    });

    return successResponse(
      res,
      {
        email: normalizedEmail,
        ...buildTokenDebugData(resetToken)
      },
      'Password reset token generated.'
    );
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailInput(req.body?.email);
    const token = String(req.body?.token || '').trim();
    const normalizedPassword = String(req.body?.password || '').trim();
    const normalizedConfirmPassword = String(
      req.body?.confirmPassword || ''
    ).trim();

    if (
      !normalizedEmail ||
      !token ||
      !normalizedPassword ||
      !normalizedConfirmPassword
    ) {
      throw new AppError(
        'Email, token, password, and confirmPassword are required',
        400
      );
    }

    if (normalizedPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      throw new AppError('Password and confirmPassword do not match', 400);
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordResetToken +passwordResetExpiresAt'
    );

    if (!user) {
      throw new AppError('Invalid password reset request', 400);
    }

    if (!user.passwordResetToken || !user.passwordResetExpiresAt) {
      throw new AppError('No active password reset token', 400);
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new AppError('Password reset token expired', 400);
    }

    if (hashToken(token) !== user.passwordResetToken) {
      throw new AppError('Invalid password reset token', 400);
    }

    user.password = normalizedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    user.refreshTokens = [];
    await user.save();

    const organization = await resolveOrganizationPayloadById(
      user.organization
    );
    const changedAt = new Date().toISOString();
    await queueSecurityAlertEmail({
      organizationId: user.organization || null,
      userId: user._id,
      to: normalizedEmail,
      subject: 'Invendex password changed',
      headline: 'Your password was changed',
      intro:
        'Your Invendex password was updated successfully and all previous sessions were signed out.',
      detailRows: [
        {
          label: 'Email',
          value: normalizedEmail
        },
        {
          label: 'Workspace',
          value: organization?.name || 'your organization'
        },
        {
          label: 'Changed at',
          value: changedAt
        }
      ],
      supportMessage:
        'If you did not make this change, reset your password again immediately and contact a workspace administrator.',
      notificationType: 'AUTH_PASSWORD_CHANGED',
      metadata: {
        organizationName: organization?.name || null,
        changedAt
      }
    });

    return successResponse(res, null, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};
