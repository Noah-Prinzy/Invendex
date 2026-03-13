import { useCallback, useEffect, useState } from 'react';
import {
  authLoginRequest,
  authAdminLoginRequest,
  authEmployeeLoginRequest,
  authCsrfTokenRequest,
  authLogoutRequest,
  authMeRequest,
  authRefreshRequest
} from '../../api/authClient.js';
import {
  getAuthErrorMessage,
  normalizeAuthUser,
  persistAccessToken,
  readStoredAccessToken
} from './authHelpers.js';

let deferredAuthModulePromise = null;

const loadDeferredAuthModule = async () => {
  if (!deferredAuthModulePromise) {
    deferredAuthModulePromise = import('./authDeferredActions.js');
  }

  return deferredAuthModulePromise;
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
      persistAccessToken(token);
      setAccessToken(token || null);
      setUser(normalizeAuthUser(resolvedUser, organization));
    },
    []
  );

  const clearAuthState = useCallback(() => {
    persistAccessToken('');
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

      const storedToken = readStoredAccessToken();

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
      username = '',
      email,
      password,
      loginRequest,
      companyName = ''
    }) => {
      const normalizedUsername = String(username || '').trim();
      const normalizedEmail = String(email || '').trim();
      const normalizedPassword = String(password || '').trim();
      const normalizedCompanyName = String(companyName || '').trim();

      if (
        (!normalizedUsername && !normalizedEmail) ||
        !normalizedPassword ||
        !loginRequest
      ) {
        setError('Username and password are required.');
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
                username: normalizedUsername,
                email: normalizedEmail,
                password: normalizedPassword
              })
            : await loginRequest({
                username: normalizedUsername,
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
            username: normalizedUsername,
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
        setError(getAuthErrorMessage(loginError));
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [applyAuthState]
  );

  const adminLogin = useCallback(
    async ({ username, email, password }) =>
      performLogin({
        username,
        email,
        password,
        loginRequest: authAdminLoginRequest
      }),
    [performLogin]
  );

  const employeeLogin = useCallback(
    async ({ companyName, username, email, password }) =>
      performLogin({
        companyName,
        username,
        email,
        password,
        loginRequest: authEmployeeLoginRequest
      }),
    [performLogin]
  );

  // Backward-compatible generic login entry.
  const login = useCallback(
    async ({ username, email, password }) =>
      performLogin({
        username,
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

  const endSession = useCallback(() => {
    setError('');
    setNotice('');
    clearAuthState();
  }, [clearAuthState]);

  const verifyTwoFactorLogin = useCallback(
    async ({ code = '', recoveryCode = '' }) => {
      const { verifyTwoFactorLoginAction } = await loadDeferredAuthModule();
      return verifyTwoFactorLoginAction({
        pendingTwoFactorLogin,
        code,
        recoveryCode,
        applyAuthState,
        setPendingTwoFactorLogin,
        setError,
        setNotice,
        setIsLoading,
        getMessage: getAuthErrorMessage
      });
    },
    [applyAuthState, pendingTwoFactorLogin]
  );

  const signup = useCallback(async (params) => {
    const { signupAction } = await loadDeferredAuthModule();
    return signupAction({
      ...params,
      setError,
      setNotice,
      setIsLoading,
      getMessage: getAuthErrorMessage
    });
  }, []);

  const employeeSignup = useCallback(async (params) => {
    const { employeeSignupAction } = await loadDeferredAuthModule();
    return employeeSignupAction({
      ...params,
      setError,
      setNotice,
      setIsLoading,
      getMessage: getAuthErrorMessage
    });
  }, []);

  const reviewEmployeeSignupRequest = useCallback(
    async ({ requestId, decision = 'approve', reason = '' }) => {
      const { reviewEmployeeSignupRequestAction } =
        await loadDeferredAuthModule();
      return reviewEmployeeSignupRequestAction({
        accessToken,
        requestId,
        decision,
        reason,
        getMessage: getAuthErrorMessage
      });
    },
    [accessToken]
  );

  const requestEmailVerification = useCallback(async ({ email }) => {
    const { requestEmailVerificationAction } = await loadDeferredAuthModule();
    return requestEmailVerificationAction({
      email,
      setError,
      setNotice,
      setIsLoading,
      getMessage: getAuthErrorMessage
    });
  }, []);

  const verifyEmail = useCallback(async ({ email, token }) => {
    const { verifyEmailAction } = await loadDeferredAuthModule();
    return verifyEmailAction({
      email,
      token,
      setError,
      setNotice,
      setIsLoading,
      getMessage: getAuthErrorMessage
    });
  }, []);

  const requestPasswordReset = useCallback(async ({ email }) => {
    const { requestPasswordResetAction } = await loadDeferredAuthModule();
    return requestPasswordResetAction({
      email,
      setError,
      setNotice,
      setIsLoading,
      getMessage: getAuthErrorMessage
    });
  }, []);

  const resetPassword = useCallback(async (params) => {
    const { resetPasswordAction } = await loadDeferredAuthModule();
    return resetPasswordAction({
      ...params,
      setError,
      setNotice,
      setIsLoading,
      getMessage: getAuthErrorMessage
    });
  }, []);

  const updatePreferences = useCallback(
    async ({ uiTheme, mobileNumber }) => {
      const { updatePreferencesAction } = await loadDeferredAuthModule();
      return updatePreferencesAction({
        accessToken,
        uiTheme,
        mobileNumber,
        normalizeUser: normalizeAuthUser,
        setUser,
        getMessage: getAuthErrorMessage
      });
    },
    [accessToken]
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
    employeeSignup,
    reviewEmployeeSignupRequest,
    requestEmailVerification,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    updatePreferences,
    endSession,
    logout
  };
};

export default useAuth;
