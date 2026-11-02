import { useState } from 'react';
import Button from '../ui/Button.js';

import '../styles/authForm.css';

const AUTH_PORTALS = Object.freeze({
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
});

const ADMIN_MODES = Object.freeze({
  SIGN_IN: 'signIn',
  SIGN_UP: 'signUp',
  FORGOT_PASSWORD: 'forgotPassword',
  RESET_PASSWORD: 'resetPassword',
  VERIFY_EMAIL: 'verifyEmail'
});

const EMPLOYEE_MODES = Object.freeze({
  SIGN_IN: 'signIn',
  SIGN_UP: 'signUp'
});

const INITIAL_FORM_VALUES = Object.freeze({
  companyName: '',
  username: '',
  email: '',
  mobileNumber: '',
  password: '',
  confirmPassword: '',
  organizationName: '',
  token: '',
  twoFactorCode: '',
  twoFactorRecoveryCode: ''
});

const AuthForm = ({
  onAdminSignIn,
  onEmployeeSignIn,
  onEmployeeSignUp,
  onSignUp,
  onRequestPasswordReset,
  onResetPassword,
  onRequestEmailVerification,
  onVerifyEmail,
  pendingTwoFactorLogin = null,
  onVerifyTwoFactorLogin,
  isLoading = false,
  error = '',
  notice = ''
}) => {
  const [portal, setPortal] = useState(null);
  const [adminMode, setAdminMode] = useState(ADMIN_MODES.SIGN_IN);
  const [employeeMode, setEmployeeMode] = useState(EMPLOYEE_MODES.SIGN_IN);
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);

  const isAdminPortal = portal === AUTH_PORTALS.ADMIN;
  const isAdminSignIn = adminMode === ADMIN_MODES.SIGN_IN;
  const isAdminSignUp = adminMode === ADMIN_MODES.SIGN_UP;
  const isAdminForgot = adminMode === ADMIN_MODES.FORGOT_PASSWORD;
  const isAdminReset = adminMode === ADMIN_MODES.RESET_PASSWORD;
  const isAdminVerify = adminMode === ADMIN_MODES.VERIFY_EMAIL;
  const isEmployeeSignUp = employeeMode === EMPLOYEE_MODES.SIGN_UP;
  const isTwoFactorChallengeActive = Boolean(
    pendingTwoFactorLogin?.twoFactorToken
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: value
    }));
  };

  const resetSensitiveFields = () => {
    setFormValues((current) => ({
      ...current,
      password: '',
      confirmPassword: '',
      token: '',
      twoFactorCode: '',
      twoFactorRecoveryCode: ''
    }));
  };

  const setPortalMode = (nextPortal) => {
    setPortal(nextPortal);
    setAdminMode(ADMIN_MODES.SIGN_IN);
    setEmployeeMode(EMPLOYEE_MODES.SIGN_IN);
    resetSensitiveFields();
  };

  const setAdminPortalMode = (nextMode) => {
    setAdminMode(nextMode);
    resetSensitiveFields();
  };

  const setEmployeePortalMode = (nextMode) => {
    setEmployeeMode(nextMode);
    resetSensitiveFields();
  };

  const resetToRoleSelector = () => {
    setPortal(null);
    setAdminMode(ADMIN_MODES.SIGN_IN);
    setEmployeeMode(EMPLOYEE_MODES.SIGN_IN);
    setFormValues(INITIAL_FORM_VALUES);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isTwoFactorChallengeActive) {
      if (typeof onVerifyTwoFactorLogin !== 'function') return;
      await onVerifyTwoFactorLogin({
        code: formValues.twoFactorCode,
        recoveryCode: formValues.twoFactorRecoveryCode
      });
      return;
    }

    if (!portal) return;

    if (!isAdminPortal) {
      if (isEmployeeSignUp && typeof onEmployeeSignUp === 'function') {
        const result = await onEmployeeSignUp({
          companyName: formValues.companyName,
          username: formValues.username,
          email: formValues.email,
          mobileNumber: formValues.mobileNumber,
          password: formValues.password,
          confirmPassword: formValues.confirmPassword
        });
        if (result?.success) {
          setEmployeePortalMode(EMPLOYEE_MODES.SIGN_IN);
        }
        return;
      }

      if (typeof onEmployeeSignIn !== 'function') return;
      await onEmployeeSignIn({
        companyName: formValues.companyName,
        username: formValues.username,
        password: formValues.password
      });
      return;
    }

    let action = null;
    if (isAdminSignIn) action = onAdminSignIn;
    if (isAdminSignUp) action = onSignUp;
    if (isAdminForgot) action = onRequestPasswordReset;
    if (isAdminReset) action = onResetPassword;
    if (isAdminVerify) action = onVerifyEmail;
    if (typeof action !== 'function') return;

    const result = await action(formValues);
    if (!result?.success) return;

    if (isAdminSignUp || isAdminForgot || isAdminReset || isAdminVerify) {
      setAdminPortalMode(ADMIN_MODES.SIGN_IN);
    }
  };

  const title = isAdminPortal
    ? isAdminSignUp
      ? 'Admin Sign Up'
      : isAdminForgot
        ? 'Admin Password Recovery'
        : isAdminReset
          ? 'Admin Password Reset'
          : isAdminVerify
            ? 'Admin Email Verification'
            : 'Admin Sign In'
    : isEmployeeSignUp
      ? 'Employee Sign Up'
      : 'Employee Sign In';

  const challengePortal = String(pendingTwoFactorLogin?.portal || '')
    .trim()
    .toLowerCase();
  const challengePortalLabel =
    challengePortal === 'admin'
      ? 'admin'
      : challengePortal === 'employee'
        ? 'employee'
        : 'account';

  const copy = isTwoFactorChallengeActive
    ? `Two-factor verification required for your ${challengePortalLabel} login.`
    : isAdminPortal
      ? 'Admin access includes full workspace controls, user management, and inventory governance.'
      : isEmployeeSignUp
        ? 'Submit a one-time signup request. An admin must approve it before first login.'
        : 'Employee sign in uses company name, username, and password.';
  const portalLabel = isAdminPortal ? 'Employer Portal' : 'Employee Portal';
  const heroTitle = isTwoFactorChallengeActive
    ? 'Complete verification to access your workspace.'
    : isAdminPortal
      ? 'Operate Invendex with full employer-level control.'
      : isEmployeeSignUp
        ? 'Request employee access to your company workspace.'
        : 'Continue with fast employee operations sign-in.';
  const heroHighlights = isAdminPortal
    ? [
        'Manage users, approvals, and company policies',
        'Oversee warehouses, products, and purchasing',
        'Track compliance and audit-ready activity'
      ]
    : [
        'Run daily stock and receiving workflows',
        'Collaborate inside assigned company scope',
        'Follow manager-approved operational actions'
      ];

  if (!portal) {
    return (
      <section className="auth-role-selector auth-role-selector-full">
        <div className="auth-role-bg-layer" aria-hidden="true">
          <span className="auth-role-bg-shape shape-one" />
          <span className="auth-role-bg-shape shape-two" />
          <span className="auth-role-bg-shape shape-three" />
          <span className="auth-role-bg-shape shape-four" />
        </div>

        <div className="auth-role-stage">
          <div className="auth-role-content">
            <div className="auth-portal-brand" aria-label="Invendex">
              <img src="/apple-touch-icon.png" alt="" />
              <span>Invendex</span>
            </div>
            <div className="auth-role-selector-head">
              <h1 className="auth-role-heading">
                <span className="auth-role-heading-line auth-role-heading-intro">
                  Are you the
                </span>
                <span className="auth-role-heading-line auth-role-heading-roles">
                  <span className="auth-role-word auth-role-word-employer">
                    Employer
                  </span>
                  <span className="auth-role-word auth-role-word-or">or</span>
                  <span className="auth-role-word auth-role-word-employee">
                    Employee
                  </span>
                </span>
              </h1>
              <p className="form-copy">
                Select the right portal to continue to your workspace.
              </p>
            </div>

            <div className="auth-role-selector-grid">
              <article className="auth-role-option auth-role-option-employer">
                <div className="auth-role-symbol-wrap" aria-hidden="true">
                  <svg
                    className="auth-role-symbol-svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3.5 20h17" />
                    <path d="M6 20V7.8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1V20" />
                    <path d="M9 10.2h1.8M13.2 10.2H15M9 13.2h1.8M13.2 13.2H15" />
                    <path d="M10.8 20v-3.1a1 1 0 0 1 1-1h.4a1 1 0 0 1 1 1V20" />
                    <path d="M8.2 6.8V4.9a1 1 0 0 1 1-1h5.6a1 1 0 0 1 1 1v1.9" />
                  </svg>
                </div>
                <p className="auth-role-option-kicker">Leadership workspace</p>
                <h2>Employer</h2>
                <p className="form-copy">
                  Manage locations, people, approvals, purchasing, and
                  business-wide inventory decisions.
                </p>
                <div className="auth-role-cta-shell">
                  <span className="auth-role-pulse pulse-a" />
                  <span className="auth-role-pulse pulse-b" />
                  <span className="auth-role-pulse pulse-c" />
                  <Button
                    type="button"
                    variant="primary"
                    className="auth-role-portal-btn auth-role-portal-btn-employer"
                    onClick={() => setPortalMode(AUTH_PORTALS.ADMIN)}
                  >
                    Employer Portal
                  </Button>
                </div>
              </article>

              <article className="auth-role-option auth-role-option-employee">
                <div className="auth-role-symbol-wrap" aria-hidden="true">
                  <svg
                    className="auth-role-symbol-svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7.2 12.5a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z" />
                    <path d="M16.8 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path d="M3.8 19.6c.9-2.5 2.7-4 5.3-4s4.3 1.5 5.3 4" />
                    <path d="M13.6 18.9c.6-1.7 1.8-2.8 3.5-2.8 1.6 0 2.8 1.1 3.4 2.8" />
                    <path d="M2.8 19.6h18.4" />
                  </svg>
                </div>
                <p className="auth-role-option-kicker">Operations workspace</p>
                <h2>Employee</h2>
                <p className="form-copy">
                  Handle stock, receiving, counts, and daily tasks inside your
                  assigned workspace.
                </p>
                <div className="auth-role-cta-shell">
                  <span className="auth-role-pulse pulse-a" />
                  <span className="auth-role-pulse pulse-b" />
                  <span className="auth-role-pulse pulse-c" />
                  <Button
                    type="button"
                    variant="primary"
                    className="auth-role-portal-btn auth-role-portal-btn-employee"
                    onClick={() => setPortalMode(AUTH_PORTALS.EMPLOYEE)}
                  >
                    Employee Portal
                  </Button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-authflow-page">
      <div className="auth-authflow-bg" aria-hidden="true">
        <span className="auth-authflow-bg-shape shape-a" />
        <span className="auth-authflow-bg-shape shape-b" />
        <span className="auth-authflow-bg-shape shape-c" />
      </div>

      <form className="auth-card auth-authflow-card" onSubmit={handleSubmit}>
        <aside className="auth-authflow-hero">
          <div className="auth-authflow-brand">
            <img src="/apple-touch-icon.png" alt="" />
            <span>Invendex</span>
          </div>
          <p className="eyebrow">{portalLabel}</p>
          <h2>{heroTitle}</h2>
          <p className="form-copy">{copy}</p>
          <div className="auth-authflow-mode-chip">{title}</div>
          <ul className="auth-authflow-points">
            {heroHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="auth-security-note">
            <span aria-hidden="true">✓</span>
            <p>
              <strong>Secure workspace access</strong>
              <small>Your session and permissions are protected.</small>
            </p>
          </div>
          <div className="auth-authflow-hero-rails" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </aside>

        <div className="auth-authflow-main">
          <div className="auth-title-row">
            <div>
              <p className="auth-form-kicker">Welcome back</p>
              <h1>{title}</h1>
              <p className="form-copy">{copy}</p>
            </div>
          </div>

          {!isTwoFactorChallengeActive ? (
            <div className="auth-mode-actions">
              <Button
                type="button"
                variant="ghost"
                className={`auth-mode-btn ${isAdminPortal ? 'active' : ''}`}
                onClick={() => setPortalMode(AUTH_PORTALS.ADMIN)}
              >
                Admin portal
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={`auth-mode-btn ${!isAdminPortal ? 'active' : ''}`}
                onClick={() => setPortalMode(AUTH_PORTALS.EMPLOYEE)}
              >
                Employee portal
              </Button>
            </div>
          ) : null}

          {!isTwoFactorChallengeActive && !isAdminPortal ? (
            <>
              <label htmlFor="companyName">Company Name</label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Acme Logistics"
                value={formValues.companyName}
                onChange={handleChange}
                required
              />

              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="jane.staff"
                value={formValues.username}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </>
          ) : null}

          {!isTwoFactorChallengeActive && !isAdminPortal && isEmployeeSignUp ? (
            <>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                value={formValues.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />

              <label htmlFor="mobileNumber">Mobile Number</label>
              <input
                id="mobileNumber"
                name="mobileNumber"
                type="tel"
                placeholder="+256700000000"
                value={formValues.mobileNumber}
                onChange={handleChange}
                autoComplete="tel"
                required
              />
            </>
          ) : null}

          {!isTwoFactorChallengeActive && isAdminPortal && isAdminSignIn ? (
            <>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="admin.username"
                value={formValues.username}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </>
          ) : null}

          {!isTwoFactorChallengeActive &&
          isAdminPortal &&
          (isAdminSignUp || isAdminForgot || isAdminReset || isAdminVerify) ? (
            <>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                value={formValues.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </>
          ) : null}

          {!isTwoFactorChallengeActive && isAdminPortal && isAdminSignUp ? (
            <>
              <label htmlFor="organizationName">Company Name</label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                placeholder="Acme Operations"
                value={formValues.organizationName}
                onChange={handleChange}
                autoComplete="organization"
                required
              />

              <label htmlFor="mobileNumber">Mobile Number</label>
              <input
                id="mobileNumber"
                name="mobileNumber"
                type="tel"
                placeholder="+256700000000"
                value={formValues.mobileNumber}
                onChange={handleChange}
                autoComplete="tel"
                required
              />

              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="admin.username"
                value={formValues.username}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </>
          ) : null}

          {!isTwoFactorChallengeActive &&
          isAdminPortal &&
          (isAdminReset || isAdminVerify) ? (
            <>
              <label htmlFor="token">Token</label>
              <input
                id="token"
                name="token"
                type="text"
                placeholder="Enter token"
                value={formValues.token}
                onChange={handleChange}
                required
              />
            </>
          ) : null}

          {!isTwoFactorChallengeActive &&
          (isAdminPortal
            ? isAdminSignIn || isAdminSignUp || isAdminReset
            : true) ? (
            <>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formValues.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </>
          ) : null}

          {!isTwoFactorChallengeActive &&
          ((isAdminPortal && (isAdminSignUp || isAdminReset)) ||
            (!isAdminPortal && isEmployeeSignUp)) ? (
            <>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formValues.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </>
          ) : null}

          {isTwoFactorChallengeActive ? (
            <>
              <p className="form-copy">
                Account:{' '}
                {pendingTwoFactorLogin?.username ||
                  pendingTwoFactorLogin?.email ||
                  formValues.username ||
                  formValues.email}
              </p>
              <label htmlFor="twoFactorCode">Authenticator Code</label>
              <input
                id="twoFactorCode"
                name="twoFactorCode"
                type="text"
                placeholder="123456"
                value={formValues.twoFactorCode}
                onChange={handleChange}
                autoComplete="one-time-code"
              />
              <label htmlFor="twoFactorRecoveryCode">
                Recovery Code (optional)
              </label>
              <input
                id="twoFactorRecoveryCode"
                name="twoFactorRecoveryCode"
                type="text"
                placeholder="AB12C-34D5E"
                value={formValues.twoFactorRecoveryCode}
                onChange={handleChange}
              />
            </>
          ) : null}

          {error ? (
            <p className="form-error" role="alert" aria-live="assertive">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="form-copy" id="auth-form-status" aria-live="polite">
              {notice}
            </p>
          ) : null}

          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading
              ? 'Submitting...'
              : isTwoFactorChallengeActive
                ? 'Verify code'
                : isAdminPortal
                  ? isAdminSignUp
                    ? 'Create admin account'
                    : isAdminForgot
                      ? 'Send reset token'
                      : isAdminReset
                        ? 'Apply password reset'
                        : isAdminVerify
                          ? 'Verify email'
                          : 'Sign in as admin'
                  : isEmployeeSignUp
                    ? 'Request employee signup'
                    : 'Sign in as employee'}
          </Button>

          <Button type="button" variant="ghost" onClick={resetToRoleSelector}>
            Choose role again
          </Button>

          {isAdminPortal && !isTwoFactorChallengeActive ? (
            <div className="auth-secondary-actions">
              {isAdminSignIn ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setAdminPortalMode(ADMIN_MODES.SIGN_UP)}
                  >
                    Admin sign up
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setAdminPortalMode(ADMIN_MODES.FORGOT_PASSWORD)
                    }
                  >
                    Forgot password
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setAdminPortalMode(ADMIN_MODES.RESET_PASSWORD)
                    }
                  >
                    Use reset token
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      typeof onRequestEmailVerification === 'function'
                        ? onRequestEmailVerification({
                            email: formValues.email
                          })
                        : setAdminPortalMode(ADMIN_MODES.VERIFY_EMAIL)
                    }
                  >
                    Request verification token
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setAdminPortalMode(ADMIN_MODES.VERIFY_EMAIL)}
                  >
                    Verify email token
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAdminPortalMode(ADMIN_MODES.SIGN_IN)}
                >
                  Back to admin sign in
                </Button>
              )}
            </div>
          ) : null}

          {!isAdminPortal && !isTwoFactorChallengeActive ? (
            <div className="auth-secondary-actions">
              {isEmployeeSignUp ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEmployeePortalMode(EMPLOYEE_MODES.SIGN_IN)}
                >
                  Back to employee sign in
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEmployeePortalMode(EMPLOYEE_MODES.SIGN_UP)}
                >
                  Employee sign up
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </form>
    </section>
  );
};

export default AuthForm;
