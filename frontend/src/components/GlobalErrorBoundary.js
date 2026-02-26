import React from 'react';
import { captureFrontendException } from '../observability/errorTracker.js';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    captureFrontendException(error, {
      scope: 'react_error_boundary',
      componentStack: errorInfo?.componentStack || null
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="auth-layout">
          <section className="auth-card">
            <p className="eyebrow">Ledgerly</p>
            <h2>Something went wrong</h2>
            <p>Please reload the app. If this continues, contact support.</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;

