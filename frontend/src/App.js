import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { useTranslation } from './i18n/index.js';
import useAuth from './hooks/auth/useAuth.js';
import {
  hasCompletedAuthIntro,
  markAuthIntroCompleted
} from './hooks/auth/authIntroStorage.js';
import AuthLayout from './layouts/AuthLayout.js';
import RequireAuth from './guards/RequireAuth.js';

import './styles/global.css';

const AuthForm = lazy(() => import('./components/AuthForm.js'));
const AuthIntroLanding = lazy(() => import('./components/AuthIntroLanding.js'));
const AuthenticatedWorkspaceProviders = lazy(
  () => import('./components/AuthenticatedWorkspaceProviders.js')
);

const App = () => {
  const { t } = useTranslation();
  const {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    isInitializing,
    error,
    notice,
    adminLogin,
    employeeLogin,
    signup,
    employeeSignup,
    reviewEmployeeSignupRequest,
    requestEmailVerification,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    pendingTwoFactorLogin,
    verifyTwoFactorLogin,
    updatePreferences,
    endSession,
    logout
  } = useAuth();
  const [isAuthPortalVisible, setIsAuthPortalVisible] = useState(false);
  const wasAuthenticatedRef = useRef(false);
  const logoutIntentRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      setIsAuthPortalVisible(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      setIsAuthPortalVisible(logoutIntentRef.current);
      logoutIntentRef.current = false;
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const handleGetStarted = useCallback(() => {
    markAuthIntroCompleted();
    setIsAuthPortalVisible(true);
  }, []);

  const handleLogout = useCallback(async () => {
    logoutIntentRef.current = true;

    try {
      await logout();
    } catch (error) {
      logoutIntentRef.current = false;
      throw error;
    }
  }, [logout]);

  if (isInitializing) {
    return (
      <AuthLayout
        eyebrow={t('app.brand')}
        title={t('app.loadingSessionTitle')}
        description={t('app.loadingSessionDescription')}
      >
        <section className="auth-card">
          <p className="form-copy">{t('app.loadingSessionBody')}</p>
        </section>
      </AuthLayout>
    );
  }

  const authPortalFallback = (
    <main className="auth-layout auth-layout-single">
      <section className="auth-card">
        <p className="form-copy">Loading sign-in...</p>
      </section>
    </main>
  );

  const authIntroFallback = (
    <AuthLayout
      eyebrow={t('app.brand')}
      title="Welcome to Invendex"
      description={t('app.authIntroDescription')}
    >
      <section className="auth-card">
        <p className="form-copy">Loading intro...</p>
      </section>
    </AuthLayout>
  );

  const workspaceFallback = (
    <AuthLayout
      eyebrow={t('app.brand')}
      title={t('app.loadingSessionTitle')}
      description={t('app.loadingSessionDescription')}
    >
      <section className="auth-card">
        <p className="form-copy">Loading workspace...</p>
      </section>
    </AuthLayout>
  );

  const signedOutView = isAuthPortalVisible ? (
    <Suspense fallback={authPortalFallback}>
      <main className="auth-layout auth-layout-single">
        <AuthForm
          onAdminSignIn={adminLogin}
          onEmployeeSignIn={employeeLogin}
          onEmployeeSignUp={employeeSignup}
          onSignUp={signup}
          onRequestEmailVerification={requestEmailVerification}
          onVerifyEmail={verifyEmail}
          onRequestPasswordReset={requestPasswordReset}
          onResetPassword={resetPassword}
          pendingTwoFactorLogin={pendingTwoFactorLogin}
          onVerifyTwoFactorLogin={verifyTwoFactorLogin}
          onBackToIntro={() => setIsAuthPortalVisible(false)}
          isLoading={isLoading}
          error={error}
          notice={notice}
        />
      </main>
    </Suspense>
  ) : (
    <Suspense fallback={authIntroFallback}>
      <AuthIntroLanding
        eyebrow={t('app.brand')}
        title="Welcome to Invendex"
        description={t('app.authIntroDescription')}
        onGetStarted={handleGetStarted}
        skipStoryScreen={hasCompletedAuthIntro()}
      />
    </Suspense>
  );

  return (
    <RequireAuth isAuthenticated={isAuthenticated} fallback={signedOutView}>
      <Suspense fallback={workspaceFallback}>
        <AuthenticatedWorkspaceProviders
          user={user}
          accessToken={accessToken}
          reviewEmployeeSignupRequest={reviewEmployeeSignupRequest}
          updatePreferences={updatePreferences}
          onSessionInvalidated={endSession}
          onLogout={handleLogout}
        />
      </Suspense>
    </RequireAuth>
  );
};

export default App;
