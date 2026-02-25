import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  authLoginRequest,
  authRegisterRequest,
  authLogoutRequest,
  authMeRequest,
  authRefreshRequest
} from '../../api/client.js';

const ACCESS_TOKEN_KEY = 'ledgerly_access_token';

const saveAccessToken = token => {
  if (!token) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

const getSavedAccessToken = () =>
  String(window.localStorage.getItem(ACCESS_TOKEN_KEY) || '').trim();

const normalizeUser = user => {
  if (!user) return null;
  return {
    _id: user._id,
    email: user.email,
    role: user.role,
    organization: user.organization || null,
    name: user.name || (user.email ? user.email.split('@')[0] : 'Operator')
  };
};

const getMessage = error => {
  if (error instanceof ApiError) return error.message;
  return 'Unable to complete authentication request.';
};

export const useAuth = () => {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const applyAuthState = useCallback(({ token, resolvedUser }) => {
    saveAccessToken(token);
    setAccessToken(token || null);
    setUser(normalizeUser(resolvedUser));
  }, []);

  const clearAuthState = useCallback(() => {
    saveAccessToken('');
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
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
          resolvedUser: meResponse?.data || null
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
            resolvedUser: meResponse?.data || null
          });
        } catch {
          if (!isMounted) return;
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

  const login = useCallback(
    async ({ email, password }) => {
      const normalizedEmail = String(email || '').trim();
      const normalizedPassword = String(password || '').trim();

      if (!normalizedEmail || !normalizedPassword) {
        setError('Email and password are required.');
        return { success: false };
      }

      setError('');
      setNotice('');
      setIsLoading(true);

      try {
        const loginResponse = await authLoginRequest({
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
          resolvedUser
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

  const logout = useCallback(async () => {
    setError('');
    setNotice('');

    try {
      if (accessToken) {
        await authLogoutRequest(accessToken);
      }
    } catch {
      // local cleanup is still required even if network logout fails
    } finally {
      clearAuthState();
    }
  }, [accessToken, clearAuthState]);

  const signup = useCallback(async ({ email, password, organizationName }) => {
    const normalizedEmail = String(email || '').trim();
    const normalizedPassword = String(password || '').trim();
    const normalizedOrganizationName = String(organizationName || '').trim();

    if (!normalizedEmail || !normalizedPassword || !normalizedOrganizationName) {
      setError('Email, password, and organization are required.');
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
  }, []);

  return {
    accessToken,
    user,
    isAuthenticated: Boolean(accessToken && user),
    isLoading,
    isInitializing,
    error,
    notice,
    login,
    signup,
    logout
  };
};

export default useAuth;
