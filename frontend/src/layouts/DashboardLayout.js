import Button from '../ui/Button.js';
import Select from '../ui/Select.js';

const buildInventoryHeaderTitle = (companyName) => {
  const normalizedCompanyName = String(companyName || '').trim();
  if (!normalizedCompanyName) return 'Inventory';
  return `${normalizedCompanyName}'s Inventory`;
};

const DashboardLayout = ({
  companyName = 'Organization',
  warehouseId = '',
  warehouseOptions = [],
  warehouseDisabled = false,
  warehouseLabel = 'Warehouse',
  warehousePlaceholder = 'Select warehouse',
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
}) => {
  const brandTitle = buildInventoryHeaderTitle(companyName);

  return (
    <main className="app-layout">
      <header className="app-header">
        <div className="app-header-main">
          <div className="brand">
            <div
              className="brand-company-frame"
              data-tutorial-id="header-brand"
            >
              <h1 className="brand-company-name" title={brandTitle}>
                {brandTitle}
              </h1>
            </div>
          </div>
          <div className="header-actions">
            <p
              className={`section-note status-note header-action-item header-queue-indicator ${
                isOnline ? 'online' : 'offline'
              }`}
              aria-live="polite"
            >
              {isOnline ? statusOnlineLabel : statusOfflineLabel} | {queueLabel}{' '}
              {offlineQueueSize}
            </p>
            <div
              className="header-action-item header-notification"
              data-tutorial-id="header-notifications"
            >
              {notificationsNode}
            </div>
            <div
              className="header-action-item header-warehouse-selector"
              data-tutorial-id="header-warehouse"
            >
              <div className="warehouse-filter-shell">
                <Select
                  id="warehouseId"
                  className="warehouse-filter-select"
                  value={warehouseId}
                  onChange={(event) => onWarehouseChange(event.target.value)}
                  options={warehouseOptions}
                  disabled={warehouseDisabled}
                  aria-label={warehouseLabel || warehousePlaceholder}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="header-signout-btn"
              onClick={onLogout}
            >
              {signOutLabel}
            </Button>
          </div>
        </div>
        {tabBarNode ? (
          <div className="app-header-nav">
            {tabBarNode}
          </div>
        ) : null}
      </header>
      <section className="app-body">{children}</section>
    </main>
  );
};

export default DashboardLayout;
