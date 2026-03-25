import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '../i18n/index.js';
import useTabs from '../hooks/ui/useTabs.js';
import AuthLayout from '../layouts/AuthLayout.js';
import RequireOrganization from '../guards/RequireOrganization.js';
import RequireRole from '../guards/RequireRole.js';
import Card from '../ui/Card.js';
import { useAppActions, useAppState } from '../state/appState.js';
import {
  getProductsRequest,
  getPurchaseOrdersRequest,
  getWarehousesRequest,
  getSettingsRequest,
  getNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest
} from '../api/client.js';
import { isKnownThemeId } from '../themes/themeCatalog.js';
import {
  applyThemePreference,
  readThemePreference,
  writeThemePreference
} from '../themes/themePreference.js';

const EVENT_LIMIT = 40;
const ADMIN_ROLES = new Set(['owner', 'admin']);
const TAB_QUERY_KEY = 'tab';
const SETTINGS_PAGE_QUERY_KEY = 'settingsPage';
const TUTORIAL_COMPLETED_STORAGE_KEY_PREFIX = 'invendex:tutorial_completed:';
const LEGACY_TUTORIAL_COMPLETED_STORAGE_KEY_PREFIXES = Object.freeze([
  'Invendex:tutorial_completed:'
]);

const emailToUsernameFallback = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return normalized.includes('@') ? normalized.split('@')[0] : normalized;
};

const resolveUserIdentityLabel = (identity = {}, fallback = 'employee') =>
  String(
    identity?.username ||
      identity?.name ||
      emailToUsernameFallback(identity?.email) ||
      fallback
  ).trim() || fallback;

const sanitizeBaseUrl = (value) =>
  String(value || '')
    .trim()
    .replace(/\/+$/, '');

const buildTutorialStorageKey = (
  userId,
  prefix = TUTORIAL_COMPLETED_STORAGE_KEY_PREFIX
) => `${prefix}${String(userId || '').trim()}`;

const buildTutorialStorageKeys = (userId) => [
  buildTutorialStorageKey(userId),
  ...LEGACY_TUTORIAL_COMPLETED_STORAGE_KEY_PREFIXES.map((prefix) =>
    buildTutorialStorageKey(userId, prefix)
  )
];

const readTutorialCompleted = (userId) => {
  if (typeof window === 'undefined') return false;
  const storageKeys = buildTutorialStorageKeys(userId);
  const primaryStorageKey = storageKeys[0] || '';
  if (!primaryStorageKey || primaryStorageKey.endsWith(':')) return false;
  try {
    return storageKeys.some(
      (storageKey) => window.localStorage.getItem(storageKey) === '1'
    );
  } catch {
    return false;
  }
};

const persistTutorialCompleted = (userId) => {
  if (typeof window === 'undefined') return;
  const storageKey = buildTutorialStorageKey(userId);
  const legacyStorageKeys = buildTutorialStorageKeys(userId).slice(1);
  if (!storageKey || storageKey.endsWith(':')) return;
  try {
    window.localStorage.setItem(storageKey, '1');
    legacyStorageKeys.forEach((legacyStorageKey) => {
      window.localStorage.removeItem(legacyStorageKey);
    });
  } catch {
    // Ignore storage failures.
  }
};

const clearTutorialCompleted = (userId) => {
  if (typeof window === 'undefined') return;
  const storageKeys = buildTutorialStorageKeys(userId);
  const primaryStorageKey = storageKeys[0] || '';
  if (!primaryStorageKey || primaryStorageKey.endsWith(':')) return;
  try {
    storageKeys.forEach((storageKey) => {
      window.localStorage.removeItem(storageKey);
    });
  } catch {
    // Ignore storage failures.
  }
};

const isTutorialDisabledByEnvironment = () => {
  if (process.env.NODE_ENV === 'test') return true;
  if (typeof navigator !== 'undefined' && navigator.webdriver) return true;
  return false;
};

