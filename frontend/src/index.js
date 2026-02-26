import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.js';
import GlobalErrorBoundary from './components/GlobalErrorBoundary.js';
import { initGlobalErrorTracking } from './observability/errorTracker.js';
import queryClient from './state/queryClient.js';
import { AppStateProvider } from './state/appState.js';
import { registerLedgerlyServiceWorker } from './offline/registerServiceWorker.js';

const rootNode = document.getElementById('root');
initGlobalErrorTracking();
registerLedgerlyServiceWorker();

if (rootNode) {
  createRoot(rootNode).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          <GlobalErrorBoundary>
            <App />
          </GlobalErrorBoundary>
        </AppStateProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}
