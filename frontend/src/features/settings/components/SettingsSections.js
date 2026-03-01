import { formatDateTime } from '../settingsUtils.js';
import { APP_THEMES, DEFAULT_THEME_ID } from '../../../themes/themeCatalog.js';

const isDisabled = (canManageSettings, isSaving) =>
  !canManageSettings || isSaving;

export const ThemeSelectionSection = ({ themeId, onThemeChange }) => (
  <article className="data-card settings-card">
    <h3>Theme Studio</h3>
    <p className="event-sub">
      Pick a visual theme. Your selection is saved for future visits.
    </p>
    <div className="theme-picker-grid">
      {APP_THEMES.map((theme) => {
        const isActive = String(themeId || '') === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            className={`theme-option-card ${isActive ? 'active' : ''}`}
            onClick={() => onThemeChange(theme.id)}
            aria-pressed={isActive}
          >
            <div className="theme-option-head">
              <p className="theme-option-title">{theme.label}</p>
              {isActive ? (
                <span className="theme-option-badge">Active</span>
              ) : null}
            </div>
            <p className="theme-option-description">{theme.description}</p>
            <div className="theme-swatch-row" aria-hidden="true">
              {theme.swatches.map((color) => (
                <span
                  key={`${theme.id}-${color}`}
                  className="theme-swatch"
                  style={{ background: color }}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
    <div className="theme-picker-actions">
      <button
        type="button"
        className="btn-ghost"
        onClick={() => onThemeChange(DEFAULT_THEME_ID)}
        disabled={String(themeId || '') === DEFAULT_THEME_ID}
      >
        Reset to default
      </button>
    </div>
  </article>
);

export const CompanyProfileSection = ({
  form,
  canManageSettings,
  isSaving,
  setTopField,
  setNestedField
}) => (
  <article className="data-card settings-card">
    <h3>1. Company Profile</h3>
    <div className="settings-grid">
      <label className="settings-field">
        <span>Organization name</span>
        <input
          type="text"
          value={form.organizationName}
          onChange={(event) =>
            setTopField('organizationName', event.target.value)
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-field">
        <span>Organization code</span>
        <input
          type="text"
          value={form.organizationCode}
          onChange={(event) =>
            setTopField('organizationCode', event.target.value)
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-field">
        <span>Timezone</span>
        <input
          type="text"
          value={form.companyProfile.timezone}
          onChange={(event) =>
            setNestedField('companyProfile', 'timezone', event.target.value)
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-field">
        <span>Currency code</span>
        <input
          type="text"
          value={form.companyProfile.currencyCode}
          onChange={(event) =>
            setNestedField(
              'companyProfile',
              'currencyCode',
              String(event.target.value || '').toUpperCase()
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-field">
        <span>Date format</span>
        <select
          value={form.companyProfile.dateFormat}
          onChange={(event) =>
            setNestedField('companyProfile', 'dateFormat', event.target.value)
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        >
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
        </select>
      </label>
      <label className="settings-field">
        <span>Default VAT %</span>
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={form.companyProfile.vatRateDefault}
          onChange={(event) =>
            setNestedField(
              'companyProfile',
              'vatRateDefault',
              Number(event.target.value || 0)
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
    </div>
  </article>
);

export const NotificationRulesSection = ({
  form,
  recipientsText,
  canManageSettings,
  isSaving,
  setNestedField,
  setDoubleNestedField,
  handleRecipientsChange
}) => (
  <article className="data-card settings-card">
    <h3>2. Notification Rules</h3>
    <div className="settings-grid">
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.notifications.lowStockEmailEnabled)}
          onChange={(event) =>
            setNestedField(
              'notifications',
              'lowStockEmailEnabled',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Low-stock email alerts</span>
      </label>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.notifications.lowStockSmsEnabled)}
          onChange={(event) =>
            setNestedField(
              'notifications',
              'lowStockSmsEnabled',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Low-stock SMS alerts</span>
      </label>
      <label className="settings-field settings-field-full">
        <span>Low-stock recipients (one per line)</span>
        <textarea
          rows={4}
          value={recipientsText}
          onChange={(event) => handleRecipientsChange(event.target.value)}
          disabled={isDisabled(canManageSettings, isSaving)}
          placeholder="email@company.com or +256700000000"
        />
      </label>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.notifications.quietHours.enabled)}
          onChange={(event) =>
            setDoubleNestedField(
              'notifications',
              'quietHours',
              'enabled',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Quiet hours enabled</span>
      </label>
      <label className="settings-field">
        <span>Quiet hours start</span>
        <input
          type="time"
          value={form.notifications.quietHours.start}
          onChange={(event) =>
            setDoubleNestedField(
              'notifications',
              'quietHours',
              'start',
              event.target.value
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-field">
        <span>Quiet hours end</span>
        <input
          type="time"
          value={form.notifications.quietHours.end}
          onChange={(event) =>
            setDoubleNestedField(
              'notifications',
              'quietHours',
              'end',
              event.target.value
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
    </div>
  </article>
);

export const InventoryControlsSection = ({
  form,
  canManageSettings,
  isSaving,
  setNestedField
}) => (
  <article className="data-card settings-card">
    <h3>3. Inventory Controls</h3>
    <div className="settings-grid">
      <label className="settings-field">
        <span>Default warehouse ID</span>
        <input
          type="text"
          value={form.inventory.defaultWarehouse}
          onChange={(event) =>
            setNestedField('inventory', 'defaultWarehouse', event.target.value)
          }
          disabled={isDisabled(canManageSettings, isSaving)}
          placeholder="Optional ObjectId"
        />
      </label>
      <label className="settings-field">
        <span>Dead stock threshold (days)</span>
        <input
          type="number"
          min="1"
          max="3650"
          value={form.inventory.deadStockThresholdDays}
          onChange={(event) =>
            setNestedField(
              'inventory',
              'deadStockThresholdDays',
              Number(event.target.value || 90)
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.inventory.enforceWarehouseForAdjustments)}
          onChange={(event) =>
            setNestedField(
              'inventory',
              'enforceWarehouseForAdjustments',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Require warehouse on manual adjustments</span>
      </label>
      <label className="settings-field">
        <span>Sensitive adjustment minimum role</span>
        <select
          value={form.inventory.sensitiveAdjustmentMinRole || 'manager'}
          onChange={(event) =>
            setNestedField(
              'inventory',
              'sensitiveAdjustmentMinRole',
              event.target.value
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        >
          <option value="staff">staff</option>
          <option value="manager">manager</option>
          <option value="admin">admin</option>
          <option value="owner">owner</option>
        </select>
      </label>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.inventory.allowNegativeStock)}
          onChange={(event) =>
            setNestedField(
              'inventory',
              'allowNegativeStock',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Allow negative stock</span>
      </label>
    </div>
  </article>
);

export const FinanceDefaultsSection = ({
  form,
  canManageSettings,
  isSaving,
  setNestedField
}) => (
  <article className="data-card settings-card">
    <h3>4. Finance Defaults</h3>
    <div className="settings-grid">
      <label className="settings-field">
        <span>Valuation method</span>
        <select
          value={form.finance.valuationMethod}
          onChange={(event) =>
            setNestedField('finance', 'valuationMethod', event.target.value)
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        >
          <option value="FIFO">FIFO</option>
          <option value="LIFO">LIFO</option>
          <option value="WEIGHTED_AVG">WEIGHTED_AVG</option>
        </select>
      </label>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.finance.taxInclusivePricing)}
          onChange={(event) =>
            setNestedField(
              'finance',
              'taxInclusivePricing',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Tax-inclusive pricing</span>
      </label>
    </div>
  </article>
);

export const UserAccessPolicySection = ({
  form,
  canManageSettings,
  isSaving,
  setNestedField
}) => (
  <article className="data-card settings-card">
    <h3>5. User Access Policy</h3>
    <div className="settings-grid">
      <label className="settings-field">
        <span>Default invite expiry (hours)</span>
        <input
          type="number"
          min="1"
          max="720"
          value={form.userAccess.defaultInviteExpiryHours}
          onChange={(event) =>
            setNestedField(
              'userAccess',
              'defaultInviteExpiryHours',
              Number(event.target.value || 72)
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-field">
        <span>Default employee role</span>
        <select
          value={form.userAccess.defaultEmployeeRole}
          onChange={(event) =>
            setNestedField(
              'userAccess',
              'defaultEmployeeRole',
              event.target.value
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        >
          <option value="staff">staff</option>
          <option value="manager">manager</option>
        </select>
      </label>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.userAccess.allowStaffProductCreation)}
          onChange={(event) =>
            setNestedField(
              'userAccess',
              'allowStaffProductCreation',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Allow staff to add products</span>
      </label>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.userAccess.allowStaffSoftDeleteOnly)}
          onChange={(event) =>
            setNestedField(
              'userAccess',
              'allowStaffSoftDeleteOnly',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Staff delete = soft-delete only</span>
      </label>
    </div>
  </article>
);

export const SecuritySessionSection = ({
  form,
  canManageSettings,
  isSaving,
  setNestedField
}) => (
  <article className="data-card settings-card">
    <h3>6. Security and Session</h3>
    <div className="settings-grid">
      <label className="settings-field">
        <span>Session idle timeout (minutes)</span>
        <input
          type="number"
          min="5"
          max="1440"
          value={form.securitySession.sessionIdleTimeoutMinutes}
          onChange={(event) =>
            setNestedField(
              'securitySession',
              'sessionIdleTimeoutMinutes',
              Number(event.target.value || 60)
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-field">
        <span>Refresh token TTL (days)</span>
        <input
          type="number"
          min="1"
          max="60"
          value={form.securitySession.refreshTokenTtlDays}
          onChange={(event) =>
            setNestedField(
              'securitySession',
              'refreshTokenTtlDays',
              Number(event.target.value || 7)
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-field">
        <span>Password minimum length</span>
        <input
          type="number"
          min="8"
          max="64"
          value={form.securitySession.passwordMinLength}
          onChange={(event) =>
            setNestedField(
              'securitySession',
              'passwordMinLength',
              Number(event.target.value || 8)
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-field">
        <span>Max login attempts</span>
        <input
          type="number"
          min="3"
          max="20"
          value={form.securitySession.loginMaxAttempts}
          onChange={(event) =>
            setNestedField(
              'securitySession',
              'loginMaxAttempts',
              Number(event.target.value || 5)
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-field">
        <span>Lockout duration (minutes)</span>
        <input
          type="number"
          min="1"
          max="120"
          value={form.securitySession.lockoutDurationMinutes}
          onChange={(event) =>
            setNestedField(
              'securitySession',
              'lockoutDurationMinutes',
              Number(event.target.value || 15)
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
    </div>
  </article>
);

export const RealtimeOfflineSection = ({
  form,
  canManageSettings,
  isSaving,
  setNestedField,
  realtimeEventStats
}) => (
  <article className="data-card settings-card">
    <h3>7. Realtime and Offline</h3>
    <div className="settings-grid">
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.realtimeOffline.realtimeEnabled)}
          onChange={(event) =>
            setNestedField(
              'realtimeOffline',
              'realtimeEnabled',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Realtime websocket updates</span>
      </label>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.realtimeOffline.autoReconnectEnabled)}
          onChange={(event) =>
            setNestedField(
              'realtimeOffline',
              'autoReconnectEnabled',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Auto-reconnect sockets</span>
      </label>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.realtimeOffline.offlineQueueAutoSync)}
          onChange={(event) =>
            setNestedField(
              'realtimeOffline',
              'offlineQueueAutoSync',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Offline queue auto-sync</span>
      </label>
      <label className="settings-field">
        <span>Offline retry (seconds)</span>
        <input
          type="number"
          min="5"
          max="600"
          value={form.realtimeOffline.offlineQueueRetrySeconds}
          onChange={(event) =>
            setNestedField(
              'realtimeOffline',
              'offlineQueueRetrySeconds',
              Number(event.target.value || 30)
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
    </div>
    <div className="obs-grid settings-inline-grid">
      <div className="obs-item">
        <p className="metric-label">Realtime events tracked</p>
        <p className="obs-value">{realtimeEventStats.length}</p>
      </div>
      <div className="obs-item">
        <p className="metric-label">Top event</p>
        <p className="obs-value monospace">
          {realtimeEventStats[0]?.event || 'n/a'}
        </p>
      </div>
      <div className="obs-item">
        <p className="metric-label">Top event count</p>
        <p className="obs-value">{Number(realtimeEventStats[0]?.count || 0)}</p>
      </div>
    </div>
  </article>
);

export const AuditBackupSection = ({
  form,
  canManageSettings,
  isSaving,
  setNestedField
}) => (
  <article className="data-card settings-card">
    <h3>8. Audit and Backup</h3>
    <div className="settings-grid">
      <label className="settings-field">
        <span>Audit retention (days)</span>
        <input
          type="number"
          min="30"
          max="3650"
          value={form.auditBackup.auditRetentionDays}
          onChange={(event) =>
            setNestedField(
              'auditBackup',
              'auditRetentionDays',
              Number(event.target.value || 365)
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-field">
        <span>Backup schedule</span>
        <select
          value={form.auditBackup.backupSchedule}
          onChange={(event) =>
            setNestedField('auditBackup', 'backupSchedule', event.target.value)
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        >
          <option value="daily">daily</option>
          <option value="weekly">weekly</option>
          <option value="monthly">monthly</option>
        </select>
      </label>
      <label className="settings-field">
        <span>Backup retention (days)</span>
        <input
          type="number"
          min="7"
          max="3650"
          value={form.auditBackup.backupRetentionDays}
          onChange={(event) =>
            setNestedField(
              'auditBackup',
              'backupRetentionDays',
              Number(event.target.value || 30)
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.auditBackup.requireRestoreApproval)}
          onChange={(event) =>
            setNestedField(
              'auditBackup',
              'requireRestoreApproval',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Require admin approval for restore</span>
      </label>
    </div>
  </article>
);

export const ObservabilityPipelineSection = ({
  lastCheckedAt,
  handleCopyTraceIds,
  copyTraceState,
  observabilityQuery,
  observabilityStatus,
  observabilitySummary,
  observabilityError,
  accessToken
}) => (
  <article className="event-card">
    <h3>Observability pipeline</h3>
    <div className="panel-head-row">
      <p className="event-sub">Last check: {formatDateTime(lastCheckedAt)}</p>
      <div className="obs-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={handleCopyTraceIds}
          disabled={!observabilityQuery.data?.trace?.requestId}
        >
          {copyTraceState === 'copied'
            ? 'Copied'
            : copyTraceState === 'error'
              ? 'Copy failed'
              : 'Copy trace IDs'}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => observabilityQuery.refetch()}
          disabled={observabilityQuery.isFetching || !accessToken}
        >
          {observabilityQuery.isFetching ? 'Checking...' : 'Refresh'}
        </button>
      </div>
    </div>

    {observabilityStatus === 'error' ? (
      <p className="form-error">
        {observabilityError || 'Observability ping failed'}
      </p>
    ) : null}

    <div className="obs-grid">
      <div className="obs-item">
        <p className="metric-label">Status</p>
        <p className={`obs-value ${observabilityStatus === 'ok' ? 'ok' : ''}`}>
          {observabilitySummary}
        </p>
      </div>
      <div className="obs-item">
        <p className="metric-label">Request ID</p>
        <p className="obs-value monospace">
          {observabilityQuery.data?.trace?.requestId || 'n/a'}
        </p>
      </div>
      <div className="obs-item">
        <p className="metric-label">Client trace ID</p>
        <p className="obs-value monospace">
          {observabilityQuery.data?.trace?.clientTraceId || 'n/a'}
        </p>
      </div>
      <div className="obs-item">
        <p className="metric-label">Realtime</p>
        <p className="obs-value">
          {observabilityQuery.data?.realtime?.enabled ? 'Enabled' : 'Disabled'}
        </p>
      </div>
      <div className="obs-item">
        <p className="metric-label">Error tracker</p>
        <p className="obs-value">
          {observabilityQuery.data?.errorTracking?.provider || 'n/a'}
        </p>
      </div>
      <div className="obs-item">
        <p className="metric-label">Uptime</p>
        <p className="obs-value">
          {Number.isFinite(observabilityQuery.data?.uptimeSeconds)
            ? `${observabilityQuery.data?.uptimeSeconds}s`
            : 'n/a'}
        </p>
      </div>
    </div>
  </article>
);

export const OnboardingSampleDataSection = ({
  canManageSettings,
  isSeeding,
  seedResult,
  seedError,
  onSeed
}) => (
  <article className="data-card settings-card">
    <h3>Onboarding and Sample Data</h3>
    <p className="event-sub">
      Seed a ready-to-demo baseline: warehouse, suppliers, products, and opening
      inventory.
    </p>
    <div className="obs-actions">
      <button
        type="button"
        className="btn-primary"
        onClick={() => onSeed(false)}
        disabled={!canManageSettings || isSeeding}
      >
        {isSeeding ? 'Seeding...' : 'Seed sample data'}
      </button>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => onSeed(true)}
        disabled={!canManageSettings || isSeeding}
      >
        Force re-seed
      </button>
    </div>

    {seedError ? <p className="form-error">{seedError}</p> : null}

    {seedResult ? (
      <div className="obs-grid settings-inline-grid">
        <div className="obs-item">
          <p className="metric-label">Status</p>
          <p className="obs-value">
            {seedResult.skipped ? 'Skipped' : 'Completed'}
          </p>
        </div>
        <div className="obs-item">
          <p className="metric-label">Seed version</p>
          <p className="obs-value monospace">
            {seedResult.seedVersion || 'n/a'}
          </p>
        </div>
        <div className="obs-item">
          <p className="metric-label">Suppliers created</p>
          <p className="obs-value">
            {Number(seedResult.summary?.suppliersCreated || 0)}
          </p>
        </div>
        <div className="obs-item">
          <p className="metric-label">Products created</p>
          <p className="obs-value">
            {Number(seedResult.summary?.productsCreated || 0)}
          </p>
        </div>
        <div className="obs-item">
          <p className="metric-label">Inventory rows created</p>
          <p className="obs-value">
            {Number(seedResult.summary?.inventoryRowsCreated || 0)}
          </p>
        </div>
        <div className="obs-item">
          <p className="metric-label">Seeded at</p>
          <p className="obs-value">
            {seedResult.seededAt ? formatDateTime(seedResult.seededAt) : 'n/a'}
          </p>
        </div>
      </div>
    ) : null}
  </article>
);

export const SettingsSaveFooter = ({
  updatedAt,
  isDirty,
  handleReset,
  handleSave,
  canManageSettings,
  isSaving,
  isLoadingSettings
}) => (
  <footer className="settings-action-row">
    <p className="event-sub">
      Last updated: {formatDateTime(updatedAt)}{' '}
      {isDirty ? ' | Unsaved changes' : ''}
    </p>
    <div className="obs-actions">
      <button
        type="button"
        className="btn-ghost"
        onClick={handleReset}
        disabled={!isDirty || isSaving}
      >
        Reset changes
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={handleSave}
        disabled={
          !canManageSettings || !isDirty || isSaving || isLoadingSettings
        }
      >
        {isSaving ? 'Saving...' : 'Save settings'}
      </button>
    </div>
  </footer>
);
