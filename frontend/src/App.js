import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import AuthForm from './components/AuthForm.js';
import NotificationBell from './components/NotificationBell.js';
import TabBar from './components/TabBar.js';
import useAuth from './hooks/auth/useAuth.js';
import useTabs from './hooks/ui/useTabs.js';
import { useLedgerlyRealtime } from './hooks/realtime/useLedgerlyRealtime.js';
import { useOfflineSync } from './hooks/offline/useOfflineSync.js';
import AuthLayout from './layouts/AuthLayout.js';
import DashboardLayout from './layouts/DashboardLayout.js';
import RequireAuth from './guards/RequireAuth.js';
import RequireOrganization from './guards/RequireOrganization.js';
import RequireRole from './guards/RequireRole.js';
import Card from './ui/Card.js';
import { useAppActions, useAppState } from './state/appState.js';
import {
  getProductsRequest,
  getPurchaseOrdersRequest,
  getSettingsRequest,
  getNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest
} from './api/client.js';
import { isKnownThemeId } from './themes/themeCatalog.js';
import {
  applyThemePreference,
  readThemePreference,
  writeThemePreference
} from './themes/themePreference.js';

import './styles/global.css';
import './styles/dashboard.css';

const EVENT_LIMIT = 40;
const ADMIN_ROLES = new Set(['owner', 'admin']);
const TAB_QUERY_KEY = 'tab';
const SETTINGS_PAGE_QUERY_KEY = 'settingsPage';
const sanitizeBaseUrl = (value) =>
  String(value || '')
    .trim()
    .replace(/\/+$/, '');

const getRealtimeBaseUrl = () => {
  const envBase = sanitizeBaseUrl(
    process.env.REACT_APP_SOCKET_BASE_URL || process.env.REACT_APP_API_BASE_URL
  );
  if (envBase) return envBase;

  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  if (window.location.port === '3000') {
    return 'http://localhost:4000';
  }

  return sanitizeBaseUrl(window.location.origin);
};

const Dashboard = lazy(() => import('./features/dashboard/DashboardPage.js'));
const PurchaseOrders = lazy(
  () => import('./features/purchaseOrders/PurchaseOrdersPage.js')
);
const Products = lazy(() => import('./features/products/ProductsPage.js'));
const Suppliers = lazy(() => import('./features/suppliers/SuppliersPage.js'));
const Reports = lazy(() => import('./features/reports/ReportsPage.js'));
const Users = lazy(() => import('./features/users/UsersPage.js'));
const Stocktakes = lazy(
  () => import('./features/stocktakes/StocktakesPage.js')
);
const Account = lazy(() => import('./features/account/AccountPage.js'));
const Settings = lazy(() => import('./features/settings/SettingsPage.js'));

const buildInventoryEvent = (payload, eventName) => {
  const data = payload?.data || {};
  const quantityDelta = Number(data.quantityDelta || 0);
  const quantityOnHand = Number(data.quantityOnHand || 0);
  const sign = quantityDelta >= 0 ? '+' : '';

  return {
    id: `${eventName}:${payload?.entityId || 'n/a'}:${payload?.occurredAt || Date.now()}`,
    eventName,
    occurredAt: payload?.occurredAt || new Date().toISOString(),
    title: data.source ? `Inventory ${data.source}` : 'Inventory updated',
    subtitle: `Delta ${sign}${quantityDelta} | On hand ${quantityOnHand}`,
    raw: payload
  };
};

const buildFinanceEvent = (payload, eventName) => {
  const data = payload?.data || {};
  const orderId = data.orderId || data.reason || 'n/a';

  return {
    id: `${eventName}:${payload?.entityId || 'n/a'}:${payload?.occurredAt || Date.now()}`,
    eventName,
    occurredAt: payload?.occurredAt || new Date().toISOString(),
    title:
      eventName === 'finance.cogs_recorded'
        ? 'COGS recorded'
        : 'Valuation updated',
    subtitle: `Reference ${String(orderId)}`,
    raw: payload
  };
};

