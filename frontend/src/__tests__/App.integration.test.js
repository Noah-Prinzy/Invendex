import { useState } from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import App from '../App.js';
import useAuth from '../hooks/auth/useAuth.js';
import { useInvendexRealtime } from '../hooks/realtime/useInvendexRealtime.js';
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
  getWarehousesRequest,
  getSettingsRequest
} from '../api/client.js';

jest.mock('../hooks/auth/useAuth.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../hooks/realtime/useInvendexRealtime.js', () => ({
  __esModule: true,
  useInvendexRealtime: jest.fn()
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
  getWarehousesRequest: jest.fn(),
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
  employeeSignup: jest.fn(),
  login: jest.fn(),
  reviewEmployeeSignupRequest: jest.fn(),
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
  const callCount = useInvendexRealtime.mock.calls.length;
  if (!callCount) return null;
  return useInvendexRealtime.mock.calls[callCount - 1][0];
};

const AUTH_INTRO_COMPLETED_STORAGE_KEY = 'Invendex:auth_intro_completed:v1';

const advancePastIntroLanding = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Intro landing screen' }));
  fireEvent.click(screen.getByRole('button', { name: 'Tap to Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
};

describe('App integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    useInvendexRealtime.mockImplementation(() => ({}));
    useOfflineSync.mockImplementation(() => {});
    getPurchaseOrdersRequest.mockResolvedValue([]);
    getWarehousesRequest.mockResolvedValue([]);
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

    advancePastIntroLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Employer Portal' }));

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'ops.admin' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in as admin' }));

    expect(adminLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'ops.admin',
        password: 'secret123'
      })
    );
  });

  it('keeps the first intro page and skips only the second intro page when already completed', () => {
    useAuth.mockReturnValue(buildAuthState({}));
    window.localStorage.setItem(AUTH_INTRO_COMPLETED_STORAGE_KEY, '1');

    renderWithProviders(<App />);

    expect(
      screen.getByRole('button', { name: 'Intro landing screen' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Employer Portal' })
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Intro landing screen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tap to Continue' }));

    expect(
      screen.getByRole('button', { name: 'Employer Portal' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Employee Portal' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });

  it('goes straight to the portal after sign out', async () => {
    let authState = buildAuthState({
      user: {
        _id: 'user-logout',
        email: 'owner@Invendex.com',
        role: 'admin',
        organization: 'org-1',
        organizationName: 'Invendex Ops'
      },
      accessToken: 'token-logout',
      isAuthenticated: true
    });
    let triggerRerender = () => {};

    const Harness = () => {
      const [, setVersion] = useState(0);
      triggerRerender = () => setVersion((current) => current + 1);
      return <App />;
    };

    authState.logout = jest.fn().mockImplementation(async () => {
      authState = buildAuthState({});
      useAuth.mockImplementation(() => authState);
      triggerRerender();
    });

    useAuth.mockImplementation(() => authState);

    renderWithProviders(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Employer Portal' })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: 'Employee Portal' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Intro landing screen' })
    ).toBeNull();
  });

  it('submits employee sign in without invite code for returning staff', () => {
    const employeeLogin = jest.fn();
    useAuth.mockReturnValue(
      buildAuthState({
        employeeLogin
      })
    );

    renderWithProviders(<App />);

    advancePastIntroLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Employee Portal' }));

    fireEvent.change(screen.getByLabelText('Company Name'), {
      target: { value: 'Warehouse Heroes' }
    });
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'employee_1' }
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
        username: 'employee_1',
        password: 'EmployeePass123!'
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

    advancePastIntroLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Employer Portal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Admin sign up' }));

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'owner.ops' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'owner@Invendex.com' }
    });
    fireEvent.change(screen.getByLabelText('Mobile Number'), {
      target: { value: '+256700000001' }
    });
    fireEvent.change(screen.getByLabelText('Company Name'), {
      target: { value: 'Invendex Ops' }
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
          username: 'owner.ops',
          email: 'owner@Invendex.com',
          mobileNumber: '+256700000001',
          password: 'StrongPass123',
          confirmPassword: 'StrongPass123',
          organizationName: 'Invendex Ops'
        })
      );
    });
  });

  it('submits employee signup with mobile number', async () => {
    const employeeSignup = jest.fn().mockResolvedValue({ success: true });
    useAuth.mockReturnValue(
      buildAuthState({
        employeeSignup
      })
    );

    renderWithProviders(<App />);

    advancePastIntroLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Employee Portal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Employee sign up' }));

    fireEvent.change(screen.getByLabelText('Company Name'), {
      target: { value: 'Invendex Ops' }
    });
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'ops.staff' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'staff@Invendex.com' }
    });
    fireEvent.change(screen.getByLabelText('Mobile Number'), {
      target: { value: '+256700000002' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'StaffPass123!' }
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'StaffPass123!' }
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Request employee signup' })
    );

    await waitFor(() => {
      expect(employeeSignup).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Invendex Ops',
          username: 'ops.staff',
          email: 'staff@Invendex.com',
          mobileNumber: '+256700000002',
          password: 'StaffPass123!',
          confirmPassword: 'StaffPass123!'
        })
      );
    });
  });

  it('handles realtime inventory and purchase-order updates', async () => {
    useAuth.mockReturnValue(
      buildAuthState({
        user: {
          _id: 'user-1',
          email: 'manager@Invendex.com',
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

    expect(screen.getAllByText('Delta +5 | On hand 42').length).toBeGreaterThan(
      0
    );
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
          email: 'owner@Invendex.com',
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

  it('replays the beginner tutorial from settings', async () => {
    window.history.replaceState({}, '', '/?tab=settings');

    useAuth.mockReturnValue(
      buildAuthState({
        user: {
          _id: 'user-3',
          email: 'owner@Invendex.com',
          role: 'admin',
          organization: 'org-1'
        },
        accessToken: 'token-3',
        isAuthenticated: true
      })
    );

    renderWithProviders(<App />);
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Settings' })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Replay tutorial' }));

    await waitFor(() => {
      expect(screen.getByText('Welcome to Invendex')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Skip tutorial' })
      ).toBeInTheDocument();
    });
  });
});
