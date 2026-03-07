import jwt from 'jsonwebtoken';
import { getAccessTokenSigningSecret } from './token.js';

const EMAIL_ACTION_SCOPE = 'employee_signup_email_action';
const EMAIL_ACTION_TTL_SECONDS = (() => {
  const raw = Number(
    process.env.AUTH_SIGNUP_EMAIL_ACTION_TTL_SECONDS || 60 * 60 * 24 * 7
  );
  if (!Number.isFinite(raw) || raw < 300 || raw > 60 * 60 * 24 * 30) {
    return 60 * 60 * 24 * 7;
  }
  return Math.floor(raw);
})();

const getEmailActionSecret = () => {
  const explicit = String(
    process.env.AUTH_SIGNUP_EMAIL_ACTION_SECRET || ''
  ).trim();
  if (explicit) return explicit;
  return getAccessTokenSigningSecret();
};

export const signEmployeeSignupEmailActionToken = ({
  organizationId,
  signupRequestId,
  reviewerUserId,
  action
}) =>
  jwt.sign(
    {
      scope: EMAIL_ACTION_SCOPE,
      organizationId,
      signupRequestId,
      reviewerUserId,
      action
    },
    getEmailActionSecret(),
    {
      expiresIn: EMAIL_ACTION_TTL_SECONDS
    }
  );

export const verifyEmployeeSignupEmailActionToken = (token) => {
  const payload = jwt.verify(String(token || ''), getEmailActionSecret());
  if (payload?.scope !== EMAIL_ACTION_SCOPE) {
    throw new Error('Invalid email action token scope');
  }

  const action = String(payload?.action || '')
    .trim()
    .toLowerCase();
  if (!['approve', 'decline'].includes(action)) {
    throw new Error('Invalid email action');
  }

  return {
    organizationId: String(payload.organizationId || '').trim(),
    signupRequestId: String(payload.signupRequestId || '').trim(),
    reviewerUserId: String(payload.reviewerUserId || '').trim(),
    action
  };
};

export const buildEmployeeSignupEmailActionUrl = ({ baseUrl, token }) => {
  const normalizedBaseUrl = String(baseUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (!normalizedBaseUrl) return '';

  return `${normalizedBaseUrl}/auth/employee/signup-requests/review-email?token=${encodeURIComponent(
    String(token || '')
  )}`;
};

export default {
  signEmployeeSignupEmailActionToken,
  verifyEmployeeSignupEmailActionToken,
  buildEmployeeSignupEmailActionUrl
};
