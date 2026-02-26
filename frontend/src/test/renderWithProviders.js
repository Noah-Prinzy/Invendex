import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createLedgerlyQueryClient } from '../state/queryClient.js';

export const renderWithProviders = ui => {
  const testQueryClient = createLedgerlyQueryClient();

  return render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>
  );
};

export default renderWithProviders;
