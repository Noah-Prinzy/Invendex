import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getFinanceRealtimeStatsRequest,
  getObservabilityPingRequest,
  seedOnboardingSampleDataRequest,
  getSettingsRequest,
  patchSettingsRequest
} from '../../api/client.js';
import {
  ThemeSelectionSection,
  CompanyProfileSection,
  NotificationRulesSection,
  InventoryControlsSection,
  FinanceDefaultsSection,
  UserAccessPolicySection,
  SecuritySessionSection,
  RealtimeOfflineSection,
  AuditBackupSection,
  ObservabilityPipelineSection,
  OnboardingSampleDataSection,
  SettingsSaveFooter
} from './components/SettingsSections.js';
import {
  SETTINGS_MANAGE_ROLES,
  OBS_STALE_MS,
  SETTINGS_QUERY_STALE_MS,
  mapApiSettingsToForm,
  mapFormToApiPayload,
  parseRecipientsText,
  recipientsToText,
  getDefaultSettings,
  copyTextToClipboard
} from './settingsUtils.js';

const SETTINGS_HUB_PAGE_ID = 'hub';
const TAB_QUERY_KEY = 'tab';
const SETTINGS_PAGE_QUERY_KEY = 'settingsPage';

const SETTINGS_PAGES = [
  {
    id: 'theme',
    title: 'Theme Studio',
    description: 'Pick and preview your Ledgerly visual theme.',
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

const Settings = ({
  accessToken = null,
  userRole = null,
  themeId = null,
  onThemeChange = () => {}
}) => {
  const queryClient = useQueryClient();
  const [activePageId, setActivePageId] = useState(() =>
    readSettingsPageFromUrl()
  );
  const [form, setForm] = useState(getDefaultSettings());
  const [recipientsText, setRecipientsText] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [copyTraceState, setCopyTraceState] = useState('idle');
  const [onboardingSeedResult, setOnboardingSeedResult] = useState(null);
  const [onboardingSeedError, setOnboardingSeedError] = useState('');
  const [onboardingSeeding, setOnboardingSeeding] = useState(false);

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

  const settingsQuery = useQuery({
    queryKey: ['settings:get', String(accessToken || '')],
    enabled: Boolean(accessToken),
    staleTime: SETTINGS_QUERY_STALE_MS,
    queryFn: async () => getSettingsRequest(accessToken)
  });

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

  useEffect(() => {
    const mapped = mapApiSettingsToForm(settingsQuery.data);
    setForm(mapped);
    setRecipientsText(
      recipientsToText(mapped.notifications.lowStockRecipients)
    );
    setIsDirty(false);
  }, [settingsQuery.data]);

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
      setForm(mapped);
      setRecipientsText(
        recipientsToText(mapped.notifications.lowStockRecipients)
      );
      setIsDirty(false);
      setFormError('');
      setFormNotice('Settings saved.');
    },
    onError: (error) => {
      setFormNotice('');
      setFormError(String(error?.message || 'Failed to save settings'));
    }
  });

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

  const handleRecipientsChange = (value) => {
    setRecipientsText(value);
    setNestedField(
      'notifications',
      'lowStockRecipients',
      parseRecipientsText(value)
    );
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setFormNotice('');
    setFormError('');
    const payload = mapFormToApiPayload(form);
    await saveSettingsMutation.mutateAsync(payload);
  };

  const handleReset = () => {
    const mapped = mapApiSettingsToForm(settingsQuery.data);
    setForm(mapped);
    setRecipientsText(
      recipientsToText(mapped.notifications.lowStockRecipients)
    );
    setFormNotice('');
    setFormError('');
    setIsDirty(false);
  };

  const handleRefreshAll = () => {
    settingsQuery.refetch();
    realtimeStatsQuery.refetch();
    observabilityQuery.refetch();
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
      } catch (error) {
        setOnboardingSeedError(
          String(error?.message || 'Failed to seed onboarding sample data')
        );
      } finally {
        setOnboardingSeeding(false);
      }
    },
    [accessToken]
  );

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
          isSaving={saveSettingsMutation.isPending}
          setTopField={setTopField}
          setNestedField={setNestedField}
        />
      );
    }

    if (activePageId === 'notifications') {
      return (
        <NotificationRulesSection
          form={form}
          recipientsText={recipientsText}
          canManageSettings={canManageSettings}
          isSaving={saveSettingsMutation.isPending}
          setNestedField={setNestedField}
          setDoubleNestedField={setDoubleNestedField}
          handleRecipientsChange={handleRecipientsChange}
        />
      );
    }

    if (activePageId === 'inventory-controls') {
      return (
        <InventoryControlsSection
          form={form}
          canManageSettings={canManageSettings}
          isSaving={saveSettingsMutation.isPending}
          setNestedField={setNestedField}
        />
      );
    }

    if (activePageId === 'finance-defaults') {
      return (
        <FinanceDefaultsSection
          form={form}
          canManageSettings={canManageSettings}
          isSaving={saveSettingsMutation.isPending}
          setNestedField={setNestedField}
        />
      );
    }

    if (activePageId === 'user-access') {
      return (
        <UserAccessPolicySection
          form={form}
          canManageSettings={canManageSettings}
          isSaving={saveSettingsMutation.isPending}
          setNestedField={setNestedField}
        />
      );
    }

    if (activePageId === 'security-session') {
      return (
        <SecuritySessionSection
          form={form}
          canManageSettings={canManageSettings}
          isSaving={saveSettingsMutation.isPending}
          setNestedField={setNestedField}
        />
      );
    }

    if (activePageId === 'realtime-offline') {
      return (
        <RealtimeOfflineSection
          form={form}
          canManageSettings={canManageSettings}
          isSaving={saveSettingsMutation.isPending}
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
          isSaving={saveSettingsMutation.isPending}
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
        <OnboardingSampleDataSection
          canManageSettings={canManageSettings}
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
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Settings</h2>
            <p>Sign in to view organization settings.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section className="panel settings-panel">
      <header className="panel-head panel-head-row">
        <div>
          <h2>
            {isHubView ? 'Settings' : activePageMeta?.title || 'Settings'}
          </h2>
          <p>
            {isHubView
              ? 'Open a settings page from the hub below.'
              : activePageMeta?.description || 'Settings page'}
          </p>
        </div>
        <div className="obs-actions">
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
            className="btn-ghost"
            onClick={handleRefreshAll}
            disabled={
              settingsQuery.isFetching ||
              realtimeStatsQuery.isFetching ||
              observabilityQuery.isFetching
            }
          >
            {settingsQuery.isFetching ? 'Refreshing...' : 'Refresh all'}
          </button>
        </div>
      </header>

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

      {renderActivePage()}

      {showSaveFooter ? (
        <SettingsSaveFooter
          updatedAt={form.updatedAt}
          isDirty={isDirty}
          handleReset={handleReset}
          handleSave={handleSave}
          canManageSettings={canManageSettings}
          isSaving={saveSettingsMutation.isPending}
          isLoadingSettings={settingsQuery.isLoading}
        />
      ) : null}
    </section>
  );
};

export default Settings;
