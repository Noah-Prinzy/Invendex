import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getFinanceExchangeRatesRequest,
  getFinanceNotificationSettingsRequest,
  getFinanceTaxConfigRequest,
  patchFinanceNotificationSettingsRequest,
  patchFinanceTaxConfigRequest,
  createOnboardingWarehouseRequest,
  createUserInviteRequest,
  getFinanceRealtimeStatsRequest,
  getOnboardingStatusRequest,
  getObservabilityPingRequest,
  seedOnboardingSampleDataRequest,
  getSettingsRequest,
  getWarehousesRequest,
  patchSettingsRequest
} from '../../api/client.js';
import SettingsLayout from '../../layouts/SettingsLayout.js';
import {
  SETTINGS_MANAGE_ROLES,
  OBS_STALE_MS,
  SETTINGS_QUERY_STALE_MS,
  mapApiSettingsToForm,
  mapFormToApiPayload,
  normalizeRecipients,
  getDefaultSettings,
  copyTextToClipboard
} from './settingsUtils.js';

const loadSettingsSections = () => import('./components/SettingsSections.js');

const lazySettingsSection = (exportName) =>
  lazy(() =>
    loadSettingsSections().then((module) => ({
      default: module[exportName]
    }))
  );

const ThemeSelectionSection = lazySettingsSection('ThemeSelectionSection');
const CompanyProfileSection = lazySettingsSection('CompanyProfileSection');
const NotificationRulesSection = lazySettingsSection(
  'NotificationRulesSection'
);
const InventoryControlsSection = lazySettingsSection(
  'InventoryControlsSection'
);
const FinanceDefaultsSection = lazySettingsSection('FinanceDefaultsSection');
const UserAccessPolicySection = lazySettingsSection('UserAccessPolicySection');
const SecuritySessionSection = lazySettingsSection('SecuritySessionSection');
const RealtimeOfflineSection = lazySettingsSection('RealtimeOfflineSection');
const AuditBackupSection = lazySettingsSection('AuditBackupSection');
const ObservabilityPipelineSection = lazySettingsSection(
  'ObservabilityPipelineSection'
);
const OnboardingLaunchWizardSection = lazySettingsSection(
  'OnboardingLaunchWizardSection'
);
const SettingsSaveFooter = lazySettingsSection('SettingsSaveFooter');

const SETTINGS_HUB_PAGE_ID = 'hub';
const TAB_QUERY_KEY = 'tab';
const SETTINGS_PAGE_QUERY_KEY = 'settingsPage';
const DEFAULT_DISPLAY_CURRENCY_CODES = [
  'UGX',
  'USD',
  'EUR',
  'GBP',
  'KES',
  'TZS',
  'RWF',
  'ZAR',
  'NGN',
  'CAD',
  'AUD',
  'INR'
];

const SETTINGS_PAGES = [
  {
    id: 'theme',
    title: 'Theme Studio',
    description: 'Pick and preview your Invendex visual theme.',
    scope: 'Personal'
  },
  {
    id: 'company-profile',
    title: 'Company Profile',
    description: 'Organization identity, timezone, currency, and VAT defaults.',
    scope: 'Organization'
  },
  {
    id: 'notifications',
    title: 'Notification Rules',
    description: 'Low-stock alerts, quiet hours, and recipients.',
    scope: 'Operations'
  },
  {
    id: 'inventory-controls',
    title: 'Inventory Controls',
    description: 'Warehouse adjustment policy and stock safety settings.',
    scope: 'Inventory'
  },
  {
    id: 'finance-defaults',
    title: 'Finance Defaults',
    description: 'Valuation method and pricing tax mode.',
    scope: 'Finance'
  },
  {
    id: 'user-access',
    title: 'User Access Policy',
    description: 'Invite defaults and staff privilege boundaries.',
    scope: 'Security'
  },
  {
    id: 'security-session',
    title: 'Security & Session',
    description: 'Session lifetimes, lockout window, and password policy.',
    scope: 'Security'
  },
  {
    id: 'realtime-offline',
    title: 'Realtime & Offline',
    description: 'Socket behavior, reconnect policy, and sync controls.',
    scope: 'Platform'
  },
  {
    id: 'audit-backup',
    title: 'Audit & Backup',
    description: 'Retention windows, schedules, and restore approval rules.',
    scope: 'Compliance'
  },
  {
    id: 'onboarding-sample',
    title: 'Onboarding Sample Data',
    description: 'Seed demo-ready sample warehouse, suppliers, and products.',
    scope: 'Launch'
  },
  {
    id: 'observability',
    title: 'Observability Pipeline',
    description: 'Trace IDs, runtime health, and realtime diagnostics.',
    scope: 'Platform'
  }
];

