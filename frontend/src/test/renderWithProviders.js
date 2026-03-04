import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import '../i18n/index.js';
import { createLedgerlyQueryClient } from '../state/queryClient.js';
import { AppStateProvider } from '../state/appState.js';

export const renderWithProviders = (ui) => {
  const testQueryClient = createLedgerlyQueryClient();

  return render(
    <QueryClientProvider client={testQueryClient}>
      <AppStateProvider>{ui}</AppStateProvider>
    </QueryClientProvider>
  );
};

export default renderWithProviders;
