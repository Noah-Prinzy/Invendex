import { ApiError } from '../../api/authClient.js';

const ACCESS_TOKEN_KEY = 'invendex_access_token';

export const persistAccessToken = (token) => {
  if (!token) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const readStoredAccessToken = () =>
  String(window.localStorage.getItem(ACCESS_TOKEN_KEY) || '').trim();

export const normalizeAuthUser = (user, organization = null) => {
  if (!user) return null;

  const normalizedOrganizationId =
    (typeof user.organization === 'object' && user.organization?._id) ||
    (typeof organization === 'object' && organization?._id) ||
    user.organization ||
    null;

  const normalizedOrganizationName =
    String(
      user.organizationName ||
        (typeof user.organization === 'object'
          ? user.organization?.name
          : '') ||
        (typeof organization === 'object' ? organization?.name : '')
    ).trim() || null;

  return {
    _id: user._id,
    email: user.email,
    mobileNumber: user.mobileNumber || null,
    username: user.username || null,
    role: user.role,
    uiTheme: String(user.uiTheme || '').trim() || null,
    organization: normalizedOrganizationId,
    organizationName: normalizedOrganizationName,
    name:
      user.name ||
      user.username ||
      (user.email ? user.email.split('@')[0] : 'Operator')
  };
};

export const getAuthErrorMessage = (error) => {
  if (error instanceof ApiError) {
    if (error.statusCode === 429) {
      return 'Too many login attempts. Please wait 15 minutes and try again.';
    }
    return error.message;
  }

  return 'Unable to complete authentication request.';
};