const TUTORIAL_STEPS = Object.freeze([
  {
    id: 'tutorial-welcome',
    tab: 'dashboard',
    selector: '',
    showSkipAction: true,
    title: 'Welcome to Invendex',
    description:
      'This quick walkthrough shows you the main controls you need to run stock, warehouses, purchasing, and daily decisions without guessing where to start.',
    tips: [
      {
        label: 'How it works',
        text: 'Read each step, click next, and follow the highlighted area once the real walkthrough begins.'
      }
    ]
  },
  {
    id: 'header-brand',
    tab: 'dashboard',
    selector: '[data-tutorial-id="header-brand"]',
    title: 'This title keeps you anchored to the current workspace',
    description:
      'Use the company name in the header to confirm which workspace you are operating in before changing stock, approving requests, or reading metrics.',
    tips: [
      {
        label: 'Simple check',
        text: 'If the company name looks wrong, stop and confirm you are in the correct workspace before continuing.'
      }
    ]
  },
  {
    id: 'header-warehouse',
    tab: 'dashboard',
    selector: '[data-tutorial-id="header-warehouse"]',
    title: 'Use the warehouse selector to change your working scope',
    description:
      'When you choose one warehouse, the app narrows stock, reports, and alerts to that location. Choose All Warehouses to see the combined view.',
    tips: [
      {
        label: 'Daily habit',
        text: 'Set this before adjusting stock or reading reports so you do not mix locations by mistake.'
      }
    ]
  },
  {
    id: 'header-notifications',
    tab: 'dashboard',
    selector: '[data-tutorial-id="header-notifications"]',
    title: 'Notifications show important actions that need attention',
    description:
      'Open this panel to review signup requests, warehouse alerts, and other updates without leaving your current page.',
    tips: [
      {
        label: 'Best use',
        text: 'Treat this as your quick inbox for items that need acknowledgement or action.'
      }
    ]
  },
  {
    id: 'app-tabbar',
    tab: 'dashboard',
    selector: '[data-tutorial-id="app-tabbar"]',
    title: 'These tabs divide the app by task',
    description:
      'Use the tabs to move between daily operations like products, purchasing, reports, account security, and settings.',
    tips: [
      {
        label: 'Simple rule',
        text: 'If you are changing stock, start with Products. If you are reviewing performance, go to Dashboard or Reports.'
      }
    ]
  },
  {
    id: 'dashboard-metrics',
    tab: 'dashboard',
    selector: '[data-tutorial-id="dashboard-metrics"]',
    title: 'The dashboard starts with the most important numbers',
    description:
      'These cards give a quick read on what is moving, what is risky, and how healthy the selected warehouse or company is.',
    tips: [
      {
        label: 'Look here first',
        text: 'Use these cards before opening tables so you can tell where attention is needed immediately.'
      }
    ]
  },
  {
    id: 'dashboard-streams',
    tab: 'dashboard',
    selector: '[data-tutorial-id="dashboard-streams"]',
    title: 'Live streams summarise recent activity in plain language',
    description:
      'This area helps you follow inventory, finance, and sign-in events without reading raw technical logs.',
    tips: [
      {
        label: 'What to watch',
        text: 'Use it to confirm that important changes really happened and when they happened.'
      }
    ]
  },
  {
    id: 'products-adjustment',
    tab: 'products',
    selector: '[data-tutorial-id="products-adjustment"]',
    title: 'Use manual stock adjustment for exceptions and corrections',
    description:
      'Choose a product, reason, and amount to fix stock in the warehouse currently selected in the header.',
    tips: [
      {
        label: 'Important',
        text: 'Reason and amount direction must match. For example, expired stock uses a negative amount.'
      }
    ]
  },
  {
    id: 'products-create',
    tab: 'products',
    selector: '[data-tutorial-id="products-create"]',
    title: 'Add new products here',
    description:
      'Create a product once, then manage its stock warehouse by warehouse. SKU can be typed manually or generated automatically.',
    tips: [
      {
        label: 'Keep it simple',
        text: 'Start with name, price, and category. Add prefixes only if you want cleaner generated SKU codes.'
      }
    ]
  },
  {
    id: 'purchase-orders-manage',
    tab: 'purchaseOrders',
    selector: '[data-tutorial-id="purchase-orders-manage"]',
    title: 'Purchase orders track incoming stock from suppliers',
    description:
      'Use this page to review supplier orders and receive them only after goods arrive physically.',
    tips: [
      {
        label: 'Receiving',
        text: 'Receiving a purchase order updates stock for its linked warehouse.'
      }
    ]
  },
  {
    id: 'stocktakes-create',
    tab: 'stocktakes',
    selector: '[data-tutorial-id="stocktakes-create"]',
    title: 'Stocktakes help you compare expected stock against real counts',
    description:
      'Create a count session, enter quantities from the floor, then review and approve the variance.',
    tips: [
      {
        label: 'Workflow',
        text: 'Create, count, review, then approve. Approval is the step that applies the difference.'
      }
    ]
  },
  {
    id: 'warehouses-create',
    tab: 'warehouses',
    selector: '[data-tutorial-id="warehouses-create"]',
    title: 'Warehouses separate your locations cleanly',
    description:
      'Create each store or warehouse here so products, reports, and stock activity can be scoped correctly.',
    tips: [
      {
        label: 'Naming',
        text: 'Use clear names and codes so staff can pick the right location quickly.'
      }
    ]
  },
  {
    id: 'suppliers-directory',
    tab: 'suppliers',
    selector: '[data-tutorial-id="suppliers-directory"]',
    title: 'Suppliers combines contact records with supplier performance',
    description:
      'Use this page to search supplier details and compare which suppliers are strongest for future purchasing.',
    tips: [
      {
        label: 'Decision aid',
        text: 'Search the directory on the left, then compare ranking signals before placing a new order.'
      }
    ]
  },
  {
    id: 'reports-metrics',
    tab: 'reports',
    selector: '[data-tutorial-id="reports-metrics"]',
    title: 'Reports is where you check money, valuation, and summary outcomes',
    description:
      'This page changes with the selected warehouse, so you can analyse one location or the entire company.',
    tips: [
      {
        label: 'Practical use',
        text: 'Read the top cards first, then download reports only after the scope looks right.'
      }
    ]
  },
  {
    id: 'users-manage',
    tab: 'users',
    selector: '[data-tutorial-id="users-manage"]',
    title: 'User management controls who can access the workspace',
    description:
      'Use this area to activate, deactivate, or reassign roles for people in the organization.',
    tips: [
      {
        label: 'Be careful',
        text: 'Role changes affect what a user can see and do immediately.'
      }
    ]
  },
  {
    id: 'account-security',
    tab: 'account',
    selector: '[data-tutorial-id="account-security"]',
    title:
      'Your account page handles sessions, security, and personal controls',
    description:
      'This is where you review active devices, enable two-factor authentication, and manage sensitive account actions.',
    tips: [
      {
        label: 'Recommended',
        text: 'Enable two-factor authentication before you begin daily use on real business data.'
      }
    ]
  },
  {
    id: 'settings-root',
    tab: 'settings',
    selector: '[data-tutorial-id="settings-root"]',
    title: 'Settings defines how the workspace behaves',
    description:
      'Use settings for company profile, currency defaults, notification rules, security policy, and platform behavior.',
    tips: [
      {
        label: 'Start points',
        text: 'New teams usually begin with company profile, finance defaults, and notification rules.'
      }
    ]
  }
]);

