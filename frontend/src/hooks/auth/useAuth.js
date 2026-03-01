import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  authLoginRequest,
  authAdminLoginRequest,
  authEmployeeLoginRequest,
  authRegisterRequest,
  authVerifyEmailRequest,
  authVerifyEmailConfirmRequest,
  authForgotPasswordRequest,
  authResetPasswordRequest,
  authTwoFactorVerifyLoginRequest,
  authTwoFactorStatusRequest,
  authTwoFactorSetupRequest,
  authTwoFactorEnableRequest,
  authTwoFactorDisableRequest,
  authTwoFactorRegenerateRecoveryCodesRequest,
  authCsrfTokenRequest,
  authLogoutRequest,
  authMeRequest,
  authListSessionsRequest,
  authRevokeSessionRequest,
  authLogoutOtherSessionsRequest,
  authRefreshRequest,
  authUpdatePreferencesRequest,
  complianceExportRequest,
  complianceDeleteMyAccountRequest,
  complianceDeleteOrganizationRequest
} from '../../api/client.js';

const ACCESS_TOKEN_KEY = 'ledgerly_access_token';

const saveAccessToken = (token) => {
  if (!token) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

const getSavedAccessToken = () =>
  String(window.localStorage.getItem(ACCESS_TOKEN_KEY) || '').trim();

const normalizeUser = (user, organization = null) => {
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
    role: user.role,
    uiTheme: String(user.uiTheme || '').trim() || null,
    organization: normalizedOrganizationId,
    organizationName: normalizedOrganizationName,
    name: user.name || (user.email ? user.email.split('@')[0] : 'Operator')
  };
};

const getMessage = (error) => {
  if (error instanceof ApiError) {
    if (error.statusCode === 429) {
      return 'Too many login attempts. Please wait 15 minutes and try again.';
    }
    return error.message;
  }
  return 'Unable to complete authentication request.';
};

