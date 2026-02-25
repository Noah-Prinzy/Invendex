import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import Account from './pages/Account.js';
import Settings from './pages/Settings.js';
import './styles/global.css';
import './styles/dashboard.css';

const EVENT_LIMIT = 40;

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
    title: eventName === 'finance.cogs_recorded' ? 'COGS recorded' : 'Valuation updated',
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

const prependEvent = (list, event) => [event, ...list].slice(0, EVENT_LIMIT);

const App = () => {
  const { tabs, activeTab, setActiveTab } = useTabs();
  const {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    isInitializing,
    error,
    notice,
    login,
    signup,
    logout
  } = useAuth();
  const [warehouseId, setWarehouseId] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [inventoryEvents, setInventoryEvents] = useState([]);
  const [financeEvents, setFinanceEvents] = useState([]);
  const [poEvents, setPoEvents] = useState([]);

  const realtimeBaseUrl = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : ''),
    []
  );

  const handleInventoryUpdated = useCallback(payload => {
    setInventoryEvents(current =>
      prependEvent(current, buildInventoryEvent(payload, 'inventory.updated'))
    );
    setUnreadCount(count => count + 1);
  }, []);

  const handleValuationUpdated = useCallback(payload => {
    setFinanceEvents(current =>
      prependEvent(current, buildFinanceEvent(payload, 'finance.valuation_updated'))
    );
    setUnreadCount(count => count + 1);
  }, []);

  const handleCogsRecorded = useCallback(payload => {
    setFinanceEvents(current =>
      prependEvent(current, buildFinanceEvent(payload, 'finance.cogs_recorded'))
    );
    setUnreadCount(count => count + 1);
  }, []);

  const handlePoCreated = useCallback(payload => {
    setPoEvents(current => prependEvent(current, buildPurchaseOrderEvent(payload, 'created')));
    setUnreadCount(count => count + 1);
  }, []);

  const handlePoUpdated = useCallback(payload => {
    setPoEvents(current => prependEvent(current, buildPurchaseOrderEvent(payload, 'updated')));
    setUnreadCount(count => count + 1);
  }, []);

  const handlePoReceived = useCallback(payload => {
    setPoEvents(current => prependEvent(current, buildPurchaseOrderEvent(payload, 'received')));
    setUnreadCount(count => count + 1);
  }, []);

  useLedgerlyRealtime({
    baseUrl: realtimeBaseUrl,
    accessToken,
    warehouseId: warehouseId || null,
    onInventoryUpdated: handleInventoryUpdated,
    onPurchaseOrderCreated: handlePoCreated,
    onPurchaseOrderUpdated: handlePoUpdated,
    onPurchaseOrderReceived: handlePoReceived,
    onCogsRecorded: handleCogsRecorded,
    onValuationUpdated: handleValuationUpdated
  });

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  useEffect(() => {
    if (isAuthenticated) return;
    setInventoryEvents([]);
    setFinanceEvents([]);
    setPoEvents([]);
    setUnreadCount(0);
  }, [isAuthenticated]);

  const page = useMemo(() => {
    if (activeTab === 'dashboard') {
      return (
        <Dashboard
          warehouseId={warehouseId || null}
          inventoryEvents={inventoryEvents}
          financeEvents={financeEvents}
        />
      );
    }
    if (activeTab === 'purchaseOrders') {
      return <PurchaseOrders poEvents={poEvents} />;
    }
    if (activeTab === 'products') {
      return <Products accessToken={accessToken} userRole={user?.role || null} />;
    }
    if (activeTab === 'suppliers') {
      return <Suppliers accessToken={accessToken} userRole={user?.role || null} />;
    }
    if (activeTab === 'reports') {
      return <Reports accessToken={accessToken} userRole={user?.role || null} />;
    }
    if (activeTab === 'account') return <Account user={user} />;
    if (activeTab === 'settings') return <Settings />;
    return (
      <Dashboard
        warehouseId={warehouseId || null}
        inventoryEvents={inventoryEvents}
        financeEvents={financeEvents}
      />
    );
  }, [activeTab, accessToken, user, warehouseId, inventoryEvents, financeEvents, poEvents]);

  if (isInitializing) {
    return (
      <main className="auth-layout">
        <section className="auth-intro">
          <p className="eyebrow">Ledgerly</p>
          <h2>Loading session...</h2>
          <p>Validating your access token and organization context.</p>
        </section>
        <section className="auth-card">
          <p className="form-copy">Please wait while we restore your session.</p>
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
            This frontend shell is now aligned with your backend realtime events and multi-tenant
            architecture. Sign in to open the dashboard workspace.
          </p>
        </section>
        <AuthForm
          onSignIn={login}
          onSignUp={signup}
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
              onError={event => {
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
              value={warehouseId}
              onChange={event => setWarehouseId(event.target.value)}
              placeholder="Optional warehouse id"
            />
          </label>
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
