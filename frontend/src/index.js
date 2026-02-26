import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.js';
import GlobalErrorBoundary from './components/GlobalErrorBoundary.js';
import { initGlobalErrorTracking } from './observability/errorTracker.js';
import queryClient from './state/queryClient.js';

const rootNode = document.getElementById('root');
initGlobalErrorTracking();

if (rootNode) {
  createRoot(rootNode).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </QueryClientProvider>
    </React.StrictMode>
  );
}
