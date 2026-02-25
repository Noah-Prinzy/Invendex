import React, { useState } from 'react';

const AuthForm = ({
  onSignIn,
  onSignUp,
  isLoading = false,
  error = '',
  notice = ''
}) => {
  const [mode, setMode] = useState('signIn');
  const [formValues, setFormValues] = useState({
    email: '',
    password: '',
    organizationName: ''
  });

  const isSignUpMode = mode === 'signUp';

  const handleChange = event => {
    const { name, value } = event.target;
    setFormValues(current => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    const action = isSignUpMode ? onSignUp : onSignIn;
    if (typeof action !== 'function') return;

    const result = await action(formValues);
    if (isSignUpMode && result?.success) {
      setMode('signIn');
      setFormValues(current => ({
        ...current,
        password: ''
      }));
    }
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-title-row">
        <div>
          <p className="eyebrow">Ledgerly Control</p>
          <h1>{isSignUpMode ? 'Create your account' : 'Sign in to continue'}</h1>
          <p className="form-copy">
            {isSignUpMode
              ? 'Set up your workspace, then sign in to start operating.'
              : 'Access dashboard operations, live purchase updates, and finance events.'}
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost auth-mode-btn"
          onClick={() => setMode(current => (current === 'signIn' ? 'signUp' : 'signIn'))}
        >
          {isSignUpMode ? 'Back to Sign in' : 'Sign up'}
        </button>
      </div>

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

      {isSignUpMode ? (
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

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-copy">{notice}</p> : null}

      <button type="submit" className="btn-primary" disabled={isLoading}>
        {isLoading
          ? isSignUpMode
            ? 'Creating account...'
            : 'Signing in...'
          : isSignUpMode
            ? 'Create account'
            : 'Sign in'}
      </button>
    </form>
  );
};

export default AuthForm;
