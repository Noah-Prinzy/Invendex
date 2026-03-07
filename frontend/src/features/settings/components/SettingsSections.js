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
  currentUserEmail,
  notificationMobileNumber,
  contactNotice,
  contactError,
  contactSaving,
  canManageSettings,
  canEditNotificationContacts,
  isSaving,
  setNestedField,
  setDoubleNestedField,
  onNotificationMobileNumberChange,
  onSaveNotificationContact
}) => (
  <article className="data-card settings-card">
    <h3>2. Notification Rules</h3>
    <div className="settings-contact-grid">
      <section className="settings-contact-card">
        <div className="settings-contact-head">
          <div>
            <p className="settings-contact-label">Email delivery</p>
            <p className="settings-contact-value">
              {String(currentUserEmail || '').trim() || 'No email connected'}
            </p>
          </div>
          <span
            className={`settings-contact-badge ${String(currentUserEmail || '').trim() ? 'connected' : 'missing'}`}
          >
            {String(currentUserEmail || '').trim() ? 'Connected' : 'Missing'}
          </span>
        </div>
        <p className="event-sub">
          Your sign-up email is used automatically for email alerts.
        </p>
      </section>

      <section className="settings-contact-card">
        <div className="settings-contact-head">
          <div>
            <p className="settings-contact-label">Mobile delivery</p>
            <p className="settings-contact-value">
              {String(notificationMobileNumber || '').trim() ||
                'No mobile number connected'}
            </p>
          </div>
          <span
            className={`settings-contact-badge ${String(notificationMobileNumber || '').trim() ? 'connected' : 'missing'}`}
          >
            {String(notificationMobileNumber || '').trim()
              ? 'Connected'
              : 'Missing'}
          </span>
        </div>
        <p className="event-sub">
          SMS and WhatsApp alerts use your saved mobile number.
        </p>
        <div className="settings-contact-edit-row">
          <label className="settings-field settings-field-full">
            <span>Update mobile number</span>
            <input
              type="tel"
              value={notificationMobileNumber}
              onChange={(event) =>
                onNotificationMobileNumberChange(event.target.value)
              }
              disabled={!canEditNotificationContacts || contactSaving}
              placeholder="+256700000000"
            />
          </label>
          <button
            type="button"
            className="btn-ghost aligned-action-btn"
            onClick={onSaveNotificationContact}
            disabled={!canEditNotificationContacts || contactSaving}
          >
            {contactSaving ? 'Saving...' : 'Save mobile number'}
          </button>
        </div>
        {contactNotice ? <p className="section-note">{contactNotice}</p> : null}
        {contactError ? <p className="form-error">{contactError}</p> : null}
      </section>
    </div>

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
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.notifications.lowStockWhatsappEnabled)}
          onChange={(event) =>
            setNestedField(
              'notifications',
              'lowStockWhatsappEnabled',
              event.target.checked
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Low-stock WhatsApp alerts</span>
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
  setNestedField,
  warehouseOptions = [],
  warehouseOptionsLoading = false,
  warehouseOptionsError = ''
}) => {
  const currentDefaultWarehouse = String(
    form?.inventory?.defaultWarehouse || ''
  ).trim();
  const hasCurrentInOptions = warehouseOptions.some(
    (option) => String(option?.value || '') === currentDefaultWarehouse
  );

  return (
    <article className="data-card settings-card">
      <h3>3. Inventory Controls</h3>
      <div className="settings-grid">
        <label className="settings-field">
          <span>Default warehouse</span>
          <select
            value={form.inventory.defaultWarehouse}
            onChange={(event) =>
              setNestedField(
                'inventory',
                'defaultWarehouse',
                event.target.value
              )
            }
            disabled={
              isDisabled(canManageSettings, isSaving) || warehouseOptionsLoading
            }
            title="Choose the default warehouse for new inventory workflows."
          >
            <option value="">
              {warehouseOptionsLoading
                ? 'Loading warehouses...'
                : 'Select default warehouse'}
            </option>
            {!hasCurrentInOptions && currentDefaultWarehouse ? (
              <option value={currentDefaultWarehouse}>
                Current (unavailable): {currentDefaultWarehouse}
              </option>
            ) : null}
            {warehouseOptions.map((warehouse) => (
              <option key={warehouse.value} value={warehouse.value}>
                {warehouse.label}
              </option>
            ))}
          </select>
        </label>
        {warehouseOptionsError ? (
          <p className="form-error settings-field-full">
            {warehouseOptionsError}
          </p>
        ) : null}
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
};

export const FinanceDefaultsSection = ({
  form,
  canManageSettings,
  isSaving,
  setNestedField,
  baseCurrencyCode = 'UGX',
  availableDisplayCurrencyCodes = [],
  exchangeRates = [],
  exchangeRatesLoading = false,
  exchangeRatesError = ''
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
      <label className="settings-field">
        <span>App display currency</span>
        <select
          value={
            String(
              form.finance.displayCurrencyCode ||
                form.companyProfile.currencyCode ||
                baseCurrencyCode
            )
              .trim()
              .toUpperCase() || baseCurrencyCode
          }
          onChange={(event) =>
            setNestedField(
              'finance',
              'displayCurrencyCode',
              String(event.target.value || '')
                .trim()
                .toUpperCase()
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        >
          {availableDisplayCurrencyCodes.map((currencyCode) => (
            <option
              key={`display-currency-${currencyCode}`}
              value={currencyCode}
            >
              {currencyCode}
            </option>
          ))}
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
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={Boolean(form.finance.importTaxEnabled)}
          onChange={(event) =>
            setNestedField('finance', 'importTaxEnabled', event.target.checked)
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
        <span>Apply import tax to landed cost</span>
      </label>
      <label className="settings-field">
        <span>Import tax rate (%)</span>
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={Number(form.finance.importTaxRate || 0)}
          onChange={(event) =>
            setNestedField(
              'finance',
              'importTaxRate',
              Number(event.target.value || 0)
            )
          }
          disabled={isDisabled(canManageSettings, isSaving)}
        />
      </label>
      <div className="settings-field settings-field-full">
        <p className="event-sub">
          Base currency: <strong>{baseCurrencyCode}</strong>
        </p>
        <p className="event-sub">
          Display currency drives money formatting across products, dashboard,
          and reports.
        </p>
        <p className="event-sub">
          Live FX rate auto-sync runs when you save and display currency differs
          from base.
        </p>
      </div>
    </div>
    {exchangeRatesError ? (
      <p className="form-error">{exchangeRatesError}</p>
    ) : null}
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Base</th>
            <th>Quote</th>
            <th>Rate</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {exchangeRatesLoading ? (
            <tr>
              <td colSpan={4}>Loading exchange rates...</td>
            </tr>
          ) : exchangeRates.length ? (
            exchangeRates.map((row) => (
              <tr
                key={`${row.quoteCurrencyCode}-${row.id || row.updatedAt || ''}`}
              >
                <td>{baseCurrencyCode}</td>
                <td>{row.quoteCurrencyCode}</td>
                <td>{Number(row.rate || 0).toFixed(6)}</td>
                <td>{row.source || 'MANUAL'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>No exchange rates configured yet.</td>
            </tr>
          )}
        </tbody>
      </table>
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
          className="btn-ghost aligned-action-btn"
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

export const OnboardingLaunchWizardSection = ({
  canManageSettings,
  onboardingStatus,
  onboardingStatusLoading,
  onRefreshStatus,
  warehouseForm,
  onWarehouseFieldChange,
  onCreateWarehouse,
  creatingWarehouse,
  warehouseError,
  warehouseResult,
  inviteEmail,
  onInviteEmailChange,
  onCreateInvite,
  inviting,
  inviteError,
  inviteResult,
  isSeeding,
  seedResult,
  seedError,
  onSeed
}) => (
  <article className="data-card settings-card">
    <h3>Onboarding Launch Wizard</h3>
    <p className="event-sub">
      Complete first-launch setup: warehouse, invite teammate, and optional
      sample data.
    </p>

    <div className="panel-head-row">
      <p className="event-sub">
        {onboardingStatusLoading
          ? 'Checking onboarding progress...'
          : `Progress: ${Number(onboardingStatus?.progress?.completedSteps || 0)}/${Number(
              onboardingStatus?.progress?.totalSteps || 0
            )} steps (${Number(onboardingStatus?.progress?.completionPercent || 0)}%)`}
      </p>
      <button
        type="button"
        className="btn-ghost aligned-action-btn"
        onClick={onRefreshStatus}
        disabled={onboardingStatusLoading}
      >
        {onboardingStatusLoading ? 'Refreshing...' : 'Refresh progress'}
      </button>
    </div>

    {Array.isArray(onboardingStatus?.steps) ? (
      <div className="obs-grid settings-inline-grid">
        {onboardingStatus.steps.map((step) => (
          <div key={step.id} className="obs-item">
            <p className="metric-label">{step.title}</p>
            <p className={`obs-value ${step.completed ? 'ok' : ''}`}>
              {step.completed ? 'Completed' : 'Pending'}
            </p>
          </div>
        ))}
      </div>
    ) : null}

    <div className="settings-grid">
      <label className="settings-field">
        <span>Warehouse name</span>
        <input
          type="text"
          value={warehouseForm.name}
          onChange={(event) =>
            onWarehouseFieldChange('name', event.target.value)
          }
          disabled={!canManageSettings || creatingWarehouse}
          placeholder="Main Warehouse"
        />
      </label>
      <label className="settings-field">
        <span>Warehouse code (optional)</span>
        <input
          type="text"
          value={warehouseForm.code}
          onChange={(event) =>
            onWarehouseFieldChange('code', event.target.value)
          }
          disabled={!canManageSettings || creatingWarehouse}
          placeholder="MAIN"
        />
      </label>
      <label className="settings-field">
        <span>Region (optional)</span>
        <input
          type="text"
          value={warehouseForm.region}
          onChange={(event) =>
            onWarehouseFieldChange('region', event.target.value)
          }
          disabled={!canManageSettings || creatingWarehouse}
          placeholder="Kampala"
        />
      </label>
      <div className="settings-field settings-field-full">
        <button
          type="button"
          className="btn-primary"
          onClick={onCreateWarehouse}
          disabled={!canManageSettings || creatingWarehouse}
        >
          {creatingWarehouse
            ? 'Creating warehouse...'
            : 'Create first warehouse'}
        </button>
      </div>
    </div>

    {warehouseError ? <p className="form-error">{warehouseError}</p> : null}
    {warehouseResult ? (
      <p className="section-note">
        Warehouse created: <strong>{warehouseResult.name}</strong> (
        {warehouseResult.code})
      </p>
    ) : null}

    <div className="settings-grid">
      <label className="settings-field settings-field-full">
        <span>Invite teammate email</span>
        <input
          type="email"
          value={inviteEmail}
          onChange={(event) => onInviteEmailChange(event.target.value)}
          disabled={!canManageSettings || inviting}
          placeholder="employee@company.com"
        />
      </label>
      <div className="settings-field settings-field-full">
        <button
          type="button"
          className="btn-ghost"
          onClick={onCreateInvite}
          disabled={!canManageSettings || inviting}
        >
          {inviting ? 'Creating invite...' : 'Create teammate invite'}
        </button>
      </div>
    </div>

    {inviteError ? <p className="form-error">{inviteError}</p> : null}
    {inviteResult ? (
      <p className="section-note">
        Invite code: <strong>{inviteResult.inviteCode}</strong>
      </p>
    ) : null}

    <p className="event-sub">
      Optional: seed a ready-to-demo baseline with suppliers, products, and
      opening inventory.
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
