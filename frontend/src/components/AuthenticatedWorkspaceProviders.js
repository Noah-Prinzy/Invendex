import { QueryClientProvider } from '@tanstack/react-query';
import AuthenticatedWorkspace from './AuthenticatedWorkspace.js';
import queryClient from '../state/queryClient.js';
import { AppStateProvider } from '../state/appState.js';

const AuthenticatedWorkspaceProviders = (props) => (
  <QueryClientProvider client={queryClient}>
    <AppStateProvider>
      <AuthenticatedWorkspace {...props} />
    </AppStateProvider>
  </QueryClientProvider>
);

export default AuthenticatedWorkspaceProviders;