const EDITABLE_SETTINGS_PAGE_IDS = new Set([
  'company-profile',
  'notifications',
  'inventory-controls',
  'finance-defaults',
  'user-access',
  'security-session',
  'realtime-offline',
  'audit-backup'
]);

const SETTINGS_PAGE_IDS = new Set(SETTINGS_PAGES.map((page) => page.id));

const getValidatedSettingsPageId = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return SETTINGS_PAGE_IDS.has(normalized) ? normalized : SETTINGS_HUB_PAGE_ID;
};

const readSettingsPageFromUrl = () => {
  if (typeof window === 'undefined') return SETTINGS_HUB_PAGE_ID;
  const params = new URLSearchParams(window.location.search);
  return getValidatedSettingsPageId(params.get(SETTINGS_PAGE_QUERY_KEY));
};

const writeSettingsPageToUrl = (pageId) => {
  if (typeof window === 'undefined') return;
  const nextPageId = getValidatedSettingsPageId(pageId);
  const url = new URL(window.location.href);
  url.searchParams.set(TAB_QUERY_KEY, 'settings');
  if (nextPageId === SETTINGS_HUB_PAGE_ID) {
    url.searchParams.delete(SETTINGS_PAGE_QUERY_KEY);
  } else {
    url.searchParams.set(SETTINGS_PAGE_QUERY_KEY, nextPageId);
  }

  const nextPath = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', nextPath);
};

const applyTaxConfigToForm = (baseForm, taxConfig) => ({
  ...baseForm,
  finance: {
    ...(baseForm.finance || {}),
    taxInclusivePricing:
      typeof taxConfig?.taxInclusivePricing === 'boolean'
        ? taxConfig.taxInclusivePricing
        : Boolean(baseForm.finance?.taxInclusivePricing),
    importTaxEnabled: Boolean(taxConfig?.importTaxEnabled),
    importTaxRate: Number(taxConfig?.importTaxRate || 0)
  }
});

const applyNotificationSettingsToForm = (baseForm, notificationSettings) => ({
  ...baseForm,
  notifications: {
    ...(baseForm.notifications || {}),
    lowStockSmsEnabled:
      typeof notificationSettings?.smsLowStockEnabled === 'boolean'
        ? notificationSettings.smsLowStockEnabled
        : Boolean(baseForm.notifications?.lowStockSmsEnabled),
    lowStockSmsRecipients: normalizeRecipients(
      notificationSettings?.smsLowStockRecipients
    ),
    lowStockWhatsappEnabled: Boolean(
      notificationSettings?.whatsappLowStockEnabled
    ),
    lowStockWhatsappRecipients: normalizeRecipients(
      notificationSettings?.whatsappLowStockRecipients
    )
  }
});

