import { useCallback, useEffect, useState } from 'react';

const ACCESS_TOKEN_KEY = 'ledgerly_access_token';
const USER_EMAIL_KEY = 'ledgerly_user_email';

const createLocalToken = email =>
  `dev_${Date.now()}_${btoa(String(email).toLowerCase())}`;

export const useAuth = () => {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedEmail = window.localStorage.getItem(USER_EMAIL_KEY);

    if (!storedToken || !storedEmail) return;

    setAccessToken(storedToken);
    setUser({
      email: storedEmail,
      name: storedEmail.split('@')[0] || 'Operator'
    });
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const normalizedEmail = String(email || '').trim();
    const normalizedPassword = String(password || '').trim();

    if (!normalizedEmail || !normalizedPassword) {
      setError('Email and password are required.');
      return { success: false };
    }

    setError('');
    setIsLoading(true);

    try {
      const token = createLocalToken(normalizedEmail);
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
      window.localStorage.setItem(USER_EMAIL_KEY, normalizedEmail);

      setAccessToken(token);
      setUser({
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0] || 'Operator'
      });

      return { success: true, accessToken: token };
    } catch (loginError) {
      setError('Unable to sign in. Please try again.');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(USER_EMAIL_KEY);
    setAccessToken(null);
    setUser(null);
    setError('');
  }, []);

  return {
    accessToken,
    user,
    isAuthenticated: Boolean(accessToken),
    isLoading,
    error,
    login,
    logout
  };
};

export default useAuth;