const getRealtimeBaseUrl = () => {
  const envBase = sanitizeBaseUrl(
    process.env.REACT_APP_SOCKET_BASE_URL || process.env.REACT_APP_API_BASE_URL
  );
  if (envBase) return envBase;

  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  if (window.location.port === '3000') {
    return 'http://localhost:4000';
  }

  return sanitizeBaseUrl(window.location.origin);
};

const Dashboard = lazy(() => import('../features/dashboard/DashboardPage.js'));
const AuthenticatedDashboardShell = lazy(
  () => import('./AuthenticatedDashboardShell.js')
);
const BeginnerTutorial = lazy(() => import('./BeginnerTutorial.js'));
const NotificationBell = lazy(() => import('./NotificationBell.js'));
const AuthenticatedRealtimeController = lazy(
  () => import('./AuthenticatedRealtimeController.js')
);
const PurchaseOrders = lazy(
  () => import('../features/purchaseOrders/PurchaseOrdersPage.js')
);
const Products = lazy(() => import('../features/products/ProductsPage.js'));
const Suppliers = lazy(() => import('../features/suppliers/SuppliersPage.js'));
const Reports = lazy(() => import('../features/reports/ReportsPage.js'));
const Users = lazy(() => import('../features/users/UsersPage.js'));
const Stocktakes = lazy(
  () => import('../features/stocktakes/StocktakesPage.js')
);
const Warehouses = lazy(
  () => import('../features/warehouses/WarehousesPage.js')
);
const Account = lazy(() => import('../features/account/AccountPage.js'));
const Settings = lazy(() => import('../features/settings/SettingsPage.js'));

const buildInventoryEvent = (payload, eventName) => {
  const data = payload?.data || {};
  const quantityDelta = Number(data.quantityDelta || 0);
  const quantityOnHand = Number(data.quantityOnHand || 0);
  const sign = quantityDelta >= 0 ? '+' : '';

  return {
    id: `${eventName}:${payload?.entityId || 'n/a'}:${payload?.occurredAt || Date.now()}`,
    eventName,
    occurredAt: payload?.occurredAt || new Date().toISOString(),
    title: data.source ? `Inventory ${data.source}` : 'Inventory updated',
    subtitle: `Delta ${sign}${quantityDelta} | On hand ${quantityOnHand}`,
    raw: payload
  };
};

const buildFinanceEvent = (payload, eventName) => {
  const data = payload?.data || {};
  const orderId = data.orderId || data.reason || 'n/a';

  return {
    id: `${eventName}:${payload?.entityId || 'n/a'}:${payload?.occurredAt || Date.now()}`,
    eventName,
    occurredAt: payload?.occurredAt || new Date().toISOString(),
    title:
      eventName === 'finance.cogs_recorded'
        ? 'COGS recorded'
        : 'Valuation updated',
    subtitle: `Reference ${String(orderId)}`,
    raw: payload
  };
};

