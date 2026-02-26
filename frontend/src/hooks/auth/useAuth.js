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
  authCsrfTokenRequest,
  authLogoutRequest,
  authMeRequest,
  authRefreshRequest
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

  return {
    accessToken,
    user,
    isAuthenticated: Boolean(accessToken && user),
    isLoading,
    isInitializing,
    error,
    notice,
    login,
    adminLogin,
    employeeLogin,
    signup,
    requestEmailVerification,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    logout
  };
};

export default useAuth;
