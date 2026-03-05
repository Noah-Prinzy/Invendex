export const SETTINGS_MANAGE_ROLES = new Set(['owner', 'admin', 'manager']);
export const OBS_STALE_MS = 45 * 1000;
export const SETTINGS_QUERY_STALE_MS = 60 * 1000;

export const formatDateTime = (iso) => {
  if (!iso) return 'n/a';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleString();
};

export const normalizeRecipients = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .slice(0, 20);
};

export const parseRecipientsText = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return [];
  return normalizeRecipients(
    normalized
      .split(/[\n,]/g)
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
  );
};

export const recipientsToText = (value) =>
  normalizeRecipients(value).join('\n');

export const getDefaultSettings = () => ({
  organizationName: '',
  organizationCode: '',
  companyProfile: {
    timezone: 'UTC',
    currencyCode: 'UGX',
    dateFormat: 'YYYY-MM-DD',
    vatRateDefault: 18
  },
  notifications: {
    lowStockEmailEnabled: false,
    lowStockSmsEnabled: false,
    lowStockRecipients: [],
    lowStockSmsRecipients: [],
    lowStockWhatsappEnabled: false,
    lowStockWhatsappRecipients: [],
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '06:00'
    }
  },
  inventory: {
    defaultWarehouse: '',
    enforceWarehouseForAdjustments: true,
    sensitiveAdjustmentMinRole: 'manager',
    allowNegativeStock: false,
    deadStockThresholdDays: 90
  },
  finance: {
    valuationMethod: 'WEIGHTED_AVG',
    displayCurrencyCode: 'UGX',
    taxInclusivePricing: false,
    importTaxEnabled: false,
    importTaxRate: 0
  },
  userAccess: {
    defaultInviteExpiryHours: 72,
    defaultEmployeeRole: 'staff',
    allowStaffProductCreation: true,
    allowStaffSoftDeleteOnly: true
  },
  securitySession: {
    sessionIdleTimeoutMinutes: 60,
    refreshTokenTtlDays: 7,
    passwordMinLength: 8,
    loginMaxAttempts: 5,
    lockoutDurationMinutes: 15
  },
  realtimeOffline: {
    realtimeEnabled: true,
    autoReconnectEnabled: true,
    offlineQueueAutoSync: true,
    offlineQueueRetrySeconds: 30
  },
  auditBackup: {
    auditRetentionDays: 365,
    backupSchedule: 'daily',
    backupRetentionDays: 30,
    requireRestoreApproval: true
  },
  updatedAt: null
});

export const mapApiSettingsToForm = (payload) => {
  const defaults = getDefaultSettings();
  if (!payload || typeof payload !== 'object') {
    return defaults;
  }

  const incomingCompanyProfile =
    payload.companyProfile && typeof payload.companyProfile === 'object'
      ? payload.companyProfile
      : {};
  const incomingFinance =
    payload.finance && typeof payload.finance === 'object'
      ? payload.finance
      : {};
  const normalizedCurrencyCode =
    String(
      incomingCompanyProfile.currencyCode ||
        defaults.companyProfile.currencyCode
    )
      .trim()
      .toUpperCase() || defaults.companyProfile.currencyCode;
  const normalizedDisplayCurrencyCode =
    String(incomingFinance.displayCurrencyCode || normalizedCurrencyCode)
      .trim()
      .toUpperCase() || normalizedCurrencyCode;

  return {
    ...defaults,
    organizationName: String(payload.organizationName || '').trim(),
    organizationCode: String(payload.organizationCode || '').trim(),
    companyProfile: {
      ...defaults.companyProfile,
      ...incomingCompanyProfile,
      currencyCode: normalizedCurrencyCode
    },
    notifications: {
      ...defaults.notifications,
      ...(payload.notifications || {}),
      lowStockRecipients: normalizeRecipients(
        payload.notifications?.lowStockRecipients
      ),
      lowStockSmsRecipients: normalizeRecipients(
        payload.notifications?.lowStockSmsRecipients ||
          payload.notifications?.lowStockRecipients
      ),
      lowStockWhatsappEnabled: Boolean(
        payload.notifications?.lowStockWhatsappEnabled
      ),
      lowStockWhatsappRecipients: normalizeRecipients(
        payload.notifications?.lowStockWhatsappRecipients
      ),
      quietHours: {
        ...defaults.notifications.quietHours,
        ...(payload.notifications?.quietHours || {})
      }
    },
    inventory: {
      ...defaults.inventory,
      ...(payload.inventory || {}),
      defaultWarehouse: String(payload.inventory?.defaultWarehouse || '').trim()
    },
    finance: {
      ...defaults.finance,
      ...incomingFinance,
      displayCurrencyCode: normalizedDisplayCurrencyCode
    },
    userAccess: {
      ...defaults.userAccess,
      ...(payload.userAccess || {})
    },
    securitySession: {
      ...defaults.securitySession,
      ...(payload.securitySession || {})
    },
    realtimeOffline: {
      ...defaults.realtimeOffline,
      ...(payload.realtimeOffline || {})
    },
    auditBackup: {
      ...defaults.auditBackup,
      ...(payload.auditBackup || {})
    },
    updatedAt: payload.updatedAt || null
  };
};

