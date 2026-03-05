import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const APP_TABS = Object.freeze([
  { key: 'dashboard', labelKey: 'tabs.dashboard' },
  { key: 'purchaseOrders', labelKey: 'tabs.purchaseOrders' },
  { key: 'products', labelKey: 'tabs.products' },
  { key: 'stocktakes', labelKey: 'tabs.stocktakes' },
  { key: 'warehouses', labelKey: 'tabs.warehouses' },
  { key: 'suppliers', labelKey: 'tabs.suppliers' },
  { key: 'reports', labelKey: 'tabs.reports' },
  { key: 'users', labelKey: 'tabs.users' },
  { key: 'account', labelKey: 'tabs.account' },
  { key: 'settings', labelKey: 'tabs.settings' }
]);

const ADMIN_ROLES = new Set(['owner', 'admin']);
const EMPLOYEE_ALLOWED_TABS = new Set([
  'dashboard',
  'products',
  'account',
  'settings'
]);

export const useTabs = (userRole = null, initialKey = APP_TABS[0].key) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(initialKey);

  const normalizedRole = String(userRole || '').toLowerCase();
  const isAdmin = ADMIN_ROLES.has(normalizedRole);
  const visibleTabs = useMemo(() => {
    const sourceTabs = isAdmin
      ? APP_TABS
      : APP_TABS.filter((tab) => EMPLOYEE_ALLOWED_TABS.has(tab.key));
    return sourceTabs.map((tab) => ({
      ...tab,
      label: t(tab.labelKey)
    }));
  }, [isAdmin, t]);

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
