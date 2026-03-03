import aiInsightsRoutes from './aiInsightsRoutes.js';
import auditLogRoutes from './auditLogRoutes.js';
import complianceRoutes from './complianceRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import featureFlagRoutes from './featureFlagRoutes.js';
import financeRoutes from './financeRoutes.js';
import forecastRoutes from './forecastRoutes.js';
import forecastTrustRoutes from './forecastTrustRoutes.js';
import inventoryMetricsRoutes from './inventoryMetricsRoutes.js';
import inventoryReportRoutes from './inventoryReportRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import inventoryTrackingRoutes from './inventoryTrackingRoutes.js';
import mobileSyncRoutes from './mobileSyncRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import onboardingRoutes from './onboardingRoutes.js';
import orderRoutes from './orderRoutes.js';
import observabilityRoutes from './observabilityRoutes.js';
import productRoutes from './productRoutes.js';
import purchaseOrderRoutes from './purchaseOrderRoutes.js';
import reorderAlertRoutes from './reorderAlertRoutes.js';
import reorderAnalysisRoutes from './reorderAnalysisRoutes.js';
import reportRoutes from './reportRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import supplierProductRoutes from './supplierProductRoutes.js';
import supplierRoutes from './supplierRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import userRoutes from './userRoutes.js';
import wmsRoutes from './wmsRoutes.js';

export const API_ROUTE_REGISTRY = Object.freeze([
  { path: '/products', router: productRoutes, tag: 'Products' },
  { path: '/inventory', router: inventoryRoutes, tag: 'Inventory' },
  {
    path: '/inventory-tracking',
    router: inventoryTrackingRoutes,
    tag: 'Inventory Tracking'
  },
  {
    path: '/inventory-reports',
    router: inventoryReportRoutes,
    tag: 'Inventory Reports'
  },
  {
    path: '/inventory-metrics',
    router: inventoryMetricsRoutes,
    tag: 'Inventory Metrics'
  },
  { path: '/suppliers', router: supplierRoutes, tag: 'Suppliers' },
  {
    path: '/subscriptions',
    router: subscriptionRoutes,
    tag: 'Subscriptions'
  },
  {
    path: '/supplier-products',
    router: supplierProductRoutes,
    tag: 'Supplier Products'
  },
  {
    path: '/purchase-orders',
    router: purchaseOrderRoutes,
    tag: 'Purchase Orders'
  },
  { path: '/orders', router: orderRoutes, tag: 'Orders' },
  { path: '/dashboard', router: dashboardRoutes, tag: 'Dashboard' },
  { path: '/feature-flags', router: featureFlagRoutes, tag: 'Feature Flags' },
  { path: '/ai', router: aiInsightsRoutes, tag: 'AI Insights' },
  { path: '/wms', router: wmsRoutes, tag: 'Warehouse Management' },
  { path: '/finance', router: financeRoutes, tag: 'Finance' },
  { path: '/forecast', router: forecastRoutes, tag: 'Forecasting' },
  { path: '/audit-logs', router: auditLogRoutes, tag: 'Audit Logs' },
  {
    path: '/reorder-alerts',
    router: reorderAlertRoutes,
    tag: 'Reorder Alerts'
  },
  {
    path: '/reorder-analysis',
    router: reorderAnalysisRoutes,
    tag: 'Reorder Analysis'
  },
  {
    path: '/forecast-trust',
    router: forecastTrustRoutes,
    tag: 'Forecast Trust'
  },
  { path: '/reports', router: reportRoutes, tag: 'Reports' },
  { path: '/users', router: userRoutes, tag: 'Users' },
  {
    path: '/observability',
    router: observabilityRoutes,
    tag: 'Observability'
  },
  { path: '/mobile-sync', router: mobileSyncRoutes, tag: 'Mobile Sync' },
  { path: '/settings', router: settingsRoutes, tag: 'Settings' },
  { path: '/notifications', router: notificationRoutes, tag: 'Notifications' },
  { path: '/onboarding', router: onboardingRoutes, tag: 'Onboarding' },
  { path: '/compliance', router: complianceRoutes, tag: 'Compliance' }
]);

export default API_ROUTE_REGISTRY;