const Settings = ({
  accessToken = null,
  userRole = null,
  currentUser = null,
  themeId = null,
  isTutorialRunning = false,
  onThemeChange = () => {},
  onReplayTutorial = () => {},
  onUpdateUserPreferences = async () => ({ success: false })
}) => {
  const queryClient = useQueryClient();
  const [activePageId, setActivePageId] = useState(() =>
    readSettingsPageFromUrl()
  );
  const [form, setForm] = useState(getDefaultSettings());
  const [formNotice, setFormNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [notificationMobileNumber, setNotificationMobileNumber] = useState('');
  const [contactNotice, setContactNotice] = useState('');
  const [contactError, setContactError] = useState('');
  const [contactSaving, setContactSaving] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [copyTraceState, setCopyTraceState] = useState('idle');
  const [onboardingSeedResult, setOnboardingSeedResult] = useState(null);
  const [onboardingSeedError, setOnboardingSeedError] = useState('');
  const [onboardingSeeding, setOnboardingSeeding] = useState(false);
  const [onboardingWarehouseForm, setOnboardingWarehouseForm] = useState({
    name: '',
    code: '',
    region: ''
  });
  const [onboardingWarehouseError, setOnboardingWarehouseError] = useState('');
  const [onboardingWarehouseResult, setOnboardingWarehouseResult] =
    useState(null);
  const [onboardingWarehouseCreating, setOnboardingWarehouseCreating] =
    useState(false);
  const [onboardingInviteEmail, setOnboardingInviteEmail] = useState('');
  const [onboardingInviteError, setOnboardingInviteError] = useState('');
  const [onboardingInviteResult, setOnboardingInviteResult] = useState(null);
  const [onboardingInviting, setOnboardingInviting] = useState(false);

  const normalizedRole = String(userRole || '')
    .trim()
    .toLowerCase();
  const canManageSettings =
    !normalizedRole || SETTINGS_MANAGE_ROLES.has(normalizedRole);

  const activePageMeta = useMemo(
    () => SETTINGS_PAGES.find((page) => page.id === activePageId) || null,
    [activePageId]
  );

  const isHubView = activePageId === SETTINGS_HUB_PAGE_ID;
  const isEditableView = EDITABLE_SETTINGS_PAGE_IDS.has(activePageId);
  const showSaveFooter = isEditableView || (isHubView && isDirty);
  const currentUserEmail = String(currentUser?.email || '').trim();
  const currentUserMobileNumber = String(
    currentUser?.mobileNumber || ''
  ).trim();

  const settingsQuery = useQuery({
    queryKey: ['settings:get', String(accessToken || '')],
    enabled: Boolean(accessToken),
    staleTime: SETTINGS_QUERY_STALE_MS,
    queryFn: async () => getSettingsRequest(accessToken)
  });

  const financeTaxConfigQuery = useQuery({
    queryKey: ['finance:tax-config:settings', String(accessToken || '')],
    enabled: Boolean(accessToken),
    staleTime: SETTINGS_QUERY_STALE_MS,
    queryFn: async () => getFinanceTaxConfigRequest(accessToken)
  });

  const financeNotificationSettingsQuery = useQuery({
    queryKey: [
      'finance:notification-settings:settings',
      String(accessToken || '')
    ],
    enabled: Boolean(accessToken),
    staleTime: SETTINGS_QUERY_STALE_MS,
    queryFn: async () => getFinanceNotificationSettingsRequest(accessToken)
  });

  const persistedBaseCurrencyCode = String(
    settingsQuery.data?.companyProfile?.currencyCode || 'UGX'
  )
    .trim()
    .toUpperCase();
  const selectedDisplayCurrencyCode = String(
    form.finance?.displayCurrencyCode || persistedBaseCurrencyCode || 'UGX'
  )
    .trim()
    .toUpperCase();

  const observabilityQuery = useQuery({
    queryKey: ['observability:ping:settings', String(accessToken || '')],
    enabled: Boolean(accessToken),
    staleTime: OBS_STALE_MS,
    refetchInterval: OBS_STALE_MS,
    queryFn: async () => {
      const data = await getObservabilityPingRequest(accessToken);
      setLastCheckedAt(new Date().toISOString());
      return data;
    }
  });

  const realtimeStatsQuery = useQuery({
    queryKey: ['finance:realtime:stats', String(accessToken || '')],
    enabled: Boolean(accessToken),
    staleTime: OBS_STALE_MS,
    refetchInterval: OBS_STALE_MS,
    queryFn: async () => getFinanceRealtimeStatsRequest(accessToken)
  });

  const exchangeRatesQuery = useQuery({
    queryKey: [
      'finance:exchange-rates',
      String(accessToken || ''),
      persistedBaseCurrencyCode
    ],
    enabled: Boolean(accessToken),
    staleTime: OBS_STALE_MS,
    queryFn: async () =>
      getFinanceExchangeRatesRequest({
        accessToken,
        baseCurrencyCode: persistedBaseCurrencyCode
      })
  });

  const onboardingStatusQuery = useQuery({
    queryKey: ['onboarding:status', String(accessToken || '')],
    enabled: Boolean(accessToken),
    staleTime: OBS_STALE_MS,
    queryFn: async () => getOnboardingStatusRequest(accessToken)
  });

  const warehouseOptionsQuery = useQuery({
    queryKey: ['settings:warehouses', String(accessToken || '')],
    enabled: Boolean(accessToken),
    staleTime: SETTINGS_QUERY_STALE_MS,
    queryFn: async () =>
      getWarehousesRequest(accessToken, {
        includeInactive: false,
        includeArchived: false
      })
  });

  const warehouseOptions = useMemo(() => {
    const rows = Array.isArray(warehouseOptionsQuery.data)
      ? warehouseOptionsQuery.data
      : [];
    return rows.map((warehouse) => ({
      value: String(warehouse?._id || ''),
      label: `${String(warehouse?.name || 'Warehouse')} (${String(warehouse?.code || '-')})`
    }));
  }, [warehouseOptionsQuery.data]);

  const availableDisplayCurrencyCodes = useMemo(() => {
    const codes = new Set(DEFAULT_DISPLAY_CURRENCY_CODES);
    codes.add(persistedBaseCurrencyCode);
    const rows = Array.isArray(exchangeRatesQuery.data?.rates)
      ? exchangeRatesQuery.data.rates
      : [];

    for (const row of rows) {
      const code = String(row?.quoteCurrencyCode || '')
        .trim()
        .toUpperCase();
      if (code.length === 3) {
        codes.add(code);
      }
    }

    if (selectedDisplayCurrencyCode.length === 3) {
      codes.add(selectedDisplayCurrencyCode);
    }

    return Array.from(codes).sort((a, b) => a.localeCompare(b));
  }, [
    exchangeRatesQuery.data?.rates,
    persistedBaseCurrencyCode,
    selectedDisplayCurrencyCode
  ]);

  useEffect(() => {
    const mapped = mapApiSettingsToForm(settingsQuery.data);
    setForm((current) => ({
      ...mapped,
      notifications: {
        ...mapped.notifications,
        lowStockSmsRecipients: normalizeRecipients(
          current.notifications?.lowStockSmsRecipients
        ),
        lowStockWhatsappEnabled: Boolean(
          current.notifications?.lowStockWhatsappEnabled
        ),
        lowStockWhatsappRecipients: normalizeRecipients(
          current.notifications?.lowStockWhatsappRecipients
        )
      },
      finance: {
        ...mapped.finance,
        importTaxEnabled: Boolean(current.finance?.importTaxEnabled),
        importTaxRate: Number(current.finance?.importTaxRate || 0)
      }
    }));
    setIsDirty(false);
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!financeTaxConfigQuery.data) return;
    setForm((current) =>
      applyTaxConfigToForm(current, financeTaxConfigQuery.data)
    );
  }, [financeTaxConfigQuery.data]);

  useEffect(() => {
    if (!financeNotificationSettingsQuery.data) return;
    setForm((current) =>
      applyNotificationSettingsToForm(
        current,
        financeNotificationSettingsQuery.data
      )
    );
  }, [financeNotificationSettingsQuery.data]);

  useEffect(() => {
    setNotificationMobileNumber(currentUserMobileNumber);
  }, [currentUserMobileNumber]);

  useEffect(() => {
    const syncFromUrl = () => {
      const nextFromUrl = readSettingsPageFromUrl();
      setActivePageId((current) =>
        current === nextFromUrl ? current : nextFromUrl
      );
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
    };
  }, []);

  useEffect(() => {
    if (isHubView || activePageMeta) return;
    setActivePageId(SETTINGS_HUB_PAGE_ID);
  }, [activePageMeta, isHubView]);

  useEffect(() => {
    writeSettingsPageToUrl(activePageId);
  }, [activePageId]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (payload) =>
      patchSettingsRequest({
        accessToken,
        payload
      }),
    onSuccess: (updated) => {
      const mapped = mapApiSettingsToForm(updated);
      queryClient.setQueryData(
        ['settings:get', String(accessToken || '')],
        updated
      );
      setForm((current) => ({
        ...mapped,
        notifications: {
          ...mapped.notifications,
          lowStockSmsRecipients: normalizeRecipients(
            current.notifications?.lowStockSmsRecipients
          ),
          lowStockWhatsappEnabled: Boolean(
            current.notifications?.lowStockWhatsappEnabled
          ),
          lowStockWhatsappRecipients: normalizeRecipients(
            current.notifications?.lowStockWhatsappRecipients
          )
        },
        finance: {
          ...mapped.finance,
          importTaxEnabled: Boolean(current.finance?.importTaxEnabled),
          importTaxRate: Number(current.finance?.importTaxRate || 0)
        }
      }));
      setIsDirty(false);
      setFormError('');
      setFormNotice('Settings saved.');
    },
    onError: (error) => {
      setFormNotice('');
      setFormError(String(error?.message || 'Failed to save settings'));
    }
  });

  const saveFinanceTaxConfigMutation = useMutation({
    mutationFn: async (payload) =>
      patchFinanceTaxConfigRequest({
        accessToken,
        payload
      })
  });

  const saveFinanceNotificationSettingsMutation = useMutation({
    mutationFn: async (payload) =>
      patchFinanceNotificationSettingsRequest({
        accessToken,
        payload
      })
  });

  const isSavingSettings =
    saveSettingsMutation.isPending ||
    saveFinanceTaxConfigMutation.isPending ||
    saveFinanceNotificationSettingsMutation.isPending;

  const setTopField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
    setFormNotice('');
    setFormError('');
    setIsDirty(true);
  };

  const setNestedField = (section, field, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...(current[section] || {}),
        [field]: value
      }
    }));
    setFormNotice('');
    setFormError('');
    setIsDirty(true);
  };

  const setDoubleNestedField = (section, child, field, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...(current[section] || {}),
        [child]: {
          ...(current[section]?.[child] || {}),
          [field]: value
        }
      }
    }));
    setFormNotice('');
    setFormError('');
    setIsDirty(true);
  };

  const handleSaveNotificationContact = useCallback(async () => {
    if (!accessToken) return;

    setContactNotice('');
    setContactError('');
    setContactSaving(true);

    try {
      const response = await onUpdateUserPreferences({
        mobileNumber: notificationMobileNumber
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to save mobile number');
      }

      setContactNotice('Mobile notification number updated.');
    } catch (error) {
      setContactError(String(error?.message || 'Failed to save mobile number'));
    } finally {
      setContactSaving(false);
    }
  }, [accessToken, notificationMobileNumber, onUpdateUserPreferences]);

  const handleNotificationMobileNumberChange = useCallback((value) => {
    setNotificationMobileNumber(value);
    setContactNotice('');
    setContactError('');
  }, []);

  const handleSave = async () => {
    if (!accessToken) return;
    setFormNotice('');
    setFormError('');
    const basePayload = mapFormToApiPayload(form);
    const payload = {
      ...basePayload,
      notifications: {
        ...basePayload.notifications,
        lowStockRecipients: []
      }
    };
    const financeTaxPayload = {
      taxInclusivePricing: Boolean(form.finance?.taxInclusivePricing),
      importTaxEnabled: Boolean(form.finance?.importTaxEnabled),
      importTaxRate: Number(form.finance?.importTaxRate || 0)
    };
    const financeNotificationPayload = {
      smsLowStockEnabled: Boolean(form.notifications?.lowStockSmsEnabled),
      smsLowStockRecipients: [],
      whatsappLowStockEnabled: Boolean(
        form.notifications?.lowStockWhatsappEnabled
      ),
      whatsappLowStockRecipients: []
    };

    try {
      await Promise.all([
        saveSettingsMutation.mutateAsync(payload),
        saveFinanceTaxConfigMutation.mutateAsync(financeTaxPayload),
        saveFinanceNotificationSettingsMutation.mutateAsync(
          financeNotificationPayload
        )
      ]);
      await Promise.all([
        settingsQuery.refetch(),
        financeTaxConfigQuery.refetch(),
        financeNotificationSettingsQuery.refetch(),
        exchangeRatesQuery.refetch()
      ]);
      setFormNotice('Settings saved.');
      setFormError('');
      setIsDirty(false);
    } catch (error) {
      setFormNotice('');
      setFormError(String(error?.message || 'Failed to save settings'));
    }
  };

  const handleReset = () => {
    const mappedSettings = mapApiSettingsToForm(settingsQuery.data);
    const mappedTax = financeTaxConfigQuery.data;
    const mappedNotification = financeNotificationSettingsQuery.data;
    const withTax = applyTaxConfigToForm(mappedSettings, mappedTax);
    const merged = applyNotificationSettingsToForm(withTax, mappedNotification);
    setForm(merged);
    setFormNotice('');
    setFormError('');
    setIsDirty(false);
  };

  const handleRefreshAll = () => {
    settingsQuery.refetch();
    financeTaxConfigQuery.refetch();
    financeNotificationSettingsQuery.refetch();
    warehouseOptionsQuery.refetch();
    realtimeStatsQuery.refetch();
    observabilityQuery.refetch();
    exchangeRatesQuery.refetch();
  };

  const handleCopyTraceIds = useCallback(async () => {
    const requestId = observabilityQuery.data?.trace?.requestId || '';
    const clientTraceId = observabilityQuery.data?.trace?.clientTraceId || '';
    const payload = `requestId=${requestId || 'n/a'}\nclientTraceId=${clientTraceId || 'n/a'}`;

    try {
      await copyTextToClipboard(payload);
      setCopyTraceState('copied');
      setTimeout(() => {
        setCopyTraceState((current) =>
          current === 'copied' ? 'idle' : current
        );
      }, 2000);
    } catch {
      setCopyTraceState('error');
      setTimeout(() => {
        setCopyTraceState((current) =>
          current === 'error' ? 'idle' : current
        );
      }, 2500);
    }
  }, [
    observabilityQuery.data?.trace?.clientTraceId,
    observabilityQuery.data?.trace?.requestId
  ]);

  const handleSeedSampleData = useCallback(
    async (force = false) => {
      if (!accessToken) return;
      setOnboardingSeeding(true);
      setOnboardingSeedError('');

      try {
        const result = await seedOnboardingSampleDataRequest({
          accessToken,
          force
        });
        setOnboardingSeedResult(result || null);
        onboardingStatusQuery.refetch();
        settingsQuery.refetch();
      } catch (error) {
        setOnboardingSeedError(
          String(error?.message || 'Failed to seed onboarding sample data')
        );
      } finally {
        setOnboardingSeeding(false);
      }
    },
    [accessToken, onboardingStatusQuery, settingsQuery]
  );

  const handleOnboardingWarehouseField = useCallback((key, value) => {
    setOnboardingWarehouseForm((current) => ({
      ...current,
      [key]: value
    }));
  }, []);

  const handleCreateOnboardingWarehouse = useCallback(async () => {
    if (!accessToken) return;

    setOnboardingWarehouseError('');
    setOnboardingWarehouseResult(null);
    setOnboardingWarehouseCreating(true);

    try {
      const result = await createOnboardingWarehouseRequest({
        accessToken,
        name: onboardingWarehouseForm.name,
        code: onboardingWarehouseForm.code,
        region: onboardingWarehouseForm.region
      });
      setOnboardingWarehouseResult(result || null);
      setOnboardingWarehouseForm({
        name: '',
        code: '',
        region: ''
      });
      onboardingStatusQuery.refetch();
      settingsQuery.refetch();
    } catch (error) {
      setOnboardingWarehouseError(
        String(error?.message || 'Failed to create warehouse')
      );
    } finally {
      setOnboardingWarehouseCreating(false);
    }
  }, [
    accessToken,
    onboardingWarehouseForm,
    onboardingStatusQuery,
    settingsQuery
  ]);

  const handleCreateOnboardingInvite = useCallback(async () => {
    if (!accessToken) return;
    setOnboardingInviteError('');
    setOnboardingInviteResult(null);

    const normalizedEmail = String(onboardingInviteEmail || '').trim();
    if (!normalizedEmail) {
      setOnboardingInviteError('Invite email is required');
      return;
    }

    setOnboardingInviting(true);
    try {
      const result = await createUserInviteRequest({
        accessToken,
        email: normalizedEmail
      });
      setOnboardingInviteResult(result || null);
      setOnboardingInviteEmail('');
      onboardingStatusQuery.refetch();
    } catch (error) {
      setOnboardingInviteError(
        String(error?.message || 'Failed to create invite')
      );
    } finally {
      setOnboardingInviting(false);
    }
  }, [accessToken, onboardingInviteEmail, onboardingStatusQuery]);

  const observabilityStatus = useMemo(() => {
    if (observabilityQuery.isError) return 'error';
    if (observabilityQuery.data) return 'ok';
    if (observabilityQuery.isLoading || observabilityQuery.isFetching) {
      return 'loading';
    }
    return 'idle';
  }, [
    observabilityQuery.data,
    observabilityQuery.isError,
    observabilityQuery.isFetching,
    observabilityQuery.isLoading
  ]);

  const observabilityError = useMemo(() => {
    if (!observabilityQuery.isError) return '';
    const trace = observabilityQuery.error?.payload?.trace || {};
    const traceId = trace.serverRequestId || trace.requestId || 'n/a';
    const message = String(
      observabilityQuery.error?.message || 'Observability ping failed'
    );
    return traceId === 'n/a' ? message : `${message} (request: ${traceId})`;
  }, [observabilityQuery.error, observabilityQuery.isError]);

  const observabilitySummary = useMemo(() => {
    if (observabilityStatus === 'ok') return 'Healthy';
    if (observabilityStatus === 'error') return 'Issue detected';
    if (observabilityStatus === 'loading') return 'Checking';
    return 'Not checked';
  }, [observabilityStatus]);

  const realtimeEventStats = useMemo(() => {
    if (!Array.isArray(realtimeStatsQuery.data)) return [];
    return realtimeStatsQuery.data;
  }, [realtimeStatsQuery.data]);

  const renderHub = () => (
    <article className="data-card settings-card">
      <h3>Settings Areas</h3>
      <p className="event-sub">
        Open a settings page to configure that area. Changes are saved at
        section level.
      </p>
      <div className="settings-hub-grid">
        {SETTINGS_PAGES.map((page) => (
          <button
            key={page.id}
            type="button"
            className="settings-hub-card"
            onClick={() => setActivePageId(page.id)}
          >
            <p className="settings-hub-card-title">{page.title}</p>
            <p className="settings-hub-card-description">{page.description}</p>
            <span className="settings-hub-card-scope">{page.scope}</span>
          </button>
        ))}
      </div>
    </article>
  );

  const renderActivePage = () => {
    if (isHubView) return renderHub();

    if (activePageId === 'theme') {
      return (
        <ThemeSelectionSection
          themeId={themeId}
          onThemeChange={onThemeChange}
        />
      );
    }

    if (activePageId === 'company-profile') {
      return (
        <CompanyProfileSection
          form={form}
          canManageSettings={canManageSettings}
          isSaving={isSavingSettings}
          setTopField={setTopField}
          setNestedField={setNestedField}
        />
      );
    }

    if (activePageId === 'notifications') {
      return (
        <NotificationRulesSection
          form={form}
          currentUserEmail={currentUserEmail}
          notificationMobileNumber={notificationMobileNumber}
          contactNotice={contactNotice}
          contactError={contactError}
          contactSaving={contactSaving}
          canManageSettings={canManageSettings}
          canEditNotificationContacts={Boolean(accessToken)}
          isSaving={isSavingSettings}
          setNestedField={setNestedField}
          setDoubleNestedField={setDoubleNestedField}
          onNotificationMobileNumberChange={
            handleNotificationMobileNumberChange
          }
          onSaveNotificationContact={handleSaveNotificationContact}
        />
      );
    }

    if (activePageId === 'inventory-controls') {
      return (
        <InventoryControlsSection
          form={form}
          canManageSettings={canManageSettings}
          isSaving={isSavingSettings}
          setNestedField={setNestedField}
          warehouseOptions={warehouseOptions}
          warehouseOptionsLoading={
            warehouseOptionsQuery.isLoading || warehouseOptionsQuery.isFetching
          }
          warehouseOptionsError={String(
            warehouseOptionsQuery.error?.message || ''
          ).trim()}
        />
      );
    }

    if (activePageId === 'finance-defaults') {
      return (
        <FinanceDefaultsSection
          form={form}
          canManageSettings={canManageSettings}
          isSaving={isSavingSettings}
          setNestedField={setNestedField}
          baseCurrencyCode={persistedBaseCurrencyCode}
          availableDisplayCurrencyCodes={availableDisplayCurrencyCodes}
          exchangeRates={exchangeRatesQuery.data?.rates || []}
          exchangeRatesLoading={
            exchangeRatesQuery.isLoading || exchangeRatesQuery.isFetching
          }
          exchangeRatesError={String(exchangeRatesQuery.error?.message || '')}
        />
      );
    }

    if (activePageId === 'user-access') {
      return (
        <UserAccessPolicySection
          form={form}
          canManageSettings={canManageSettings}
          isSaving={isSavingSettings}
          setNestedField={setNestedField}
        />
      );
    }

    if (activePageId === 'security-session') {
      return (
        <SecuritySessionSection
          form={form}
          canManageSettings={canManageSettings}
          isSaving={isSavingSettings}
          setNestedField={setNestedField}
        />
      );
    }

    if (activePageId === 'realtime-offline') {
      return (
        <RealtimeOfflineSection
          form={form}
          canManageSettings={canManageSettings}
          isSaving={isSavingSettings}
          setNestedField={setNestedField}
          realtimeEventStats={realtimeEventStats}
        />
      );
    }

    if (activePageId === 'audit-backup') {
      return (
        <AuditBackupSection
          form={form}
          canManageSettings={canManageSettings}
          isSaving={isSavingSettings}
          setNestedField={setNestedField}
        />
      );
    }

    if (activePageId === 'observability') {
      return (
        <ObservabilityPipelineSection
          lastCheckedAt={lastCheckedAt}
          handleCopyTraceIds={handleCopyTraceIds}
          copyTraceState={copyTraceState}
          observabilityQuery={observabilityQuery}
          observabilityStatus={observabilityStatus}
          observabilitySummary={observabilitySummary}
          observabilityError={observabilityError}
          accessToken={accessToken}
        />
      );
    }

    if (activePageId === 'onboarding-sample') {
      return (
        <OnboardingLaunchWizardSection
          canManageSettings={canManageSettings}
          onboardingStatus={onboardingStatusQuery.data || null}
          onboardingStatusLoading={
            onboardingStatusQuery.isLoading || onboardingStatusQuery.isFetching
          }
          onRefreshStatus={() => onboardingStatusQuery.refetch()}
          warehouseForm={onboardingWarehouseForm}
          onWarehouseFieldChange={handleOnboardingWarehouseField}
          onCreateWarehouse={handleCreateOnboardingWarehouse}
          creatingWarehouse={onboardingWarehouseCreating}
          warehouseError={onboardingWarehouseError}
          warehouseResult={onboardingWarehouseResult}
          inviteEmail={onboardingInviteEmail}
          onInviteEmailChange={setOnboardingInviteEmail}
          onCreateInvite={handleCreateOnboardingInvite}
          inviting={onboardingInviting}
          inviteError={onboardingInviteError}
          inviteResult={onboardingInviteResult}
          isSeeding={onboardingSeeding}
          seedResult={onboardingSeedResult}
          seedError={onboardingSeedError}
          onSeed={handleSeedSampleData}
        />
      );
    }

    return renderHub();
  };

  if (!accessToken) {
    return (
      <SettingsLayout
        title="Settings"
        description="Sign in to view organization settings."
      />
    );
  }

  const settingsHeaderActions = (
    <>
      <button
        type="button"
        className="btn-ghost aligned-action-btn"
        onClick={onReplayTutorial}
        disabled={isTutorialRunning}
      >
        {isTutorialRunning ? 'Tutorial running...' : 'Replay tutorial'}
      </button>
      {!isHubView ? (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setActivePageId(SETTINGS_HUB_PAGE_ID)}
        >
          Back to settings hub
        </button>
      ) : null}
      <button
        type="button"
        className="btn-ghost aligned-action-btn"
        onClick={handleRefreshAll}
        disabled={
          settingsQuery.isFetching ||
          financeTaxConfigQuery.isFetching ||
          financeNotificationSettingsQuery.isFetching ||
          warehouseOptionsQuery.isFetching ||
          realtimeStatsQuery.isFetching ||
          observabilityQuery.isFetching
        }
      >
        {settingsQuery.isFetching ? 'Refreshing...' : 'Refresh all'}
      </button>
    </>
  );

  return (
    <SettingsLayout
      title={isHubView ? 'Settings' : activePageMeta?.title || 'Settings'}
      description={
        isHubView
          ? 'Open a settings page from the hub below.'
          : activePageMeta?.description || 'Settings page'
      }
      actions={settingsHeaderActions}
    >
      {settingsQuery.isLoading ? (
        <article className="event-card">
          <p className="event-sub">Loading organization settings...</p>
        </article>
      ) : null}

      {settingsQuery.isError ? (
        <article className="event-card">
          <p className="form-error">
            {String(settingsQuery.error?.message || 'Failed to load settings')}
          </p>
        </article>
      ) : null}

      {!canManageSettings ? (
        <p className="section-note">
          You have read-only access. Manager/admin/owner role is required to
          change settings.
        </p>
      ) : null}

      {formNotice ? <p className="section-note">{formNotice}</p> : null}
      {formError ? <p className="form-error">{formError}</p> : null}

      <Suspense
        fallback={
          <article className="event-card">
            <p className="event-sub">Loading settings page...</p>
          </article>
        }
      >
        {renderActivePage()}

        {showSaveFooter ? (
          <SettingsSaveFooter
            updatedAt={form.updatedAt}
            isDirty={isDirty}
            handleReset={handleReset}
            handleSave={handleSave}
            canManageSettings={canManageSettings}
            isSaving={isSavingSettings}
            isLoadingSettings={settingsQuery.isLoading}
          />
        ) : null}
      </Suspense>
    </SettingsLayout>
  );
};

export default Settings;