export const mapFormToApiPayload = (form) => ({
  organizationName: String(form.organizationName || '').trim(),
  organizationCode: String(form.organizationCode || '')
    .trim()
    .toUpperCase(),
  companyProfile: {
    timezone: String(form.companyProfile?.timezone || '').trim() || 'UTC',
    currencyCode:
      String(form.companyProfile?.currencyCode || '')
        .trim()
        .toUpperCase() || 'UGX',
    dateFormat: String(form.companyProfile?.dateFormat || 'YYYY-MM-DD'),
    vatRateDefault: Number(form.companyProfile?.vatRateDefault || 0)
  },
  notifications: {
    lowStockEmailEnabled: Boolean(form.notifications?.lowStockEmailEnabled),
    lowStockSmsEnabled: Boolean(form.notifications?.lowStockSmsEnabled),
    lowStockRecipients: normalizeRecipients(
      form.notifications?.lowStockRecipients
    ),
    quietHours: {
      enabled: Boolean(form.notifications?.quietHours?.enabled),
      start: String(form.notifications?.quietHours?.start || '22:00'),
      end: String(form.notifications?.quietHours?.end || '06:00')
    }
  },
  inventory: {
    defaultWarehouse:
      String(form.inventory?.defaultWarehouse || '').trim() || null,
    enforceWarehouseForAdjustments: Boolean(
      form.inventory?.enforceWarehouseForAdjustments
    ),
    sensitiveAdjustmentMinRole: String(
      form.inventory?.sensitiveAdjustmentMinRole || 'manager'
    )
      .trim()
      .toLowerCase(),
    allowNegativeStock: Boolean(form.inventory?.allowNegativeStock),
    deadStockThresholdDays: Number(form.inventory?.deadStockThresholdDays || 90)
  },
  finance: {
    valuationMethod: String(form.finance?.valuationMethod || 'WEIGHTED_AVG'),
    displayCurrencyCode:
      String(
        form.finance?.displayCurrencyCode ||
          form.companyProfile?.currencyCode ||
          'UGX'
      )
        .trim()
        .toUpperCase() || 'UGX',
    taxInclusivePricing: Boolean(form.finance?.taxInclusivePricing)
  },
  userAccess: {
    defaultInviteExpiryHours: Number(
      form.userAccess?.defaultInviteExpiryHours || 72
    ),
    defaultEmployeeRole: String(
      form.userAccess?.defaultEmployeeRole || 'staff'
    ),
    allowStaffProductCreation: Boolean(
      form.userAccess?.allowStaffProductCreation
    ),
    allowStaffSoftDeleteOnly: Boolean(form.userAccess?.allowStaffSoftDeleteOnly)
  },
  securitySession: {
    sessionIdleTimeoutMinutes: Number(
      form.securitySession?.sessionIdleTimeoutMinutes || 60
    ),
    refreshTokenTtlDays: Number(form.securitySession?.refreshTokenTtlDays || 7),
    passwordMinLength: Number(form.securitySession?.passwordMinLength || 8),
    loginMaxAttempts: Number(form.securitySession?.loginMaxAttempts || 5),
    lockoutDurationMinutes: Number(
      form.securitySession?.lockoutDurationMinutes || 15
    )
  },
  realtimeOffline: {
    realtimeEnabled: Boolean(form.realtimeOffline?.realtimeEnabled),
    autoReconnectEnabled: Boolean(form.realtimeOffline?.autoReconnectEnabled),
    offlineQueueAutoSync: Boolean(form.realtimeOffline?.offlineQueueAutoSync),
    offlineQueueRetrySeconds: Number(
      form.realtimeOffline?.offlineQueueRetrySeconds || 30
    )
  },
  auditBackup: {
    auditRetentionDays: Number(form.auditBackup?.auditRetentionDays || 365),
    backupSchedule: String(form.auditBackup?.backupSchedule || 'daily'),
    backupRetentionDays: Number(form.auditBackup?.backupRetentionDays || 30),
    requireRestoreApproval: Boolean(form.auditBackup?.requireRestoreApproval)
  }
});

export const copyTextToClipboard = async (text) => {
  const value = String(text || '');
  if (!value.trim()) {
    throw new Error('Nothing to copy');
  }

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is not available in this context');
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const didCopy = document.execCommand('copy');
    if (!didCopy) {
      throw new Error('Clipboard write failed');
    }
  } finally {
    document.body.removeChild(textarea);
  }
};
