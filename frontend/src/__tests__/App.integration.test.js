import { useState } from 'react';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved
} from '@testing-library/react';
import App from '../App.js';
import useAuth from '../hooks/auth/useAuth.js';
import { AUTH_INTRO_COMPLETED_STORAGE_KEY } from '../hooks/auth/authIntroStorage.js';
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
  createProductsBulkImportJobRequest,
  createProductsBulkImportRequest,
  getFinanceNotificationSettingsRequest,
  getNotificationsRequest,
  getFinanceTaxConfigRequest,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
  patchFinanceNotificationSettingsRequest,
  patchFinanceTaxConfigRequest,
  seedOnboardingSampleDataRequest,
  getProductsBulkImportJobStatusRequest,
  getFinanceRealtimeStatsRequest,
  getObservabilityPingRequest,
  getPurchaseOrdersRequest,
  getWarehousesRequest,
  getSettingsRequest
} from '../api/client.js';

vi.mock('../hooks/auth/useAuth.js', () => ({
  __esModule: true,
  default: vi.fn()
}));

vi.mock('../hooks/realtime/useInvendexRealtime.js', () => ({
  __esModule: true,
  useInvendexRealtime: vi.fn()
}));

vi.mock('../hooks/offline/useOfflineSync.js', () => ({
  __esModule: true,
  useOfflineSync: vi.fn()
}));