const buildPurchaseOrderEvent = (payload, kind) => {
  const data = payload?.data || {};
  const poNumber = data.poNumber || payload?.entityId || 'n/a';
  const status = data.status || 'UNKNOWN';

  return {
    id: `po:${kind}:${payload?.entityId || 'n/a'}:${payload?.occurredAt || Date.now()}`,
    kind,
    occurredAt: payload?.occurredAt || new Date().toISOString(),
    title: `PO ${poNumber}`,
    subtitle: `Status ${status}`,
    raw: payload
  };
};

const buildAuthEvent = (payload) => {
  const data = payload?.data || {};
  const email = data.email || 'employee';

  return {
    id: `auth:employee:${payload?.entityId || 'n/a'}:${payload?.occurredAt || Date.now()}`,
    occurredAt: payload?.occurredAt || new Date().toISOString(),
    title: 'Employee signed in',
    subtitle: `${email} joined ${data.organizationName || 'organization'}`,
    raw: payload
  };
};

const prependEvent = (list, event) => [event, ...list].slice(0, EVENT_LIMIT);

const readTabFromUrl = () => {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return String(params.get(TAB_QUERY_KEY) || '')
    .trim()
    .toLowerCase();
};

const writeTabToUrl = (tabKey) => {
  if (typeof window === 'undefined') return;
  const nextTab = String(tabKey || '').trim();
  if (!nextTab) return;

  const url = new URL(window.location.href);
  url.searchParams.set(TAB_QUERY_KEY, nextTab);
  if (nextTab !== 'settings') {
    url.searchParams.delete(SETTINGS_PAGE_QUERY_KEY);
  }
  const nextPath = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', nextPath);
};

const GuardFallback = ({ title, description }) => (
  <section className="panel">
    <Card className="event-card">
      <h3>{title}</h3>
      <p className="event-sub">{description}</p>
    </Card>
  </section>
);

