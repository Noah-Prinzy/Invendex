import React, { useState } from 'react';

const AuthForm = ({ onSubmit, isLoading = false, error = '' }) => {
  const [formValues, setFormValues] = useState({
    email: '',
    password: ''
  });

  const handleChange = event => {
    const { name, value } = event.target;
    setFormValues(current => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (typeof onSubmit !== 'function') return;
    await onSubmit(formValues);
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Ledgerly Control</p>
        <h1>Sign in to continue</h1>
        <p className="form-copy">
          Access dashboard operations, live purchase updates, and finance events.
        </p>
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

      <button type="submit" className="btn-primary" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
};

export default AuthForm;