const buildPurchaseOrderEvent = (payload, kind) => {
  const data = payload?.data || {};
  const poNumber = data.poNumber || payload?.entityId || 'n/a';
  const status = data.status || 'UNKNOWN';

  return {
    id: `po:${kind}:${payload?.entityId || 'n/a'}:${payload?.occurredAt || Date.now()}`,
    kind,
    occurredAt: payload?.occurredAt || new Date().toISOString(),
    title: `PO ${poNumber}`,
    subtitle: `Status ${status}`,
    raw: payload
  };
};

const buildAuthEvent = (payload) => {
  const data = payload?.data || {};
  const username = resolveUserIdentityLabel(data);

  return {
    id: `auth:employee:${payload?.entityId || 'n/a'}:${payload?.occurredAt || Date.now()}`,
    occurredAt: payload?.occurredAt || new Date().toISOString(),
    title: 'Employee signed in',
    subtitle: `${username} joined ${data.organizationName || 'organization'}`,
    raw: payload
  };
};

const resolveWarehouseIdFromPayload = (payload) => {
  const data = payload?.data || {};
  const warehouseCandidate =
    data?.warehouseId ||
    data?.warehouse?._id ||
    data?.warehouse?.id ||
    data?.warehouse ||
    payload?.warehouseId ||
    payload?.warehouse;

  const normalized = String(warehouseCandidate || '').trim();
  return normalized || null;
};
const prependEvent = (list, event) => [event, ...list].slice(0, EVENT_LIMIT);
const readTabFromUrl = () => {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return String(params.get(TAB_QUERY_KEY) || '')
    .trim()
    .toLowerCase();
};

const writeTabToUrl = (tabKey) => {
  if (typeof window === 'undefined') return;
  const nextTab = String(tabKey || '').trim();
  if (!nextTab) return;

  const url = new URL(window.location.href);
  url.searchParams.set(TAB_QUERY_KEY, nextTab);
  if (nextTab !== 'settings') {
    url.searchParams.delete(SETTINGS_PAGE_QUERY_KEY);
  }
  const nextPath = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', nextPath);
};

const GuardFallback = ({ title, description }) => (
  <section className="panel">
    <Card className="event-card">
      <h3>{title}</h3>
      <p className="event-sub">{description}</p>
    </Card>
  </section>
);