const App = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    isInitializing,
    error,
    notice,
    adminLogin,
    employeeLogin,
    signup,
    requestEmailVerification,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    pendingTwoFactorLogin,
    verifyTwoFactorLogin,
    updatePreferences,
    getTwoFactorStatus,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    regenerateTwoFactorRecoveryCodes,
    exportComplianceData,
    deleteMyAccount,
    deleteOrganization,
    listSessions,
    revokeSession,
    logoutOtherSessions,
    logout
  } = useAuth();
  const { activeWarehouseId, isOnline, offlineQueueSize } = useAppState();
  const { setActiveWarehouseId, setIsOnline, setOfflineQueueSize, setSession } =
    useAppActions();
  const { tabs, activeTab, setActiveTab } = useTabs(user?.role || null);
  const hasResolvedInitialTabRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [inventoryEvents, setInventoryEvents] = useState([]);
  const [financeEvents, setFinanceEvents] = useState([]);
  const [authEvents, setAuthEvents] = useState([]);
  const [poEvents, setPoEvents] = useState([]);
  const [themeId, setThemeId] = useState(() => readThemePreference());

  const realtimeBaseUrl = useMemo(() => getRealtimeBaseUrl(), []);
  const companyName = useMemo(() => {
    const fromProfile = String(user?.organizationName || '').trim();
    if (fromProfile) return fromProfile;
    const fromOrganizationObject =
      typeof user?.organization === 'object'
        ? String(user.organization?.name || '').trim()
        : '';
    if (fromOrganizationObject) return fromOrganizationObject;
    return t('app.organizationFallback');
  }, [t, user]);

  const refreshNotifications = useCallback(async () => {
    if (!accessToken || !isAuthenticated) return;
    setNotificationsLoading(true);

    try {
      const response = await getNotificationsRequest({
        accessToken,
        limit: 20
      });
      const items = Array.isArray(response?.items) ? response.items : [];
      setNotifications(items);
      setUnreadCount(Number(response?.unreadCount || 0));
    } catch {
      // no-op: keep existing notification state when refresh fails
    } finally {
      setNotificationsLoading(false);
    }
  }, [accessToken, isAuthenticated]);

  const prefetchCoreData = useCallback(async () => {
    if (!accessToken) return;

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['settings:get', String(accessToken || '')],
        queryFn: () => getSettingsRequest(accessToken)
      }),
      queryClient.prefetchQuery({
        queryKey: ['purchase-orders', String(accessToken || '')],
        queryFn: () => getPurchaseOrdersRequest(accessToken)
      }),
      queryClient.prefetchQuery({
        queryKey: [
          'products:index',
          String(accessToken || ''),
          String(true),
          String(false),
          '',
          ''
        ],
        queryFn: () => getProductsRequest(accessToken)
      })
    ]);
  }, [accessToken, queryClient]);

  const handleMarkNotificationRead = useCallback(
    async (notificationId) => {
      if (!accessToken) return;
      const normalizedId = String(notificationId || '').trim();
      if (!normalizedId) return;

      try {
        await markNotificationReadRequest({
          accessToken,
          notificationId: normalizedId
        });
        await refreshNotifications();
      } catch {
        // no-op
      }
    },
    [accessToken, refreshNotifications]
  );

  const handleMarkAllNotificationsRead = useCallback(async () => {
    if (!accessToken) return;
    try {
      await markAllNotificationsReadRequest({
        accessToken
      });
      await refreshNotifications();
    } catch {
      // no-op
    }
  }, [accessToken, refreshNotifications]);

  const handleInventoryUpdated = useCallback((payload) => {
    setInventoryEvents((current) =>
      prependEvent(current, buildInventoryEvent(payload, 'inventory.updated'))
    );
  }, []);

  const handleValuationUpdated = useCallback((payload) => {
    setFinanceEvents((current) =>
      prependEvent(
        current,
        buildFinanceEvent(payload, 'finance.valuation_updated')
      )
    );
  }, []);

  const handleCogsRecorded = useCallback((payload) => {
    setFinanceEvents((current) =>
      prependEvent(current, buildFinanceEvent(payload, 'finance.cogs_recorded'))
    );
  }, []);

  const handlePoCreated = useCallback(
    (payload) => {
      setPoEvents((current) =>
        prependEvent(current, buildPurchaseOrderEvent(payload, 'created'))
      );
      refreshNotifications();
    },
    [refreshNotifications]
  );

  const handlePoUpdated = useCallback(
    (payload) => {
      setPoEvents((current) =>
        prependEvent(current, buildPurchaseOrderEvent(payload, 'updated'))
      );
      refreshNotifications();
    },
    [refreshNotifications]
  );

  const handlePoReceived = useCallback(
    (payload) => {
      setPoEvents((current) =>
        prependEvent(current, buildPurchaseOrderEvent(payload, 'received'))
      );
      refreshNotifications();
    },
    [refreshNotifications]
  );

  const handleEmployeeSignedIn = useCallback(
    (payload) => {
      if (!ADMIN_ROLES.has(String(user?.role || '').toLowerCase())) {
        return;
      }
      setAuthEvents((current) =>
        prependEvent(current, buildAuthEvent(payload))
      );
      refreshNotifications();
    },
    [user?.role, refreshNotifications]
  );

  const handleNotificationCreated = useCallback(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useLedgerlyRealtime({
    baseUrl: realtimeBaseUrl,
    accessToken,
    warehouseId: activeWarehouseId || null,
    onInventoryUpdated: handleInventoryUpdated,
    onPurchaseOrderCreated: handlePoCreated,
    onPurchaseOrderUpdated: handlePoUpdated,
    onPurchaseOrderReceived: handlePoReceived,
    onCogsRecorded: handleCogsRecorded,
    onValuationUpdated: handleValuationUpdated,
    onEmployeeSignedIn: handleEmployeeSignedIn,
    onNotificationCreated: handleNotificationCreated
  });

  useOfflineSync({
    isOnline,
    isAuthenticated,
    accessToken,
    setIsOnline,
    setOfflineQueueSize
  });

  const handleThemeChange = useCallback(
    async (nextThemeId) => {
      if (!isKnownThemeId(nextThemeId)) return;
      setThemeId(nextThemeId);

      if (!isAuthenticated || !accessToken) {
        return;
      }

      await updatePreferences({
        uiTheme: nextThemeId
      });
    },
    [isAuthenticated, accessToken, updatePreferences]
  );

  useEffect(() => {
    const profileTheme = String(user?.uiTheme || '').trim();
    if (!isAuthenticated || !isKnownThemeId(profileTheme)) {
      return;
    }

    setThemeId((current) =>
      current === profileTheme ? current : profileTheme
    );
  }, [isAuthenticated, user?.uiTheme]);

  useEffect(() => {
    applyThemePreference(themeId);
    writeThemePreference(themeId);
  }, [themeId]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setNotifications([]);
      setUnreadCount(0);
      setNotificationsLoading(false);
      return;
    }

    refreshNotifications();
  }, [isAuthenticated, accessToken, refreshNotifications]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return undefined;

    const runPrefetch = () => {
      prefetchCoreData();
    };

    if (
      typeof window !== 'undefined' &&
      typeof window.requestIdleCallback === 'function'
    ) {
      const callbackId = window.requestIdleCallback(runPrefetch, {
        timeout: 1200
      });
      return () => {
        window.cancelIdleCallback(callbackId);
      };
    }

    const timeoutId = window.setTimeout(runPrefetch, 250);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isAuthenticated, accessToken, prefetchCoreData]);

  useEffect(() => {
    if (!isAuthenticated) {
      hasResolvedInitialTabRef.current = false;
      return;
    }
    if (hasResolvedInitialTabRef.current) return;

    const tabFromUrl = readTabFromUrl();
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
    hasResolvedInitialTabRef.current = true;
  }, [isAuthenticated, setActiveTab]);

  useEffect(() => {
    if (!isAuthenticated) return;
    writeTabToUrl(activeTab);
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    if (isAuthenticated) return;
    setInventoryEvents([]);
    setFinanceEvents([]);
    setAuthEvents([]);
    setPoEvents([]);
    setNotifications([]);
    setUnreadCount(0);
  }, [isAuthenticated]);

  useEffect(() => {
    setSession({
      userId: user?._id || null,
      role: user?.role || null,
      organizationId: user?.organization || null
    });
  }, [setSession, user]);

  const roleGuardFallback = useMemo(
    () => (
      <GuardFallback
        title="Access denied"
        description="Your role does not have permission to open this section."
      />
    ),
    []
  );

  const organizationGuardFallback = useMemo(
    () => (
      <GuardFallback
        title={t('app.organizationMissingTitle')}
        description={t('app.organizationMissingDescription')}
      />
    ),
    [t]
  );

  const page = useMemo(() => {
    const role = user?.role || null;
    const dashboardNode = (
      <Dashboard
        accessToken={accessToken}
        warehouseId={activeWarehouseId || null}
        inventoryEvents={inventoryEvents}
        financeEvents={financeEvents}
        authEvents={authEvents}
      />
    );

    if (activeTab === 'dashboard') {
      return dashboardNode;
    }
    if (activeTab === 'purchaseOrders') {
      return (
        <RequireRole
          role={role}
          allowedRoles={['owner', 'admin', 'manager']}
          fallback={roleGuardFallback}
        >
          <PurchaseOrders accessToken={accessToken} poEvents={poEvents} />
        </RequireRole>
      );
    }
    if (activeTab === 'products') {
      return (
        <Products
          accessToken={accessToken}
          userRole={role}
          warehouseId={activeWarehouseId || null}
        />
      );
    }
    if (activeTab === 'stocktakes') {
      return (
        <RequireRole
          role={role}
          allowedRoles={['owner', 'admin', 'manager']}
          fallback={roleGuardFallback}
        >
          <Stocktakes
            accessToken={accessToken}
            warehouseId={activeWarehouseId || null}
          />
        </RequireRole>
      );
    }
    if (activeTab === 'suppliers') {
      return (
        <RequireRole
          role={role}
          allowedRoles={['owner', 'admin', 'manager']}
          fallback={roleGuardFallback}
        >
          <Suppliers accessToken={accessToken} userRole={role} />
        </RequireRole>
      );
    }
    if (activeTab === 'reports') {
      return (
        <RequireRole
          role={role}
          allowedRoles={['owner', 'admin', 'manager']}
          fallback={roleGuardFallback}
        >
          <Reports accessToken={accessToken} userRole={role} />
        </RequireRole>
      );
    }
    if (activeTab === 'users') {
      return (
        <RequireRole
          role={role}
          allowedRoles={['owner', 'admin']}
          fallback={roleGuardFallback}
        >
          <Users
            accessToken={accessToken}
            userRole={role}
            currentUserId={user?._id || null}
          />
        </RequireRole>
      );
    }
    if (activeTab === 'account') {
      return (
        <Account
          user={user}
          onLoadSessions={listSessions}
          onRevokeSession={revokeSession}
          onLogoutOtherSessions={logoutOtherSessions}
          onGetTwoFactorStatus={getTwoFactorStatus}
          onSetupTwoFactor={setupTwoFactor}
          onEnableTwoFactor={enableTwoFactor}
          onDisableTwoFactor={disableTwoFactor}
          onRegenerateTwoFactorRecoveryCodes={regenerateTwoFactorRecoveryCodes}
          onExportComplianceData={exportComplianceData}
          onDeleteMyAccount={deleteMyAccount}
          onDeleteOrganization={deleteOrganization}
        />
      );
    }
    if (activeTab === 'settings') {
      return (
        <Settings
          accessToken={accessToken}
          userRole={role}
          themeId={themeId}
          onThemeChange={handleThemeChange}
        />
      );
    }
    return dashboardNode;
  }, [
    activeTab,
    accessToken,
    user,
    activeWarehouseId,
    inventoryEvents,
    financeEvents,
    authEvents,
    poEvents,
    themeId,
    handleThemeChange,
    getTwoFactorStatus,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    regenerateTwoFactorRecoveryCodes,
    exportComplianceData,
    deleteMyAccount,
    deleteOrganization,
    listSessions,
    revokeSession,
    logoutOtherSessions,
    roleGuardFallback
  ]);

  if (isInitializing) {
    return (
      <AuthLayout
        eyebrow={t('app.brand')}
        title={t('app.loadingSessionTitle')}
        description={t('app.loadingSessionDescription')}
      >
        <section className="auth-card">
          <p className="form-copy">{t('app.loadingSessionBody')}</p>
        </section>
      </AuthLayout>
    );
  }

  const unauthenticatedView = (
    <AuthLayout
      eyebrow={t('app.brand')}
      title={t('app.authIntroTitle')}
      description={t('app.authIntroDescription')}
    >
      <AuthForm
        onAdminSignIn={adminLogin}
        onEmployeeSignIn={employeeLogin}
        onSignUp={signup}
        onRequestEmailVerification={requestEmailVerification}
        onVerifyEmail={verifyEmail}
        onRequestPasswordReset={requestPasswordReset}
        onResetPassword={resetPassword}
        pendingTwoFactorLogin={pendingTwoFactorLogin}
        onVerifyTwoFactorLogin={verifyTwoFactorLogin}
        isLoading={isLoading}
        error={error}
        notice={notice}
      />
    </AuthLayout>
  );

  return (
    <RequireAuth
      isAuthenticated={isAuthenticated}
      fallback={unauthenticatedView}
    >
      <RequireOrganization
        hasOrganization={Boolean(user?.organization)}
        fallback={organizationGuardFallback}
      >
        <DashboardLayout
          companyName={companyName}
          warehouseId={activeWarehouseId}
          warehouseLabel={t('app.warehouseLabel')}
          warehousePlaceholder={t('app.warehousePlaceholder')}
          statusOnlineLabel={t('app.online')}
          statusOfflineLabel={t('app.offline')}
          queueLabel={t('app.queue')}
          signOutLabel={t('app.signOut')}
          onWarehouseChange={setActiveWarehouseId}
          isOnline={isOnline}
          offlineQueueSize={offlineQueueSize}
          notificationsNode={
            <NotificationBell
              count={unreadCount}
              items={notifications}
              isLoading={notificationsLoading}
              onRefresh={refreshNotifications}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onMarkRead={handleMarkNotificationRead}
            />
          }
          onLogout={logout}
          tabBarNode={
            <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          }
        >
          <Suspense
            fallback={
              <section className="panel">
                <article className="event-card">
                  <p className="event-sub">Loading section...</p>
                </article>
              </section>
            }
          >
            {page}
          </Suspense>
        </DashboardLayout>
      </RequireOrganization>
    </RequireAuth>
  );
};

export default App;
