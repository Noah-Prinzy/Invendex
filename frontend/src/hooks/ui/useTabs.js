import { useMemo, useState } from 'react';

export const APP_TABS = Object.freeze([
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'purchaseOrders', label: 'Purchase Orders' },
  { key: 'products', label: 'Products' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'reports', label: 'Reports' },
  { key: 'account', label: 'Account' },
  { key: 'settings', label: 'Settings' }
]);

export const useTabs = (initialKey = APP_TABS[0].key) => {
  const [activeTab, setActiveTab] = useState(initialKey);

  const tabMap = useMemo(() => {
    const map = new Map();
    for (const tab of APP_TABS) {
      map.set(tab.key, tab);
    }
    return map;
  }, []);

  const isValidTab = tabMap.has(activeTab);
  const resolvedTab = isValidTab ? activeTab : APP_TABS[0].key;

  return {
    tabs: APP_TABS,
    activeTab: resolvedTab,
    setActiveTab
  };
};

export default useTabs;
