import { QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { initializeI18n } from '../i18n/index.js';
import { createInvendexQueryClient } from '../state/queryClient.js';
import { AppStateProvider } from '../state/appState.js';

export const renderWithProviders = async (ui) => {
  await initializeI18n('en');
  const testQueryClient = createInvendexQueryClient();
  let renderResult;

  await act(async () => {
    renderResult = render(
      <QueryClientProvider client={testQueryClient}>
        <AppStateProvider>{ui}</AppStateProvider>
      </QueryClientProvider>
    );
  });

  return renderResult;
};

export default renderWithProviders;
