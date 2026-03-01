import { useMemo, useState } from 'react';

export const APP_TABS = Object.freeze([
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'purchaseOrders', label: 'Purchase Orders' },
  { key: 'products', label: 'Products' },
  { key: 'stocktakes', label: 'Stocktakes' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'reports', label: 'Reports' },
  { key: 'users', label: 'Users' },
  { key: 'account', label: 'Account' },
  { key: 'settings', label: 'Settings' }
]);

const ADMIN_ROLES = new Set(['owner', 'admin']);
const EMPLOYEE_ALLOWED_TABS = new Set([
  'dashboard',
  'products',
  'account',
  'settings'
]);

export const useTabs = (userRole = null, initialKey = APP_TABS[0].key) => {
  const [activeTab, setActiveTab] = useState(initialKey);

  const normalizedRole = String(userRole || '').toLowerCase();
  const isAdmin = ADMIN_ROLES.has(normalizedRole);
  const visibleTabs = isAdmin
    ? APP_TABS
    : APP_TABS.filter((tab) => EMPLOYEE_ALLOWED_TABS.has(tab.key));

  const tabMap = useMemo(() => {
    const map = new Map();
    for (const tab of visibleTabs) {
      map.set(tab.key, tab);
    }
    return map;
  }, [visibleTabs]);

  const isValidTab = tabMap.has(activeTab);
  const resolvedTab = isValidTab
    ? activeTab
    : visibleTabs[0]?.key || APP_TABS[0].key;

  return {
    tabs: visibleTabs,
    activeTab: resolvedTab,
    setActiveTab
  };
};

export default useTabs;
