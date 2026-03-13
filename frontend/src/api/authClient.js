import API_ENDPOINTS from './endpoints.js';
import { readData, request, setCsrfToken } from './requestCore.js';

export { ApiError } from './requestCore.js';

export const authLoginRequest = ({ email, password }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_LOGIN,
    body: { email, password }
  });

export const authAdminLoginRequest = ({
  username = '',
  email = '',
  password
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_ADMIN_LOGIN,
    body: { username, email, password }
  });

export const authEmployeeLoginRequest = ({
  companyName,
  username = '',
  email = '',
  password
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_EMPLOYEE_LOGIN,
    body: { companyName, username, email, password }
  });

export const authEmployeeSignupRequest = ({
  companyName,
  username,
  email,
  mobileNumber,
  password,
  confirmPassword
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_EMPLOYEE_SIGNUP,
    body: {
      companyName,
      username,
      email,
      mobileNumber,
      password,
      confirmPassword
    }
  });

export const authApproveEmployeeSignupRequest = ({
  accessToken,
  requestId,
  reason = ''
}) =>
  request({
    method: 'POST',
    path: `${API_ENDPOINTS.AUTH_EMPLOYEE_SIGNUP_APPROVE_BASE}/${requestId}/approve`,
    accessToken,
    body: reason ? { reason } : {}
  }).then(readData);

export const authDeclineEmployeeSignupRequest = ({
  accessToken,
  requestId,
  reason = ''
}) =>
  request({
    method: 'POST',
    path: `${API_ENDPOINTS.AUTH_EMPLOYEE_SIGNUP_APPROVE_BASE}/${requestId}/decline`,
    accessToken,
    body: reason ? { reason } : {}
  }).then(readData);

export const authRegisterRequest = ({
  username,
  email,
  mobileNumber,
  password,
  confirmPassword,
  organizationName
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_REGISTER,
    body: {
      username,
      email,
      mobileNumber,
      password,
      confirmPassword,
      organizationName
    }
  });

export const authVerifyEmailRequest = ({ email }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_VERIFY_EMAIL_REQUEST,
    body: { email }
  });

export const authVerifyEmailConfirmRequest = ({ email, token }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_VERIFY_EMAIL,
    body: { email, token }
  });

export const authForgotPasswordRequest = ({ email }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_FORGOT_PASSWORD,
    body: { email }
  });

export const authResetPasswordRequest = ({
  email,
  token,
  password,
  confirmPassword
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_RESET_PASSWORD,
    body: { email, token, password, confirmPassword }
  });

export const authTwoFactorVerifyLoginRequest = ({
  twoFactorToken,
  code = '',
  recoveryCode = ''
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_2FA_VERIFY_LOGIN,
    body: {
      twoFactorToken,
      ...(String(code || '').trim() ? { code } : {}),
      ...(String(recoveryCode || '').trim() ? { recoveryCode } : {})
    }
  });

export const authCsrfTokenRequest = async () => {
  const payload = await request({
    method: 'GET',
    path: API_ENDPOINTS.AUTH_CSRF_TOKEN
  });

  setCsrfToken(payload?.data?.csrfToken);
  return payload;
};

export const authRefreshRequest = () =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_REFRESH
  });

export const authMeRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.AUTH_ME,
    accessToken
  });

export const authTwoFactorStatusRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.AUTH_2FA_STATUS,
    accessToken
  });

export const authTwoFactorSetupRequest = ({ accessToken, currentPassword }) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_2FA_SETUP,
    accessToken,
    body: {
      currentPassword
    }
  });

export const authTwoFactorEnableRequest = ({
  accessToken,
  currentPassword,
  code
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_2FA_ENABLE,
    accessToken,
    body: {
      currentPassword,
      code
    }
  });

export const authTwoFactorDisableRequest = ({
  accessToken,
  currentPassword,
  code = '',
  recoveryCode = ''
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_2FA_DISABLE,
    accessToken,
    body: {
      currentPassword,
      ...(String(code || '').trim() ? { code } : {}),
      ...(String(recoveryCode || '').trim() ? { recoveryCode } : {})
    }
  });

export const authTwoFactorRegenerateRecoveryCodesRequest = ({
  accessToken,
  currentPassword,
  code = '',
  recoveryCode = ''
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_2FA_RECOVERY_REGENERATE,
    accessToken,
    body: {
      currentPassword,
      ...(String(code || '').trim() ? { code } : {}),
      ...(String(recoveryCode || '').trim() ? { recoveryCode } : {})
    }
  });

export const authListSessionsRequest = (accessToken) =>
  request({
    method: 'GET',
    path: API_ENDPOINTS.AUTH_SESSIONS,
    accessToken
  });

export const authRevokeSessionRequest = ({ accessToken, sessionId }) =>
  request({
    method: 'DELETE',
    path: `${API_ENDPOINTS.AUTH_SESSIONS}/${sessionId}`,
    accessToken
  });

export const authLogoutOtherSessionsRequest = (accessToken) =>
  request({
    method: 'DELETE',
    path: API_ENDPOINTS.AUTH_SESSIONS_OTHERS,
    accessToken
  });

export const authUpdatePreferencesRequest = ({
  accessToken,
  uiTheme,
  mobileNumber
}) =>
  request({
    method: 'PATCH',
    path: API_ENDPOINTS.AUTH_ME_PREFERENCES,
    accessToken,
    body: {
      ...(uiTheme !== undefined ? { uiTheme } : {}),
      ...(mobileNumber !== undefined ? { mobileNumber } : {})
    }
  });

export const authLogoutRequest = (accessToken) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.AUTH_LOGOUT,
    accessToken
  });

export const complianceExportRequest = ({
  accessToken,
  includeAudit = false,
  limit = 2000
}) => {
  const query = new URLSearchParams();
  query.set('includeAudit', String(Boolean(includeAudit)));
  query.set('limit', String(limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request({
    method: 'GET',
    path: `${API_ENDPOINTS.COMPLIANCE_EXPORT}${suffix}`,
    accessToken
  }).then(readData);
};

export const complianceDeleteMyAccountRequest = ({
  accessToken,
  currentPassword,
  confirmationText = 'DELETE MY ACCOUNT'
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.COMPLIANCE_DELETE_ACCOUNT,
    accessToken,
    body: {
      currentPassword,
      confirmationText
    }
  }).then(readData);

export const complianceDeleteOrganizationRequest = ({
  accessToken,
  currentPassword,
  confirmationText
}) =>
  request({
    method: 'POST',
    path: API_ENDPOINTS.COMPLIANCE_DELETE_ORGANIZATION,
    accessToken,
    body: {
      currentPassword,
      confirmationText
    }
  }).then(readData);
