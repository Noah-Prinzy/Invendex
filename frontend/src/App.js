import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuthForm from './components/AuthForm.js';
import NotificationBell from './components/NotificationBell.js';
import TabBar from './components/TabBar.js';
import useAuth from './hooks/auth/useAuth.js';
import useTabs from './hooks/ui/useTabs.js';
import { useLedgerlyRealtime } from './hooks/realtime/useLedgerlyRealtime.js';
import { useOfflineSync } from './hooks/offline/useOfflineSync.js';
import Dashboard from './pages/Dashboard.js';
import PurchaseOrders from './pages/PurchaseOrders.js';
import Products from './pages/Products.js';
import Suppliers from './pages/Suppliers.js';
import Reports from './pages/Reports.js';
import Users from './pages/Users.js';
import Stocktakes from './pages/Stocktakes.js';
import Account from './pages/Account.js';
import Settings from './pages/Settings.js';
import { useAppActions, useAppState } from './state/appState.js';
import {
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

const App = () => {
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
    return 'Organization';
  }, [user]);

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

  const page = useMemo(() => {
    if (activeTab === 'dashboard') {
      return (
        <Dashboard
          accessToken={accessToken}
          warehouseId={activeWarehouseId || null}
          inventoryEvents={inventoryEvents}
          financeEvents={financeEvents}
          authEvents={authEvents}
        />
      );
    }
    if (activeTab === 'purchaseOrders') {
      return <PurchaseOrders accessToken={accessToken} poEvents={poEvents} />;
    }
    if (activeTab === 'products') {
      return (
        <Products
          accessToken={accessToken}
          userRole={user?.role || null}
          warehouseId={activeWarehouseId || null}
        />
      );
    }
    if (activeTab === 'stocktakes') {
      return (
        <Stocktakes
          accessToken={accessToken}
          warehouseId={activeWarehouseId || null}
        />
      );
    }
    if (activeTab === 'suppliers') {
      return (
        <Suppliers accessToken={accessToken} userRole={user?.role || null} />
      );
    }
    if (activeTab === 'reports') {
      return (
        <Reports accessToken={accessToken} userRole={user?.role || null} />
      );
    }
    if (activeTab === 'users') {
      return (
        <Users
          accessToken={accessToken}
          userRole={user?.role || null}
          currentUserId={user?._id || null}
        />
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
          userRole={user?.role || null}
          themeId={themeId}
          onThemeChange={handleThemeChange}
        />
      );
    }
    return (
      <Dashboard
        accessToken={accessToken}
        warehouseId={activeWarehouseId || null}
        inventoryEvents={inventoryEvents}
        financeEvents={financeEvents}
        authEvents={authEvents}
      />
    );
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
    logoutOtherSessions
  ]);

  if (isInitializing) {
    return (
      <main className="auth-layout">
        <section className="auth-intro">
          <p className="eyebrow">Ledgerly</p>
          <h2>Loading session...</h2>
          <p>Validating your access token and organization context.</p>
        </section>
        <section className="auth-card">
          <p className="form-copy">
            Please wait while we restore your session.
          </p>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="auth-layout">
        <section className="auth-intro">
          <p className="eyebrow">Ledgerly</p>
          <h2>Modern inventory control for fast-moving operations.</h2>
          <p>
            Coordinate purchasing, stock movement, and finance signals from one
            workspace with live event visibility and tenant-safe controls.
          </p>
        </section>
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
      </main>
    );
  }

  return (
    <main className="app-layout">
      <header className="app-header">
        <div className="brand">
          <div className="brand-company-frame">
            <h1 className="brand-company-name" title={companyName}>
              {companyName}
            </h1>
          </div>
        </div>
        <div className="header-actions">
          <label className="warehouse-filter" htmlFor="warehouseId">
            Warehouse
            <input
              id="warehouseId"
              type="text"
              value={activeWarehouseId}
              onChange={(event) => setActiveWarehouseId(event.target.value)}
              placeholder="Optional warehouse id"
            />
          </label>
          <p
            className={`section-note status-note ${isOnline ? 'online' : 'offline'}`}
          >
            {isOnline ? 'Online' : 'Offline'} | Queue {offlineQueueSize}
          </p>
          <NotificationBell
            count={unreadCount}
            items={notifications}
            isLoading={notificationsLoading}
            onRefresh={refreshNotifications}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onMarkRead={handleMarkNotificationRead}
          />
          <button type="button" className="btn-ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <section className="app-body">{page}</section>
    </main>
  );
};

export default App;