const AuthenticatedWorkspace = ({
  user,
  accessToken,
  reviewEmployeeSignupRequest,
  updatePreferences,
  onSessionInvalidated,
  onLogout
}) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { activeWarehouseId, isOnline, offlineQueueSize } = useAppState();
  const { setActiveWarehouseId, setIsOnline, setOfflineQueueSize, setSession } =
    useAppActions();
  const { tabs, activeTab, setActiveTab } = useTabs(user?.role || null);
  const hasResolvedInitialTabRef = useRef(false);
  const tutorialUserKeyRef = useRef('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationActionBusyId, setNotificationActionBusyId] = useState('');
  const [inventoryEvents, setInventoryEvents] = useState([]);
  const [financeEvents, setFinanceEvents] = useState([]);
  const [authEvents, setAuthEvents] = useState([]);
  const [poEvents, setPoEvents] = useState([]);
  const [themeId, setThemeId] = useState(() => readThemePreference());
  const [tutorialStepIndex, setTutorialStepIndex] = useState(-1);

  const realtimeBaseUrl = useMemo(() => getRealtimeBaseUrl(), []);

  const companyName = useMemo(() => {
    const fromProfile = String(user?.organizationName || '').trim();
    if (fromProfile) return fromProfile;
    const fromOrganizationObject =
      typeof user?.organization === 'object'
        ? String(user.organization?.name || '').trim()
        : '';
    if (fromOrganizationObject) return fromOrganizationObject;
    return t('app.organizationFallback');
  }, [t, user]);

  const warehousesQuery = useQuery({
    queryKey: ['warehouses:list', String(accessToken || '')],
    enabled: Boolean(accessToken),
    staleTime: 30 * 1000,
    queryFn: async () =>
      getWarehousesRequest(accessToken, {
        includeInactive: false,
        includeArchived: false
      })
  });

  const warehouseOptions = useMemo(() => {
    const allWarehousesOption = {
      value: '',
      label: t('app.warehouseAllOption')
    };

    const warehouseItems = Array.isArray(warehousesQuery.data)
      ? warehousesQuery.data
      : [];

    if (!warehouseItems.length) {
      if (warehousesQuery.isLoading || warehousesQuery.isFetching) {
        return [
          {
            value: '',
            label: t('app.warehouseLoadingOption')
          }
        ];
      }

      return [allWarehousesOption];
    }

    return [
      allWarehousesOption,
      ...warehouseItems.map((warehouse) => ({
        value: String(warehouse?._id || ''),
        label: `${String(warehouse?.name || 'Warehouse')} (${String(warehouse?.code || '-')})`
      }))
    ];
  }, [
    t,
    warehousesQuery.data,
    warehousesQuery.isFetching,
    warehousesQuery.isLoading
  ]);

  const selectedWarehouseLabel = useMemo(() => {
    if (!activeWarehouseId) {
      return t('app.warehouseAllOption');
    }

    const selectedOption = warehouseOptions.find(
      (option) => String(option?.value || '') === String(activeWarehouseId)
    );

    if (selectedOption?.label) {
      return selectedOption.label;
    }

    return t('app.warehouseSelectedFallback');
  }, [activeWarehouseId, t, warehouseOptions]);

  const refreshWarehouses = useCallback(() => {
    warehousesQuery.refetch();
  }, [warehousesQuery]);

  const tutorialSteps = useMemo(() => {
    const visibleTabKeys = new Set(tabs.map((tab) => tab.key));
    return TUTORIAL_STEPS.filter(
      (step) => !step.tab || visibleTabKeys.has(String(step.tab))
    );
  }, [tabs]);

  useEffect(() => {
    if (!activeWarehouseId) return;
    const exists = warehouseOptions.some(
      (option) => String(option.value || '') === String(activeWarehouseId)
    );

    if (!exists) {
      setActiveWarehouseId('');
    }
  }, [activeWarehouseId, setActiveWarehouseId, warehouseOptions]);

  useEffect(() => {
    const userId = String(user?._id || '').trim();
    const storageKey = userId ? buildTutorialStorageKey(userId) : '';

    if (
      isTutorialDisabledByEnvironment() ||
      !storageKey ||
      !tutorialSteps.length
    ) {
      tutorialUserKeyRef.current = storageKey;
      setTutorialStepIndex(-1);
      return;
    }

    if (tutorialUserKeyRef.current === storageKey) {
      return;
    }

    tutorialUserKeyRef.current = storageKey;
    if (readTutorialCompleted(userId)) {
      setTutorialStepIndex(-1);
      return;
    }

    setActiveTab('dashboard');
    setTutorialStepIndex(0);
  }, [setActiveTab, tutorialSteps.length, user?._id]);

  useEffect(() => {
    if (tutorialStepIndex < 0) return;
    const step = tutorialSteps[tutorialStepIndex];
    if (!step?.tab) return;
    if (String(activeTab || '') === String(step.tab)) return;
    setActiveTab(step.tab);
  }, [activeTab, setActiveTab, tutorialStepIndex, tutorialSteps]);

  const handleFinishTutorial = useCallback(() => {
    const userId = String(user?._id || '').trim();
    if (userId) {
      persistTutorialCompleted(userId);
    }
    setTutorialStepIndex(-1);
  }, [user?._id]);

  const handleNextTutorialStep = useCallback(() => {
    setTutorialStepIndex((current) => {
      if (current < 0) return current;
      if (current >= tutorialSteps.length - 1) {
        const userId = String(user?._id || '').trim();
        if (userId) {
          persistTutorialCompleted(userId);
        }
        return -1;
      }
      return current + 1;
    });
  }, [tutorialSteps.length, user?._id]);

  const handlePreviousTutorialStep = useCallback(() => {
    setTutorialStepIndex((current) => Math.max(0, current - 1));
  }, []);

  const handleReplayTutorial = useCallback(() => {
    const userId = String(user?._id || '').trim();
    if (!tutorialSteps.length || !userId) return;
    clearTutorialCompleted(userId);
    setActiveTab('dashboard');
    setTutorialStepIndex(0);
  }, [setActiveTab, tutorialSteps.length, user?._id]);

  const refreshNotifications = useCallback(async () => {
    if (!accessToken) return;
    setNotificationsLoading(true);

    try {
      const response = await getNotificationsRequest({
        accessToken,
        limit: 20,
        warehouseId: activeWarehouseId || null
      });
      const items = Array.isArray(response?.items) ? response.items : [];
      setNotifications(items);
      setUnreadCount(Number(response?.unreadCount || 0));
    } catch {
      // no-op: keep existing notification state when refresh fails
    } finally {
      setNotificationsLoading(false);
    }
  }, [accessToken, activeWarehouseId]);

  const prefetchCoreData = useCallback(async () => {
    if (!accessToken) return;

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['settings:get', String(accessToken || '')],
        queryFn: () => getSettingsRequest(accessToken)
      }),
      queryClient.prefetchQuery({
        queryKey: [
          'purchase-orders',
          String(accessToken || ''),
          String(activeWarehouseId || '')
        ],
        queryFn: () =>
          getPurchaseOrdersRequest({
            accessToken,
            warehouseId: activeWarehouseId || null
          })
      }),
      queryClient.prefetchQuery({
        queryKey: [
          'products:index',
          String(accessToken || ''),
          String(true),
          String(false),
          String(activeWarehouseId || ''),
          '',
          ''
        ],
        queryFn: () =>
          getProductsRequest(accessToken, {
            warehouseId: activeWarehouseId || null
          })
      })
    ]);
  }, [accessToken, activeWarehouseId, queryClient]);

  const handleMarkNotificationRead = useCallback(
    async (notificationId) => {
      if (!accessToken) return;
      const normalizedId = String(notificationId || '').trim();
      if (!normalizedId) return;

      try {
        await markNotificationReadRequest({
          accessToken,
          notificationId: normalizedId
        });
        await refreshNotifications();
      } catch {
        // no-op
      }
    },
    [accessToken, refreshNotifications]
  );

  const handleMarkAllNotificationsRead = useCallback(async () => {
    if (!accessToken) return;
    try {
      await markAllNotificationsReadRequest({
        accessToken,
        warehouseId: activeWarehouseId || null
      });
      await refreshNotifications();
    } catch {
      // no-op
    }
  }, [accessToken, activeWarehouseId, refreshNotifications]);

  const handleEmployeeSignupDecision = useCallback(
    async ({ notificationId, requestId, decision }) => {
      if (!accessToken) return;
      const normalizedNotificationId = String(notificationId || '').trim();
      const normalizedRequestId = String(requestId || '').trim();
      const normalizedDecision = String(decision || '')
        .trim()
        .toLowerCase();
      if (
        !normalizedNotificationId ||
        !normalizedRequestId ||
        (normalizedDecision !== 'approve' && normalizedDecision !== 'decline')
      ) {
        return;
      }

      setNotificationActionBusyId(normalizedNotificationId);
      try {
        const result = await reviewEmployeeSignupRequest({
          requestId: normalizedRequestId,
          decision: normalizedDecision
        });
        if (!result?.success) return;

        await markNotificationReadRequest({
          accessToken,
          notificationId: normalizedNotificationId
        });
        await refreshNotifications();
      } catch {
        // no-op
      } finally {
        setNotificationActionBusyId('');
      }
    },
    [accessToken, refreshNotifications, reviewEmployeeSignupRequest]
  );

  const handleInventoryUpdated = useCallback((payload) => {
    setInventoryEvents((current) =>
      prependEvent(current, buildInventoryEvent(payload, 'inventory.updated'))
    );
  }, []);

  const handleValuationUpdated = useCallback((payload) => {
    setFinanceEvents((current) =>
      prependEvent(
        current,
        buildFinanceEvent(payload, 'finance.valuation_updated')
      )
    );
  }, []);

  const handleCogsRecorded = useCallback((payload) => {
    setFinanceEvents((current) =>
      prependEvent(current, buildFinanceEvent(payload, 'finance.cogs_recorded'))
    );
  }, []);

  const handlePoCreated = useCallback(
    (payload) => {
      setPoEvents((current) =>
        prependEvent(current, buildPurchaseOrderEvent(payload, 'created'))
      );
      refreshNotifications();
    },
    [refreshNotifications]
  );

  const handlePoUpdated = useCallback(
    (payload) => {
      setPoEvents((current) =>
        prependEvent(current, buildPurchaseOrderEvent(payload, 'updated'))
      );
      refreshNotifications();
    },
    [refreshNotifications]
  );

  const handlePoReceived = useCallback(
    (payload) => {
      setPoEvents((current) =>
        prependEvent(current, buildPurchaseOrderEvent(payload, 'received'))
      );
      refreshNotifications();
    },
    [refreshNotifications]
  );

  const handleEmployeeSignedIn = useCallback(
    (payload) => {
      if (!ADMIN_ROLES.has(String(user?.role || '').toLowerCase())) {
        return;
      }
      setAuthEvents((current) =>
        prependEvent(current, buildAuthEvent(payload))
      );
      refreshNotifications();
    },
    [user?.role, refreshNotifications]
  );

  const handleNotificationCreated = useCallback(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const handleThemeChange = useCallback(
    async (nextThemeId) => {
      if (!isKnownThemeId(nextThemeId)) return;
      setThemeId(nextThemeId);

      if (!accessToken) {
        return;
      }

      await updatePreferences({
        uiTheme: nextThemeId
      });
    },
    [accessToken, updatePreferences]
  );

  useEffect(() => {
    const profileTheme = String(user?.uiTheme || '').trim();
    if (!isKnownThemeId(profileTheme)) {
      return;
    }

    setThemeId((current) =>
      current === profileTheme ? current : profileTheme
    );
  }, [user?.uiTheme]);

  useEffect(() => {
    applyThemePreference(themeId);
    writeThemePreference(themeId);
  }, [themeId]);

  useEffect(() => {
    if (!accessToken) {
      setNotifications([]);
      setUnreadCount(0);
      setNotificationsLoading(false);
      return;
    }

    refreshNotifications();
  }, [accessToken, refreshNotifications]);

  useEffect(() => {
    if (!accessToken) return undefined;
    if (process.env.NODE_ENV === 'test') return undefined;

    const runPrefetch = () => {
      prefetchCoreData();
    };

    if (
      typeof window !== 'undefined' &&
      typeof window.requestIdleCallback === 'function'
    ) {
      const callbackId = window.requestIdleCallback(runPrefetch, {
        timeout: 1200
      });
      return () => {
        window.cancelIdleCallback(callbackId);
      };
    }

    const timeoutId = window.setTimeout(runPrefetch, 250);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [accessToken, prefetchCoreData]);

  useEffect(() => {
    if (hasResolvedInitialTabRef.current) return;

    const tabFromUrl = readTabFromUrl();
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
    hasResolvedInitialTabRef.current = true;
  }, [setActiveTab]);

  useEffect(() => {
    writeTabToUrl(activeTab);
  }, [activeTab]);

  const scopedInventoryEvents = useMemo(() => {
    if (!activeWarehouseId) return inventoryEvents;
    return inventoryEvents.filter(
      (event) =>
        String(resolveWarehouseIdFromPayload(event?.raw) || '') ===
        String(activeWarehouseId)
    );
  }, [activeWarehouseId, inventoryEvents]);

  const scopedFinanceEvents = useMemo(() => {
    if (!activeWarehouseId) return financeEvents;
    return financeEvents.filter(
      (event) =>
        String(resolveWarehouseIdFromPayload(event?.raw) || '') ===
        String(activeWarehouseId)
    );
  }, [activeWarehouseId, financeEvents]);

  const scopedPoEvents = useMemo(() => {
    if (!activeWarehouseId) return poEvents;
    return poEvents.filter(
      (event) =>
        String(resolveWarehouseIdFromPayload(event?.raw) || '') ===
        String(activeWarehouseId)
    );
  }, [activeWarehouseId, poEvents]);

  useEffect(() => {
    setSession({
      userId: user?._id || null,
      role: user?.role || null,
      organizationId: user?.organization || null
    });
  }, [setSession, user]);

  const roleGuardFallback = useMemo(
    () => (
      <GuardFallback
        title="Access denied"
        description="Your role does not have permission to open this section."
      />
    ),
    []
  );

  const organizationGuardFallback = useMemo(
    () => (
      <GuardFallback
        title={t('app.organizationMissingTitle')}
        description={t('app.organizationMissingDescription')}
      />
    ),
    [t]
  );

  const page = useMemo(() => {
    const role = user?.role || null;
    const dashboardNode = (
      <Dashboard
        accessToken={accessToken}
        warehouseId={activeWarehouseId || null}
        activeWarehouseLabel={selectedWarehouseLabel}
        inventoryEvents={scopedInventoryEvents}
        financeEvents={scopedFinanceEvents}
        authEvents={authEvents}
      />
    );

    if (activeTab === 'dashboard') {
      return dashboardNode;
    }
    if (activeTab === 'purchaseOrders') {
      return (
        <RequireRole
          role={role}
          allowedRoles={['owner', 'admin', 'manager']}
          fallback={roleGuardFallback}
        >
          <PurchaseOrders
            accessToken={accessToken}
            warehouseId={activeWarehouseId || null}
            activeWarehouseLabel={selectedWarehouseLabel}
            poEvents={scopedPoEvents}
          />
        </RequireRole>
      );
    }
    if (activeTab === 'products') {
      return (
        <Products
          accessToken={accessToken}
          userRole={role}
          warehouseId={activeWarehouseId || null}
          activeWarehouseLabel={selectedWarehouseLabel}
        />
      );
    }
    if (activeTab === 'stocktakes') {
      return (
        <RequireRole
          role={role}
          allowedRoles={['owner', 'admin', 'manager']}
          fallback={roleGuardFallback}
        >
          <Stocktakes
            accessToken={accessToken}
            warehouseId={activeWarehouseId || null}
            activeWarehouseLabel={selectedWarehouseLabel}
          />
        </RequireRole>
      );
    }
    if (activeTab === 'warehouses') {
      return (
        <RequireRole
          role={role}
          allowedRoles={['owner', 'admin', 'manager']}
          fallback={roleGuardFallback}
        >
          <Warehouses
            accessToken={accessToken}
            userRole={role}
            warehouseId={activeWarehouseId || null}
            activeWarehouseLabel={selectedWarehouseLabel}
            onWarehousesChanged={refreshWarehouses}
          />
        </RequireRole>
      );
    }
    if (activeTab === 'suppliers') {
      return (
        <RequireRole
          role={role}
          allowedRoles={['owner', 'admin', 'manager']}
          fallback={roleGuardFallback}
        >
          <Suppliers accessToken={accessToken} userRole={role} />
        </RequireRole>
      );
    }
    if (activeTab === 'reports') {
      return (
        <RequireRole
          role={role}
          allowedRoles={['owner', 'admin', 'manager']}
          fallback={roleGuardFallback}
        >
          <Reports
            accessToken={accessToken}
            userRole={role}
            warehouseId={activeWarehouseId || null}
            activeWarehouseLabel={selectedWarehouseLabel}
          />
        </RequireRole>
      );
    }
    if (activeTab === 'users') {
      return (
        <RequireRole
          role={role}
          allowedRoles={['owner', 'admin']}
          fallback={roleGuardFallback}
        >
          <Users
            accessToken={accessToken}
            userRole={role}
            currentUserId={user?._id || null}
          />
        </RequireRole>
      );
    }
    if (activeTab === 'account') {
      return (
        <Account
          user={user}
          accessToken={accessToken}
          onSessionInvalidated={onSessionInvalidated}
        />
      );
    }
    if (activeTab === 'settings') {
      return (
        <Settings
          accessToken={accessToken}
          userRole={role}
          currentUser={user}
          themeId={themeId}
          isTutorialRunning={tutorialStepIndex >= 0}
          onThemeChange={handleThemeChange}
          onReplayTutorial={handleReplayTutorial}
          onUpdateUserPreferences={updatePreferences}
        />
      );
    }
    return dashboardNode;
  }, [
    activeTab,
    accessToken,
    user,
    activeWarehouseId,
    selectedWarehouseLabel,
    scopedInventoryEvents,
    scopedFinanceEvents,
    authEvents,
    scopedPoEvents,
    themeId,
    tutorialStepIndex,
    handleThemeChange,
    handleReplayTutorial,
    refreshWarehouses,
    onSessionInvalidated,
    updatePreferences,
    roleGuardFallback
  ]);

  const dashboardShellFallback = (
    <AuthLayout
      eyebrow={t('app.brand')}
      title={t('app.loadingSessionTitle')}
      description={t('app.loadingSessionDescription')}
    >
      <section className="auth-card">
        <p className="form-copy">Loading workspace...</p>
      </section>
    </AuthLayout>
  );

  return (
    <RequireOrganization
      hasOrganization={Boolean(user?.organization)}
      fallback={organizationGuardFallback}
    >
      <Suspense fallback={null}>
        <AuthenticatedRealtimeController
          baseUrl={realtimeBaseUrl}
          accessToken={accessToken}
          warehouseId={activeWarehouseId || null}
          isOnline={isOnline}
          isAuthenticated
          setIsOnline={setIsOnline}
          setOfflineQueueSize={setOfflineQueueSize}
          onInventoryUpdated={handleInventoryUpdated}
          onPurchaseOrderCreated={handlePoCreated}
          onPurchaseOrderUpdated={handlePoUpdated}
          onPurchaseOrderReceived={handlePoReceived}
          onCogsRecorded={handleCogsRecorded}
          onValuationUpdated={handleValuationUpdated}
          onEmployeeSignedIn={handleEmployeeSignedIn}
          onNotificationCreated={handleNotificationCreated}
        />
      </Suspense>
      <Suspense fallback={dashboardShellFallback}>
        <AuthenticatedDashboardShell
          companyName={companyName}
          warehouseId={activeWarehouseId}
          warehouseOptions={warehouseOptions}
          warehouseDisabled={
            warehousesQuery.isLoading || warehousesQuery.isFetching
          }
          warehouseLabel={t('app.warehouseLabel')}
          warehousePlaceholder={t('app.warehousePlaceholder')}
          statusOnlineLabel={t('app.online')}
          statusOfflineLabel={t('app.offline')}
          queueLabel={t('app.queue')}
          signOutLabel={t('app.signOut')}
          onWarehouseChange={setActiveWarehouseId}
          isOnline={isOnline}
          offlineQueueSize={offlineQueueSize}
          notificationsNode={
            <Suspense fallback={null}>
              <NotificationBell
                count={unreadCount}
                items={notifications}
                isLoading={notificationsLoading}
                actionBusyNotificationId={notificationActionBusyId}
                currentUserRole={String(user?.role || '').toLowerCase()}
                onRefresh={refreshNotifications}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onMarkRead={handleMarkNotificationRead}
                onEmployeeSignupDecision={handleEmployeeSignupDecision}
              />
            </Suspense>
          }
          onLogout={onLogout}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          <Suspense
            fallback={
              <section className="panel">
                <article className="event-card">
                  <p className="event-sub">Loading section...</p>
                </article>
              </section>
            }
          >
            {page}
          </Suspense>
          {tutorialStepIndex >= 0 ? (
            <Suspense fallback={null}>
              <BeginnerTutorial
                steps={tutorialSteps}
                currentIndex={tutorialStepIndex}
                onNext={handleNextTutorialStep}
                onPrevious={handlePreviousTutorialStep}
                onSkip={handleFinishTutorial}
              />
            </Suspense>
          ) : null}
        </AuthenticatedDashboardShell>
      </Suspense>
    </RequireOrganization>
  );
};

export default AuthenticatedWorkspace;
