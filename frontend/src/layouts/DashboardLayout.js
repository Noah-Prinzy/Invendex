import Button from '../ui/Button.js';
import Input from '../ui/Input.js';

const DashboardLayout = ({
  companyName = 'Organization',
  warehouseId = '',
  warehouseLabel = 'Warehouse',
  warehousePlaceholder = 'Optional warehouse id',
  statusOnlineLabel = 'Online',
  statusOfflineLabel = 'Offline',
  queueLabel = 'Queue',
  signOutLabel = 'Sign out',
  onWarehouseChange = () => {},
  isOnline = true,
  offlineQueueSize = 0,
  notificationsNode = null,
  onLogout = () => {},
  tabBarNode = null,
  children
}) => (
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
        <Input
          id="warehouseId"
          label={warehouseLabel}
          type="text"
          value={warehouseId}
          onChange={(event) => onWarehouseChange(event.target.value)}
          placeholder={warehousePlaceholder}
          wrapperClassName="warehouse-filter"
        />
        <p
          className={`section-note status-note ${isOnline ? 'online' : 'offline'}`}
          aria-live="polite"
        >
          {isOnline ? statusOnlineLabel : statusOfflineLabel} | {queueLabel}{' '}
          {offlineQueueSize}
        </p>
        {notificationsNode}
        <Button type="button" variant="ghost" onClick={onLogout}>
          {signOutLabel}
        </Button>
      </div>
    </header>
    {tabBarNode}
    <section className="app-body">{children}</section>
  </main>
);

export default DashboardLayout;
