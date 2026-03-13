import DashboardLayout from '../layouts/DashboardLayout.js';
import TabBar from './TabBar.js';

import '../styles/dashboard.css';

const AuthenticatedDashboardShell = ({
  companyName,
  warehouseId,
  warehouseOptions,
  warehouseDisabled,
  warehouseLabel,
  warehousePlaceholder,
  statusOnlineLabel,
  statusOfflineLabel,
  queueLabel,
  signOutLabel,
  onWarehouseChange,
  isOnline,
  offlineQueueSize,
  notificationsNode,
  onLogout,
  tabs,
  activeTab,
  onTabChange,
  children
}) => (
  <DashboardLayout
    companyName={companyName}
    warehouseId={warehouseId}
    warehouseOptions={warehouseOptions}
    warehouseDisabled={warehouseDisabled}
    warehouseLabel={warehouseLabel}
    warehousePlaceholder={warehousePlaceholder}
    statusOnlineLabel={statusOnlineLabel}
    statusOfflineLabel={statusOfflineLabel}
    queueLabel={queueLabel}
    signOutLabel={signOutLabel}
    onWarehouseChange={onWarehouseChange}
    isOnline={isOnline}
    offlineQueueSize={offlineQueueSize}
    notificationsNode={notificationsNode}
    onLogout={onLogout}
    tabBarNode={
      <TabBar tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
    }
  >
    {children}
  </DashboardLayout>
);

export default AuthenticatedDashboardShell;
