import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeI18n } from './i18n/index.js';
import { startBackgroundServices } from './bootstrap/startBackgroundServices.js';
import App from './App.js';
import GlobalErrorBoundary from './components/GlobalErrorBoundary.js';

const rootNode = document.getElementById('root');

if (rootNode) {
  const root = createRoot(rootNode);
  const renderApp = () => {
    root.render(
      <StrictMode>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </StrictMode>
    );
    startBackgroundServices();
  };

  initializeI18n()
    .catch((error) => {
      console.error('[i18n] Failed to initialize translations.', error);
    })
    .finally(renderApp);
}
