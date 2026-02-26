import {
  act,
  fireEvent,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import App from '../App.js';
import useAuth from '../hooks/auth/useAuth.js';
import { useLedgerlyRealtime } from '../hooks/realtime/useLedgerlyRealtime.js';
import { renderWithProviders } from '../test/renderWithProviders.js';

jest.mock('../hooks/auth/useAuth.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../hooks/realtime/useLedgerlyRealtime.js', () => ({
  __esModule: true,
  useLedgerlyRealtime: jest.fn()
}));

const buildAuthState = (overrides) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: false,
  error: '',
  notice: '',
  adminLogin: jest.fn(),
  employeeLogin: jest.fn(),
  login: jest.fn(),
  signup: jest.fn(),
  requestEmailVerification: jest.fn(),
  verifyEmail: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  logout: jest.fn(),
  ...overrides
});

const getLatestRealtimeConfig = () => {
  const callCount = useLedgerlyRealtime.mock.calls.length;
  if (!callCount) return null;
  return useLedgerlyRealtime.mock.calls[callCount - 1][0];
};

describe('App integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLedgerlyRealtime.mockImplementation(() => ({}));
  });

  it('renders session initialization state', () => {
    useAuth.mockReturnValue(
      buildAuthState({
        isInitializing: true
      })
    );

    renderWithProviders(<App />);

    expect(screen.getByText('Loading session...')).toBeInTheDocument();
    expect(
      screen.getByText('Please wait while we restore your session.')
    ).toBeInTheDocument();
  });

  it('renders login form and submits credentials', () => {
    const adminLogin = jest.fn();
    useAuth.mockReturnValue(
      buildAuthState({
        adminLogin
      })
    );

    renderWithProviders(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ops@ledgerly.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in as admin' }));

    expect(adminLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ops@ledgerly.com',
        password: 'secret123'
      })
    );
  });

  it('supports signup mode and submits organization details', async () => {
    const signup = jest.fn().mockResolvedValue({ success: true });
    useAuth.mockReturnValue(
      buildAuthState({
        signup
      })
    );

    renderWithProviders(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Admin sign up' }));

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'owner@ledgerly.com' }
    });
    fireEvent.change(screen.getByLabelText('Organization'), {
      target: { value: 'Ledgerly Ops' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'StrongPass123' }
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'StrongPass123' }
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Create admin account' })
    );

    await waitFor(() => {
      expect(signup).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'owner@ledgerly.com',
          password: 'StrongPass123',
          confirmPassword: 'StrongPass123',
          organizationName: 'Ledgerly Ops'
        })
      );
    });
  });

  it('handles realtime inventory and purchase-order updates with unread clearing', () => {
    useAuth.mockReturnValue(
      buildAuthState({
        user: {
          _id: 'user-1',
          email: 'manager@ledgerly.com',
          role: 'admin',
          organization: 'org-1'
        },
        accessToken: 'token-1',
        isAuthenticated: true
      })
    );

    renderWithProviders(<App />);

    const inventoryPayload = {
      organizationId: 'org-1',
      entityId: 'inv-1',
      occurredAt: '2026-02-24T12:00:00.000Z',
      data: {
        source: 'PO_RECEIPT',
        quantityDelta: 5,
        quantityOnHand: 42
      }
    };

    const poPayload = {
      organizationId: 'org-1',
      entityId: 'po-1',
      occurredAt: '2026-02-24T12:10:00.000Z',
      data: {
        poNumber: 'PO-1001',
        status: 'RECEIVED'
      }
    };

    act(() => {
      const realtimeConfig = getLatestRealtimeConfig();
      realtimeConfig.onInventoryUpdated(inventoryPayload);
      realtimeConfig.onPurchaseOrderReceived(poPayload);
    });

    expect(screen.getByText('Delta +5 | On hand 42')).toBeInTheDocument();
    const notificationsButton = screen.getByRole('button', {
      name: 'Notifications'
    });
    expect(within(notificationsButton).getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Purchase Orders' }));
    expect(screen.getByText('PO PO-1001')).toBeInTheDocument();
    expect(screen.getByText('Status RECEIVED')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(within(notificationsButton).getByText('0')).toBeInTheDocument();
  });
});
