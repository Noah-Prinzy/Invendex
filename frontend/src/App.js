import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthForm from './components/AuthForm.js';
import NotificationBell from './components/NotificationBell.js';
import TabBar from './components/TabBar.js';
import useAuth from './hooks/auth/useAuth.js';
import useTabs from './hooks/ui/useTabs.js';
import { useLedgerlyRealtime } from './hooks/realtime/useLedgerlyRealtime.js';
import Dashboard from './pages/Dashboard.js';
import PurchaseOrders from './pages/PurchaseOrders.js';
import Products from './pages/Products.js';
import Suppliers from './pages/Suppliers.js';
import Reports from './pages/Reports.js';
import Users from './pages/Users.js';
import Account from './pages/Account.js';
import Settings from './pages/Settings.js';
import { useAppActions, useAppState } from './state/appState.js';
import {
  flushOfflineMutations,
  getOfflineQueueSize
} from './offline/offlineQueue.js';
import { API_BASE_URL } from './api/client.js';
import './styles/global.css';
import './styles/dashboard.css';

const EVENT_LIMIT = 40;
const ADMIN_ROLES = new Set(['owner', 'admin']);
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
    logout
  } = useAuth();
  const { activeWarehouseId, isOnline, offlineQueueSize } = useAppState();
  const { setActiveWarehouseId, setIsOnline, setOfflineQueueSize, setSession } =
    useAppActions();
  const { tabs, activeTab, setActiveTab } = useTabs(user?.role || null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inventoryEvents, setInventoryEvents] = useState([]);
  const [financeEvents, setFinanceEvents] = useState([]);
  const [authEvents, setAuthEvents] = useState([]);
  const [poEvents, setPoEvents] = useState([]);

  const realtimeBaseUrl = useMemo(() => getRealtimeBaseUrl(), []);

  const handleInventoryUpdated = useCallback((payload) => {
    setInventoryEvents((current) =>
      prependEvent(current, buildInventoryEvent(payload, 'inventory.updated'))
    );
    setUnreadCount((count) => count + 1);
  }, []);

  const handleValuationUpdated = useCallback((payload) => {
    setFinanceEvents((current) =>
      prependEvent(
        current,
        buildFinanceEvent(payload, 'finance.valuation_updated')
      )
    );
    setUnreadCount((count) => count + 1);
  }, []);

  const handleCogsRecorded = useCallback((payload) => {
    setFinanceEvents((current) =>
      prependEvent(current, buildFinanceEvent(payload, 'finance.cogs_recorded'))
    );
    setUnreadCount((count) => count + 1);
  }, []);

  const handlePoCreated = useCallback((payload) => {
    setPoEvents((current) =>
      prependEvent(current, buildPurchaseOrderEvent(payload, 'created'))
    );
    setUnreadCount((count) => count + 1);
  }, []);

  const handlePoUpdated = useCallback((payload) => {
    setPoEvents((current) =>
      prependEvent(current, buildPurchaseOrderEvent(payload, 'updated'))
    );
    setUnreadCount((count) => count + 1);
  }, []);

  const handlePoReceived = useCallback((payload) => {
    setPoEvents((current) =>
      prependEvent(current, buildPurchaseOrderEvent(payload, 'received'))
    );
    setUnreadCount((count) => count + 1);
  }, []);

  const handleEmployeeSignedIn = useCallback(
    (payload) => {
      if (!ADMIN_ROLES.has(String(user?.role || '').toLowerCase())) {
        return;
      }
      setAuthEvents((current) =>
        prependEvent(current, buildAuthEvent(payload))
      );
      setUnreadCount((count) => count + 1);
    },
    [user?.role]
  );

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
    onEmployeeSignedIn: handleEmployeeSignedIn
  });

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  useEffect(() => {
    if (isAuthenticated) return;
    setInventoryEvents([]);
    setFinanceEvents([]);
    setAuthEvents([]);
    setPoEvents([]);
    setUnreadCount(0);
  }, [isAuthenticated]);

  useEffect(() => {
    setSession({
      userId: user?._id || null,
      role: user?.role || null,
      organizationId: user?.organization || null
    });
  }, [setSession, user]);

  useEffect(() => {
    setOfflineQueueSize(getOfflineQueueSize());
  }, [setOfflineQueueSize]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setIsOnline]);

  useEffect(() => {
    if (!isOnline || !isAuthenticated || !accessToken) {
      return;
    }

    let cancelled = false;
    const flush = async () => {
      const result = await flushOfflineMutations({
        accessToken,
        baseUrl: API_BASE_URL
      });
      if (cancelled) return;
      setOfflineQueueSize(Number(result?.remaining || 0));
    };

    flush().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOnline, isAuthenticated, accessToken, setOfflineQueueSize]);

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
    if (activeTab === 'account') return <Account user={user} />;
    if (activeTab === 'settings') return <Settings />;
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
    poEvents
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
          <h2>Warehouse operations with real-time visibility.</h2>
          <p>
            This frontend shell is now aligned with your backend realtime events
            and multi-tenant architecture. Sign in to open the dashboard
            workspace.
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
          <div className="logo-wrap">
            <img
              src="/assets/logo.png"
              alt="Ledgerly logo"
              className="brand-logo"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
            <div className="logo-fallback">L</div>
          </div>
          <div>
            <h1>Ledgerly</h1>
            <p>{user?.email || 'Signed in'}</p>
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
          <p className="section-note">
            {isOnline ? 'Online' : 'Offline'} | Queue {offlineQueueSize}
          </p>
          <NotificationBell count={unreadCount} onClick={clearUnread} />
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
