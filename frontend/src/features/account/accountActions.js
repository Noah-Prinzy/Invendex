import {
  ApiError,
  authCsrfTokenRequest,
  authListSessionsRequest,
  authRevokeSessionRequest,
  authLogoutOtherSessionsRequest,
  authTwoFactorStatusRequest,
  authTwoFactorSetupRequest,
  authTwoFactorEnableRequest,
  authTwoFactorDisableRequest,
  authTwoFactorRegenerateRecoveryCodesRequest,
  complianceExportRequest,
  complianceDeleteMyAccountRequest,
  complianceDeleteOrganizationRequest
} from '../../api/authClient.js';

const getMessage = (error) => {
  if (error instanceof ApiError) {
    if (error.statusCode === 429) {
      return 'Too many login attempts. Please wait 15 minutes and try again.';
    }
    return error.message;
  }
  return 'Unable to complete authentication request.';
};

const isAuthenticated = (accessToken) =>
  Boolean(String(accessToken || '').trim());

export const loadAccountSessions = async ({ accessToken }) => {
  if (!isAuthenticated(accessToken)) {
    return {
      success: false,
      sessions: [],
      message: 'Not authenticated'
    };
  }

  try {
    const response = await authListSessionsRequest(accessToken);
    const sessions = Array.isArray(response?.data?.sessions)
      ? response.data.sessions
      : [];
    return {
      success: true,
      sessions,
      total: Number(response?.data?.total || sessions.length)
    };
  } catch (sessionError) {
    return {
      success: false,
      sessions: [],
      message: getMessage(sessionError)
    };
  }
};

export const revokeAccountSession = async ({ accessToken, sessionId }) => {
  if (!isAuthenticated(accessToken)) {
    return {
      success: false,
      message: 'Not authenticated'
    };
  }

  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedSessionId) {
    return {
      success: false,
      message: 'sessionId is required'
    };
  }

  try {
    await authCsrfTokenRequest();
    const response = await authRevokeSessionRequest({
      accessToken,
      sessionId: normalizedSessionId
    });

    return {
      success: true,
      currentSessionTerminated: Boolean(
        response?.data?.currentSessionTerminated
      ),
      message: String(response?.message || 'Session revoked')
    };
  } catch (sessionError) {
    return {
      success: false,
      message: getMessage(sessionError)
    };
  }
};

export const logoutOtherAccountSessions = async ({ accessToken }) => {
  if (!isAuthenticated(accessToken)) {
    return {
      success: false,
      message: 'Not authenticated'
    };
  }

  try {
    await authCsrfTokenRequest();
    const response = await authLogoutOtherSessionsRequest(accessToken);
    return {
      success: true,
      removedCount: Number(response?.data?.removedCount || 0),
      message: String(response?.message || 'Other sessions logged out')
    };
  } catch (sessionError) {
    return {
      success: false,
      message: getMessage(sessionError)
    };
  }
};

export const loadTwoFactorStatus = async ({ accessToken }) => {
  if (!isAuthenticated(accessToken)) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    const response = await authTwoFactorStatusRequest(accessToken);
    return {
      success: true,
      data: response?.data || {}
    };
  } catch (twoFactorError) {
    return {
      success: false,
      message: getMessage(twoFactorError)
    };
  }
};

export const setupTwoFactor = async ({ accessToken, currentPassword }) => {
  if (!isAuthenticated(accessToken)) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    await authCsrfTokenRequest();
    const response = await authTwoFactorSetupRequest({
      accessToken,
      currentPassword: String(currentPassword || '').trim()
    });
    return {
      success: true,
      data: response?.data || {}
    };
  } catch (twoFactorError) {
    return {
      success: false,
      message: getMessage(twoFactorError)
    };
  }
};

export const enableTwoFactor = async ({
  accessToken,
  currentPassword,
  code
}) => {
  if (!isAuthenticated(accessToken)) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    await authCsrfTokenRequest();
    const response = await authTwoFactorEnableRequest({
      accessToken,
      currentPassword: String(currentPassword || '').trim(),
      code: String(code || '').trim()
    });
    return {
      success: true,
      data: response?.data || {}
    };
  } catch (twoFactorError) {
    return {
      success: false,
      message: getMessage(twoFactorError)
    };
  }
};

export const disableTwoFactor = async ({
  accessToken,
  currentPassword,
  code = '',
  recoveryCode = ''
}) => {
  if (!isAuthenticated(accessToken)) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    await authCsrfTokenRequest();
    const response = await authTwoFactorDisableRequest({
      accessToken,
      currentPassword: String(currentPassword || '').trim(),
      code: String(code || '').trim(),
      recoveryCode: String(recoveryCode || '').trim()
    });
    return {
      success: true,
      data: response?.data || {}
    };
  } catch (twoFactorError) {
    return {
      success: false,
      message: getMessage(twoFactorError)
    };
  }
};

export const regenerateTwoFactorRecoveryCodes = async ({
  accessToken,
  currentPassword,
  code = '',
  recoveryCode = ''
}) => {
  if (!isAuthenticated(accessToken)) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    await authCsrfTokenRequest();
    const response = await authTwoFactorRegenerateRecoveryCodesRequest({
      accessToken,
      currentPassword: String(currentPassword || '').trim(),
      code: String(code || '').trim(),
      recoveryCode: String(recoveryCode || '').trim()
    });
    return {
      success: true,
      data: response?.data || {}
    };
  } catch (twoFactorError) {
    return {
      success: false,
      message: getMessage(twoFactorError)
    };
  }
};

export const exportAccountComplianceData = async ({
  accessToken,
  includeAudit = false,
  limit = 2000
} = {}) => {
  if (!isAuthenticated(accessToken)) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    const response = await complianceExportRequest({
      accessToken,
      includeAudit,
      limit
    });
    return { success: true, data: response };
  } catch (complianceError) {
    return {
      success: false,
      message: getMessage(complianceError)
    };
  }
};

export const deleteMyAccount = async ({
  accessToken,
  currentPassword,
  confirmationText = 'DELETE MY ACCOUNT'
}) => {
  if (!isAuthenticated(accessToken)) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    await authCsrfTokenRequest();
    await complianceDeleteMyAccountRequest({
      accessToken,
      currentPassword: String(currentPassword || '').trim(),
      confirmationText
    });
    return { success: true, shouldClearSession: true };
  } catch (complianceError) {
    return {
      success: false,
      message: getMessage(complianceError)
    };
  }
};

export const deleteOrganization = async ({
  accessToken,
  currentPassword,
  confirmationText
}) => {
  if (!isAuthenticated(accessToken)) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    await authCsrfTokenRequest();
    await complianceDeleteOrganizationRequest({
      accessToken,
      currentPassword: String(currentPassword || '').trim(),
      confirmationText: String(confirmationText || '').trim()
    });
    return { success: true, shouldClearSession: true };
  } catch (complianceError) {
    return {
      success: false,
      message: getMessage(complianceError)
    };
  }
};