vi.mock('../api/client.js', () => ({
  getWmsBinMovementsRequest: vi.fn(),
  getWmsBinInventoryRequest: vi.fn(),
  getAiDemandAnomaliesRequest: vi.fn(),
  getAiSupplierReliabilityRequest: vi.fn(),
  getDashboardDeadStockRequest: vi.fn(),
  getDashboardDeadStockRescueRequest: vi.fn(),
  getDashboardDigitalTwinRequest: vi.fn(),
  getDashboardInventoryAdvisorRequest: vi.fn(),
  getDashboardSlowMovingSkusRequest: vi.fn(),
  getDashboardStockAgingBucketsRequest: vi.fn(),
  getDashboardSupplierRankingRequest: vi.fn(),
  getDashboardTopSellingItemsRequest: vi.fn(),
  getDashboardTurnoverSkusRequest: vi.fn(),
  createProductsBulkImportJobRequest: vi.fn(),
  createProductsBulkImportRequest: vi.fn(),
  getFinanceNotificationSettingsRequest: vi.fn(),
  getNotificationsRequest: vi.fn(),
  getFinanceTaxConfigRequest: vi.fn(),
  markNotificationReadRequest: vi.fn(),
  markAllNotificationsReadRequest: vi.fn(),
  patchFinanceNotificationSettingsRequest: vi.fn(),
  patchFinanceTaxConfigRequest: vi.fn(),
  seedOnboardingSampleDataRequest: vi.fn(),
  getProductsBulkImportJobStatusRequest: vi.fn(),
  getPurchaseOrdersRequest: vi.fn(),
  getWarehousesRequest: vi.fn(),
  getSettingsRequest: vi.fn(),
  getObservabilityPingRequest: vi.fn(),
  getFinanceRealtimeStatsRequest: vi.fn()
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
  adminLogin: vi.fn(),
  employeeLogin: vi.fn(),
  employeeSignup: vi.fn(),
  login: vi.fn(),
  reviewEmployeeSignupRequest: vi.fn(),
  verifyTwoFactorLogin: vi.fn(),
  signup: vi.fn(),
  requestEmailVerification: vi.fn(),
  verifyEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  updatePreferences: vi.fn(),
  getTwoFactorStatus: vi.fn(),
  setupTwoFactor: vi.fn(),
  enableTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
  regenerateTwoFactorRecoveryCodes: vi.fn(),
  exportComplianceData: vi.fn(),
  deleteMyAccount: vi.fn(),
  deleteOrganization: vi.fn(),
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
  logoutOtherSessions: vi.fn(),
  logout: vi.fn(),
  ...overrides
});

const getLatestRealtimeConfig = () => {
  const callCount = useInvendexRealtime.mock.calls.length;
  if (!callCount) return null;
  return useInvendexRealtime.mock.calls[callCount - 1][0];
};

const advancePastIntroLanding = async () => {
  const introFallback = screen.queryByText('Loading intro...');
  if (introFallback) {
    await waitForElementToBeRemoved(introFallback);
  }
  fireEvent.click(
    await screen.findByRole('button', { name: 'Intro landing screen' })
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Tap to Continue' })
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
  await screen.findByRole('button', { name: 'Employer Portal' });
};

describe('App integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    createProductsBulkImportJobRequest.mockResolvedValue({});
    createProductsBulkImportRequest.mockResolvedValue({});
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
    getProductsBulkImportJobStatusRequest.mockResolvedValue({});
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

  it('renders session initialization state', async () => {
    useAuth.mockReturnValue(
      buildAuthState({
        isInitializing: true
      })
    );

    await renderWithProviders(<App />);

    expect(screen.getByText('Loading session...')).toBeInTheDocument();
    expect(
      screen.getByText('Please wait while we restore your session.')
    ).toBeInTheDocument();
  });

  it('renders login form and submits credentials', async () => {
    const adminLogin = vi.fn();
    useAuth.mockReturnValue(
      buildAuthState({
        adminLogin
      })
    );

    await renderWithProviders(<App />);

    await advancePastIntroLanding();
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

  it('keeps the first intro page and skips only the second intro page when already completed', async () => {
    useAuth.mockReturnValue(buildAuthState({}));
    window.localStorage.setItem(AUTH_INTRO_COMPLETED_STORAGE_KEY, '1');

    await renderWithProviders(<App />);

    expect(
      await screen.findByRole('button', { name: 'Intro landing screen' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Employer Portal' })
    ).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Intro landing screen' })
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Tap to Continue' })
    );

    expect(
      await screen.findByRole('button', { name: 'Employer Portal' })
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
        email: 'owner@invendex.com',
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

    authState.logout = vi.fn().mockImplementation(async () => {
      authState = buildAuthState({});
      useAuth.mockImplementation(() => authState);
      triggerRerender();
    });

    useAuth.mockImplementation(() => authState);

    await renderWithProviders(<Harness />);

    expect(
      await screen.findByRole('button', { name: 'Sign out' }, { timeout: 3000 })
    ).toBeInTheDocument();

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

  it('submits employee sign in without invite code for returning staff', async () => {
    const employeeLogin = vi.fn();
    useAuth.mockReturnValue(
      buildAuthState({
        employeeLogin
      })
    );

    await renderWithProviders(<App />);

    await advancePastIntroLanding();
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
    const signup = vi.fn().mockResolvedValue({ success: true });
    useAuth.mockReturnValue(
      buildAuthState({
        signup
      })
    );

    await renderWithProviders(<App />);

    await advancePastIntroLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Employer Portal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Admin sign up' }));

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'owner.ops' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'owner@invendex.com' }
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
          email: 'owner@invendex.com',
          mobileNumber: '+256700000001',
          password: 'StrongPass123',
          confirmPassword: 'StrongPass123',
          organizationName: 'Invendex Ops'
        })
      );
    });
  });

  it('submits employee signup with mobile number', async () => {
    const employeeSignup = vi.fn().mockResolvedValue({ success: true });
    useAuth.mockReturnValue(
      buildAuthState({
        employeeSignup
      })
    );

    await renderWithProviders(<App />);

    await advancePastIntroLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Employee Portal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Employee sign up' }));

    fireEvent.change(screen.getByLabelText('Company Name'), {
      target: { value: 'Invendex Ops' }
    });
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'ops.staff' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'staff@invendex.com' }
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
          email: 'staff@invendex.com',
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
          email: 'manager@invendex.com',
          role: 'admin',
          organization: 'org-1'
        },
        accessToken: 'token-1',
        isAuthenticated: true
      })
    );

    await renderWithProviders(<App />);
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

    await waitFor(() => {
      expect(
        screen.getAllByText('Delta +5 | On hand 42').length
      ).toBeGreaterThan(0);
    });
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
          email: 'owner@invendex.com',
          role: 'admin',
          organization: 'org-1'
        },
        accessToken: 'token-2',
        isAuthenticated: true
      })
    );

    await renderWithProviders(<App />);
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
          email: 'owner@invendex.com',
          role: 'admin',
          organization: 'org-1'
        },
        accessToken: 'token-3',
        isAuthenticated: true
      })
    );

    await renderWithProviders(<App />);
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