export const useAuth = () => {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pendingTwoFactorLogin, setPendingTwoFactorLogin] = useState(null);

  const applyAuthState = useCallback(
    ({ token, resolvedUser, organization }) => {
      saveAccessToken(token);
      setAccessToken(token || null);
      setUser(normalizeUser(resolvedUser, organization));
    },
    []
  );

  const clearAuthState = useCallback(() => {
    saveAccessToken('');
    setAccessToken(null);
    setUser(null);
    setPendingTwoFactorLogin(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        await authCsrfTokenRequest();
      } catch {
        // no-op: fallback login still works when CSRF is disabled
      }

      const storedToken = getSavedAccessToken();

      if (!storedToken) {
        if (isMounted) setIsInitializing(false);
        return;
      }

      try {
        const meResponse = await authMeRequest(storedToken);
        if (!isMounted) return;
        applyAuthState({
          token: storedToken,
          resolvedUser: meResponse?.data || null,
          organization: meResponse?.data?.organization || null
        });
      } catch {
        try {
          const refreshResponse = await authRefreshRequest();
          const refreshedToken = refreshResponse?.data?.accessToken || '';
          if (!refreshedToken) {
            throw new Error('No access token returned during refresh.');
          }

          const meResponse = await authMeRequest(refreshedToken);
          if (!isMounted) return;
          applyAuthState({
            token: refreshedToken,
            resolvedUser: meResponse?.data || null,
            organization: meResponse?.data?.organization || null
          });
        } catch {
          if (!isMounted) return;
          try {
            await authLogoutRequest(null);
          } catch {
            // noop: local cleanup still runs below
          }
          clearAuthState();
        }
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [applyAuthState, clearAuthState]);

  const performLogin = useCallback(
    async ({
      email,
      password,
      loginRequest,
      companyName = '',
      inviteCode = ''
    }) => {
      const normalizedEmail = String(email || '').trim();
      const normalizedPassword = String(password || '').trim();
      const normalizedCompanyName = String(companyName || '').trim();
      const normalizedInviteCode = String(inviteCode || '').trim();

      if (!normalizedEmail || !normalizedPassword || !loginRequest) {
        setError('Email and password are required.');
        return { success: false };
      }

      if (loginRequest === authEmployeeLoginRequest && !normalizedCompanyName) {
        setError('Company name is required for employee sign in.');
        return { success: false };
      }

      setError('');
      setNotice('');
      setIsLoading(true);

      try {
        const loginResponse =
          loginRequest === authEmployeeLoginRequest
            ? await loginRequest({
                companyName: normalizedCompanyName,
                email: normalizedEmail,
                password: normalizedPassword,
                inviteCode: normalizedInviteCode
              })
            : await loginRequest({
                email: normalizedEmail,
                password: normalizedPassword
              });

        const requiresTwoFactor =
          Boolean(loginResponse?.data?.requiresTwoFactor) &&
          String(loginResponse?.data?.twoFactorToken || '').trim().length > 0;

        if (requiresTwoFactor) {
          setPendingTwoFactorLogin({
            portal:
              loginRequest === authAdminLoginRequest
                ? 'admin'
                : loginRequest === authEmployeeLoginRequest
                  ? 'employee'
                  : 'generic',
            twoFactorToken: String(loginResponse?.data?.twoFactorToken || ''),
            expiresInSeconds: Number(
              loginResponse?.data?.expiresInSeconds || 600
            ),
            email: normalizedEmail,
            companyName: normalizedCompanyName || ''
          });
          setNotice('Two-factor authentication required. Enter your code.');
          return { success: false, requiresTwoFactor: true };
        }

        const token = loginResponse?.data?.accessToken || '';
        const resolvedUser = loginResponse?.data?.user || null;

        if (!token || !resolvedUser) {
          throw new Error('Auth response missing token or user.');
        }

        applyAuthState({
          token,
          resolvedUser,
          organization: loginResponse?.data?.organization || null
        });
        setPendingTwoFactorLogin(null);

        return { success: true, accessToken: token };
      } catch (loginError) {
        setError(getMessage(loginError));
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [applyAuthState]
  );

  const adminLogin = useCallback(
    async ({ email, password }) =>
      performLogin({
        email,
        password,
        loginRequest: authAdminLoginRequest
      }),
    [performLogin]
  );

  const employeeLogin = useCallback(
    async ({ companyName, email, password, inviteCode }) =>
      performLogin({
        companyName,
        email,
        password,
        inviteCode,
        loginRequest: authEmployeeLoginRequest
      }),
    [performLogin]
  );

  // Backward-compatible generic login entry.
  const login = useCallback(
    async ({ email, password }) =>
      performLogin({
        email,
        password,
        loginRequest: authLoginRequest
      }),
    [performLogin]
  );

  const logout = useCallback(async () => {
    setError('');
    setNotice('');

    try {
      await authCsrfTokenRequest();
      if (accessToken) {
        await authLogoutRequest(accessToken);
      }
    } catch {
      // local cleanup is still required even if network logout fails
    } finally {
      clearAuthState();
    }
  }, [accessToken, clearAuthState]);

  const verifyTwoFactorLogin = useCallback(
    async ({ code = '', recoveryCode = '' }) => {
      const twoFactorToken = String(
        pendingTwoFactorLogin?.twoFactorToken || ''
      ).trim();
      if (!twoFactorToken) {
        return {
          success: false,
          message: 'No active two-factor login challenge'
        };
      }

      setError('');
      setNotice('');
      setIsLoading(true);

      try {
        const response = await authTwoFactorVerifyLoginRequest({
          twoFactorToken,
          code: String(code || '').trim(),
          recoveryCode: String(recoveryCode || '').trim()
        });

        const token = response?.data?.accessToken || '';
        const resolvedUser = response?.data?.user || null;
        if (!token || !resolvedUser) {
          throw new Error(
            'Two-factor verification response missing auth data.'
          );
        }

        applyAuthState({
          token,
          resolvedUser,
          organization: response?.data?.organization || null
        });
        setPendingTwoFactorLogin(null);
        setNotice('Two-factor verification complete.');
        return { success: true };
      } catch (verificationError) {
        const message = getMessage(verificationError);
        setError(message);
        return { success: false, message };
      } finally {
        setIsLoading(false);
      }
    },
    [applyAuthState, pendingTwoFactorLogin]
  );

  const signup = useCallback(
    async ({ email, password, confirmPassword, organizationName }) => {
      const normalizedEmail = String(email || '').trim();
      const normalizedPassword = String(password || '').trim();
      const normalizedConfirmPassword = String(confirmPassword || '').trim();
      const normalizedOrganizationName = String(organizationName || '').trim();

      if (
        !normalizedEmail ||
        !normalizedPassword ||
        !normalizedConfirmPassword ||
        !normalizedOrganizationName
      ) {
        setError(
          'Email, password, confirm password, and organization are required.'
        );
        setNotice('');
        return { success: false };
      }

      if (normalizedPassword !== normalizedConfirmPassword) {
        setError('Password and confirm password do not match.');
        setNotice('');
        return { success: false };
      }

      setError('');
      setNotice('');
      setIsLoading(true);

      try {
        await authRegisterRequest({
          email: normalizedEmail,
          password: normalizedPassword,
          confirmPassword: normalizedConfirmPassword,
          organizationName: normalizedOrganizationName
        });

        setNotice('Account created successfully. Sign in to continue.');
        return { success: true };
      } catch (registerError) {
        setError(getMessage(registerError));
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const requestEmailVerification = useCallback(async ({ email }) => {
    const normalizedEmail = String(email || '').trim();
    if (!normalizedEmail) {
      setError('Email is required.');
      setNotice('');
      return { success: false };
    }

    setError('');
    setNotice('');
    setIsLoading(true);

    try {
      const response = await authVerifyEmailRequest({ email: normalizedEmail });
      const debugToken = response?.data?.debugToken || '';
      const tokenSuffix = debugToken ? ` Token: ${debugToken}` : '';
      setNotice(`Verification request accepted.${tokenSuffix}`);
      return { success: true, debugToken };
    } catch (verificationError) {
      setError(getMessage(verificationError));
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async ({ email, token }) => {
    const normalizedEmail = String(email || '').trim();
    const normalizedToken = String(token || '').trim();
    if (!normalizedEmail || !normalizedToken) {
      setError('Email and verification token are required.');
      setNotice('');
      return { success: false };
    }

    setError('');
    setNotice('');
    setIsLoading(true);

    try {
      await authVerifyEmailConfirmRequest({
        email: normalizedEmail,
        token: normalizedToken
      });
      setNotice('Email verified. You can now sign in.');
      return { success: true };
    } catch (verificationError) {
      setError(getMessage(verificationError));
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async ({ email }) => {
    const normalizedEmail = String(email || '').trim();
    if (!normalizedEmail) {
      setError('Email is required.');
      setNotice('');
      return { success: false };
    }

    setError('');
    setNotice('');
    setIsLoading(true);

    try {
      const response = await authForgotPasswordRequest({
        email: normalizedEmail
      });
      const debugToken = response?.data?.debugToken || '';
      const tokenSuffix = debugToken ? ` Token: ${debugToken}` : '';
      setNotice(`Password reset token generated.${tokenSuffix}`);
      return { success: true, debugToken };
    } catch (resetError) {
      setError(getMessage(resetError));
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(
    async ({ email, token, password, confirmPassword }) => {
      const normalizedEmail = String(email || '').trim();
      const normalizedToken = String(token || '').trim();
      const normalizedPassword = String(password || '').trim();
      const normalizedConfirmPassword = String(confirmPassword || '').trim();

      if (
        !normalizedEmail ||
        !normalizedToken ||
        !normalizedPassword ||
        !normalizedConfirmPassword
      ) {
        setError('Email, token, password, and confirm password are required.');
        setNotice('');
        return { success: false };
      }

      if (normalizedPassword !== normalizedConfirmPassword) {
        setError('Password and confirm password do not match.');
        setNotice('');
        return { success: false };
      }

      setError('');
      setNotice('');
      setIsLoading(true);

      try {
        await authResetPasswordRequest({
          email: normalizedEmail,
          token: normalizedToken,
          password: normalizedPassword,
          confirmPassword: normalizedConfirmPassword
        });
        setNotice('Password reset successful. Sign in with your new password.');
        return { success: true };
      } catch (resetError) {
        setError(getMessage(resetError));
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updatePreferences = useCallback(
    async ({ uiTheme }) => {
      const normalizedTheme = String(uiTheme || '').trim();
      if (!normalizedTheme || !accessToken) {
        return { success: false };
      }

      try {
        const response = await authUpdatePreferencesRequest({
          accessToken,
          uiTheme: normalizedTheme
        });
        const updatedUser = normalizeUser(
          response?.data || null,
          response?.data?.organization || null
        );
        if (updatedUser) {
          setUser(updatedUser);
        }
        return { success: true, user: updatedUser };
      } catch (prefError) {
        return {
          success: false,
          message: getMessage(prefError)
        };
      }
    },
    [accessToken]
  );

  const listSessions = useCallback(async () => {
    if (!accessToken) {
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
  }, [accessToken]);

  const revokeSession = useCallback(
    async (sessionId) => {
      if (!accessToken) {
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

        if (response?.data?.currentSessionTerminated) {
          clearAuthState();
        }

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
    },
    [accessToken, clearAuthState]
  );

  const logoutOtherSessions = useCallback(async () => {
    if (!accessToken) {
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
  }, [accessToken]);

  const getTwoFactorStatus = useCallback(async () => {
    if (!accessToken) return { success: false, message: 'Not authenticated' };
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
  }, [accessToken]);

  const setupTwoFactor = useCallback(
    async ({ currentPassword }) => {
      if (!accessToken) {
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
    },
    [accessToken]
  );

  const enableTwoFactor = useCallback(
    async ({ currentPassword, code }) => {
      if (!accessToken) {
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
    },
    [accessToken]
  );

  const disableTwoFactor = useCallback(
    async ({ currentPassword, code = '', recoveryCode = '' }) => {
      if (!accessToken) {
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
    },
    [accessToken]
  );

  const regenerateTwoFactorRecoveryCodes = useCallback(
    async ({ currentPassword, code = '', recoveryCode = '' }) => {
      if (!accessToken) {
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
    },
    [accessToken]
  );

  const exportComplianceData = useCallback(
    async ({ includeAudit = false, limit = 2000 } = {}) => {
      if (!accessToken) {
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
    },
    [accessToken]
  );

  const deleteMyAccount = useCallback(
    async ({ currentPassword, confirmationText = 'DELETE MY ACCOUNT' }) => {
      if (!accessToken) {
        return { success: false, message: 'Not authenticated' };
      }

      try {
        await authCsrfTokenRequest();
        await complianceDeleteMyAccountRequest({
          accessToken,
          currentPassword: String(currentPassword || '').trim(),
          confirmationText
        });
        clearAuthState();
        return { success: true };
      } catch (complianceError) {
        return {
          success: false,
          message: getMessage(complianceError)
        };
      }
    },
    [accessToken, clearAuthState]
  );

  const deleteOrganization = useCallback(
    async ({ currentPassword, confirmationText }) => {
      if (!accessToken) {
        return { success: false, message: 'Not authenticated' };
      }

      try {
        await authCsrfTokenRequest();
        await complianceDeleteOrganizationRequest({
          accessToken,
          currentPassword: String(currentPassword || '').trim(),
          confirmationText: String(confirmationText || '').trim()
        });
        clearAuthState();
        return { success: true };
      } catch (complianceError) {
        return {
          success: false,
          message: getMessage(complianceError)
        };
      }
    },
    [accessToken, clearAuthState]
  );

  return {
    accessToken,
    user,
    isAuthenticated: Boolean(accessToken && user),
    isLoading,
    isInitializing,
    error,
    notice,
    pendingTwoFactorLogin,
    login,
    adminLogin,
    employeeLogin,
    verifyTwoFactorLogin,
    signup,
    requestEmailVerification,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    updatePreferences,
    getTwoFactorStatus,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    regenerateTwoFactorRecoveryCodes,
    exportComplianceData,
    deleteMyAccount,
    deleteOrganization,
    listSessions,
    revokeSession,
    logoutOtherSessions,
    logout
  };
};

export default useAuth;
