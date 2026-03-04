import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import App from '../App.js';
import useAuth from '../hooks/auth/useAuth.js';
import { useLedgerlyRealtime } from '../hooks/realtime/useLedgerlyRealtime.js';
import { useOfflineSync } from '../hooks/offline/useOfflineSync.js';
import { renderWithProviders } from '../test/renderWithProviders.js';
import {
  getWmsBinMovementsRequest,
  getWmsBinInventoryRequest,
  getAiDemandAnomaliesRequest,
  getAiSupplierReliabilityRequest,
  getDashboardDeadStockRequest,
  getDashboardDeadStockRescueRequest,
  getDashboardDigitalTwinRequest,
  getDashboardInventoryAdvisorRequest,
  getDashboardSlowMovingSkusRequest,
  getDashboardStockAgingBucketsRequest,
  getDashboardSupplierRankingRequest,
  getDashboardTopSellingItemsRequest,
  getDashboardTurnoverSkusRequest,
  getFinanceNotificationSettingsRequest,
  getNotificationsRequest,
  getFinanceTaxConfigRequest,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
  patchFinanceNotificationSettingsRequest,
  patchFinanceTaxConfigRequest,
  seedOnboardingSampleDataRequest,
  getFinanceRealtimeStatsRequest,
  getObservabilityPingRequest,
  getPurchaseOrdersRequest,
  getSettingsRequest
} from '../api/client.js';

jest.mock('../hooks/auth/useAuth.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../hooks/realtime/useLedgerlyRealtime.js', () => ({
  __esModule: true,
  useLedgerlyRealtime: jest.fn()
}));

jest.mock('../hooks/offline/useOfflineSync.js', () => ({
  __esModule: true,
  useOfflineSync: jest.fn()
}));

jest.mock('../api/client.js', () => ({
  getWmsBinMovementsRequest: jest.fn(),
  getWmsBinInventoryRequest: jest.fn(),
  getAiDemandAnomaliesRequest: jest.fn(),
  getAiSupplierReliabilityRequest: jest.fn(),
  getDashboardDeadStockRequest: jest.fn(),
  getDashboardDeadStockRescueRequest: jest.fn(),
  getDashboardDigitalTwinRequest: jest.fn(),
  getDashboardInventoryAdvisorRequest: jest.fn(),
  getDashboardSlowMovingSkusRequest: jest.fn(),
  getDashboardStockAgingBucketsRequest: jest.fn(),
  getDashboardSupplierRankingRequest: jest.fn(),
  getDashboardTopSellingItemsRequest: jest.fn(),
  getDashboardTurnoverSkusRequest: jest.fn(),
  getFinanceNotificationSettingsRequest: jest.fn(),
  getNotificationsRequest: jest.fn(),
  getFinanceTaxConfigRequest: jest.fn(),
  markNotificationReadRequest: jest.fn(),
  markAllNotificationsReadRequest: jest.fn(),
  patchFinanceNotificationSettingsRequest: jest.fn(),
  patchFinanceTaxConfigRequest: jest.fn(),
  seedOnboardingSampleDataRequest: jest.fn(),
  getPurchaseOrdersRequest: jest.fn(),
  getSettingsRequest: jest.fn(),
  getObservabilityPingRequest: jest.fn(),
  getFinanceRealtimeStatsRequest: jest.fn()
}));

