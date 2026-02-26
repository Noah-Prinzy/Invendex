import { QueryClient } from '@tanstack/react-query';

const DEFAULT_STALE_TIME_MS = 45 * 1000;

export const createLedgerlyQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        gcTime: 5 * 60 * 1000,
        retry: process.env.NODE_ENV === 'production' ? 1 : false,
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: false
      }
    }
  });

const queryClient = createLedgerlyQueryClient();

export default queryClient;
