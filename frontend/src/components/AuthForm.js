import { useState } from 'react';

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

const INITIAL_FORM_VALUES = Object.freeze({
  companyName: '',
  inviteCode: '',
  email: '',
  password: '',
  confirmPassword: '',
  organizationName: '',
  token: ''
});

const AuthForm = ({
  onAdminSignIn,
  onEmployeeSignIn,
  onSignUp,
  onRequestPasswordReset,
  onResetPassword,
  onRequestEmailVerification,
  onVerifyEmail,
  isLoading = false,
  error = '',
  notice = ''
}) => {
  const [portal, setPortal] = useState(null);
  const [adminMode, setAdminMode] = useState(ADMIN_MODES.SIGN_IN);
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);

  const isAdminPortal = portal === AUTH_PORTALS.ADMIN;
  const isAdminSignIn = adminMode === ADMIN_MODES.SIGN_IN;
  const isAdminSignUp = adminMode === ADMIN_MODES.SIGN_UP;
  const isAdminForgot = adminMode === ADMIN_MODES.FORGOT_PASSWORD;
  const isAdminReset = adminMode === ADMIN_MODES.RESET_PASSWORD;
  const isAdminVerify = adminMode === ADMIN_MODES.VERIFY_EMAIL;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: value
    }));
  };

  const setPortalMode = (nextPortal) => {
    setPortal(nextPortal);
    setAdminMode(ADMIN_MODES.SIGN_IN);
    setFormValues((current) => ({
      ...current,
      password: '',
      confirmPassword: '',
      token: ''
    }));
  };

  const setAdminPortalMode = (nextMode) => {
    setAdminMode(nextMode);
    setFormValues((current) => ({
      ...current,
      password: '',
      confirmPassword: '',
      token: ''
    }));
  };

  const resetToRoleSelector = () => {
    setPortal(null);
    setAdminMode(ADMIN_MODES.SIGN_IN);
    setFormValues(INITIAL_FORM_VALUES);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!portal) return;

    if (!isAdminPortal) {
      if (typeof onEmployeeSignIn !== 'function') return;
      await onEmployeeSignIn({
        companyName: formValues.companyName,
        inviteCode: formValues.inviteCode,
        email: formValues.email,
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
    : 'Employee Sign In';

  const copy = isAdminPortal
    ? 'Admin access includes full workspace controls, user management, and inventory governance.'
    : 'Employee access includes stock visibility and day-to-day operations under your company account.';

  if (!portal) {
    return (
      <section className="auth-card auth-role-selector">
        <div className="auth-title-row">
          <div>
            <p className="eyebrow">Ledgerly Control</p>
            <h1>Welcome to Ledgerly</h1>
            <p className="form-copy">
              Sign in to continue. Access dashboard operations, live purchase
              updates, and finance events.
            </p>
            <p className="form-copy">
              Choose how you want to continue: Admin or Employee.
            </p>
          </div>
        </div>

        <div className="auth-mode-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setPortalMode(AUTH_PORTALS.ADMIN)}
          >
            Admin
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setPortalMode(AUTH_PORTALS.EMPLOYEE)}
          >
            Employee
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-title-row">
        <div>
          <p className="eyebrow">Ledgerly Control</p>
          <h1>{title}</h1>
          <p className="form-copy">{copy}</p>
        </div>
      </div>

      <div className="auth-mode-actions">
        <button
          type="button"
          className={`btn-ghost auth-mode-btn ${isAdminPortal ? 'active' : ''}`}
          onClick={() => setPortalMode(AUTH_PORTALS.ADMIN)}
        >
          Admin portal
        </button>
        <button
          type="button"
          className={`btn-ghost auth-mode-btn ${!isAdminPortal ? 'active' : ''}`}
          onClick={() => setPortalMode(AUTH_PORTALS.EMPLOYEE)}
        >
          Employee portal
        </button>
      </div>

      {!isAdminPortal ? (
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

          <label htmlFor="inviteCode">Invite Code</label>
          <input
            id="inviteCode"
            name="inviteCode"
            type="text"
            placeholder="INV-XXXXXX-XXXXXX"
            value={formValues.inviteCode}
            onChange={handleChange}
            required
          />
        </>
      ) : null}

      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        placeholder="you@company.com"
        value={formValues.email}
        onChange={handleChange}
        autoComplete="username"
        required
      />

      {isAdminPortal && isAdminSignUp ? (
        <>
          <label htmlFor="organizationName">Organization</label>
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
        </>
      ) : null}

      {isAdminPortal && (isAdminReset || isAdminVerify) ? (
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

      {!isAdminPortal || isAdminSignIn || isAdminSignUp || isAdminReset ? (
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

      {isAdminPortal && (isAdminSignUp || isAdminReset) ? (
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

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-copy">{notice}</p> : null}

      <button type="submit" className="btn-primary" disabled={isLoading}>
        {isLoading
          ? 'Submitting...'
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
            : 'Sign in as employee'}
      </button>
      <button type="button" className="btn-ghost" onClick={resetToRoleSelector}>
        Choose role again
      </button>

      {isAdminPortal ? (
        <div className="auth-secondary-actions">
          {isAdminSignIn ? (
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setAdminPortalMode(ADMIN_MODES.SIGN_UP)}
              >
                Admin sign up
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setAdminPortalMode(ADMIN_MODES.FORGOT_PASSWORD)}
              >
                Forgot password
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setAdminPortalMode(ADMIN_MODES.RESET_PASSWORD)}
              >
                Use reset token
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  typeof onRequestEmailVerification === 'function'
                    ? onRequestEmailVerification({ email: formValues.email })
                    : setAdminPortalMode(ADMIN_MODES.VERIFY_EMAIL)
                }
              >
                Request verification token
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setAdminPortalMode(ADMIN_MODES.VERIFY_EMAIL)}
              >
                Verify email token
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setAdminPortalMode(ADMIN_MODES.SIGN_IN)}
            >
              Back to admin sign in
            </button>
          )}
        </div>
      ) : null}
    </form>
  );
};

export default AuthForm;