const buildAuthState = (overrides) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: false,
  error: '',
  notice: '',
  pendingTwoFactorLogin: null,
  adminLogin: jest.fn(),
  employeeLogin: jest.fn(),
  login: jest.fn(),
  verifyTwoFactorLogin: jest.fn(),
  signup: jest.fn(),
  requestEmailVerification: jest.fn(),
  verifyEmail: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  updatePreferences: jest.fn(),
  getTwoFactorStatus: jest.fn(),
  setupTwoFactor: jest.fn(),
  enableTwoFactor: jest.fn(),
  disableTwoFactor: jest.fn(),
  regenerateTwoFactorRecoveryCodes: jest.fn(),
  exportComplianceData: jest.fn(),
  deleteMyAccount: jest.fn(),
  deleteOrganization: jest.fn(),
  listSessions: jest.fn(),
  revokeSession: jest.fn(),
  logoutOtherSessions: jest.fn(),
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
    useOfflineSync.mockImplementation(() => {});
    getPurchaseOrdersRequest.mockResolvedValue([]);
    getNotificationsRequest.mockResolvedValue({
      items: [],
      unreadCount: 0
    });
    markNotificationReadRequest.mockResolvedValue({});
    markAllNotificationsReadRequest.mockResolvedValue({});
    seedOnboardingSampleDataRequest.mockResolvedValue({
      skipped: false,
      seedVersion: 'v1',
      summary: {}
    });
    getSettingsRequest.mockResolvedValue({
      organizationName: 'Test Org',
      organizationCode: 'TEST'
    });
    getDashboardTopSellingItemsRequest.mockResolvedValue([]);
    getDashboardTurnoverSkusRequest.mockResolvedValue([]);
    getDashboardSlowMovingSkusRequest.mockResolvedValue([]);
    getDashboardStockAgingBucketsRequest.mockResolvedValue({
      summary: {}
    });
    getDashboardSupplierRankingRequest.mockResolvedValue([]);
    getDashboardDeadStockRequest.mockResolvedValue({
      items: [],
      count: 0,
      totalValue: 0,
      thresholdDays: 90
    });
    getDashboardInventoryAdvisorRequest.mockResolvedValue({
      totals: {
        recommendations: 0
      },
      recommendations: []
    });
    getDashboardDeadStockRescueRequest.mockResolvedValue({
      totals: {
        items: 0
      },
      actions: []
    });
    getWmsBinInventoryRequest.mockResolvedValue({
      bin: null,
      totals: {
        lines: 0,
        quantityOnHand: 0,
        quantityReserved: 0,
        quantityAvailable: 0,
        inventoryValue: 0
      },
      items: []
    });
    getWmsBinMovementsRequest.mockResolvedValue({
      bin: null,
      totals: {
        count: 0,
        quantity: 0,
        inboundQuantity: 0,
        outboundQuantity: 0,
        byType: {}
      },
      movements: []
    });
    getDashboardDigitalTwinRequest.mockResolvedValue({
      totals: {
        warehouses: 0,
        zones: 0,
        bins: 0
      },
      warehouses: []
    });
    getAiDemandAnomaliesRequest.mockResolvedValue({
      productId: null,
      anomalyCount: 0,
      anomalies: [],
      status: 'normal'
    });
    getAiSupplierReliabilityRequest.mockResolvedValue([]);
    getFinanceTaxConfigRequest.mockResolvedValue({
      taxInclusivePricing: false,
      importTaxEnabled: false,
      importTaxRate: 0
    });
    getFinanceNotificationSettingsRequest.mockResolvedValue({
      smsLowStockEnabled: false,
      smsLowStockRecipients: [],
      whatsappLowStockEnabled: false,
      whatsappLowStockRecipients: []
    });
    patchFinanceTaxConfigRequest.mockResolvedValue({});
    patchFinanceNotificationSettingsRequest.mockResolvedValue({});
    getObservabilityPingRequest.mockResolvedValue({
      trace: { requestId: 'req-1', clientTraceId: 'trace-1' },
      realtime: { enabled: true },
      errorTracking: { provider: 'none' },
      uptimeSeconds: 12
    });
    getFinanceRealtimeStatsRequest.mockResolvedValue([]);
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

  it('submits employee sign in without invite code for returning staff', () => {
    const employeeLogin = jest.fn();
    useAuth.mockReturnValue(
      buildAuthState({
        employeeLogin
      })
    );

    renderWithProviders(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Employee' }));

    fireEvent.change(screen.getByLabelText('Company Name'), {
      target: { value: 'Warehouse Heroes' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'employee1@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'EmployeePass123!' }
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Sign in as employee' })
    );

    expect(employeeLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: 'Warehouse Heroes',
        email: 'employee1@example.com',
        password: 'EmployeePass123!',
        inviteCode: ''
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

  it('handles realtime inventory and purchase-order updates', async () => {
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
    await waitFor(() => {
      expect(getNotificationsRequest).toHaveBeenCalled();
    });

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
    fireEvent.click(screen.getByRole('button', { name: 'Purchase Orders' }));
    expect(await screen.findByText('PO PO-1001')).toBeInTheDocument();
    expect(await screen.findByText('Status RECEIVED')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('opens settings sub-page from URL deep link', async () => {
    window.history.replaceState(
      {},
      '',
      '/?tab=settings&settingsPage=inventory-controls'
    );

    useAuth.mockReturnValue(
      buildAuthState({
        user: {
          _id: 'user-2',
          email: 'owner@ledgerly.com',
          role: 'admin',
          organization: 'org-1'
        },
        accessToken: 'token-2',
        isAuthenticated: true
      })
    );

    renderWithProviders(<App />);
    await waitFor(() => {
      expect(getNotificationsRequest).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Inventory Controls')).toBeInTheDocument();
    });
  });
});
