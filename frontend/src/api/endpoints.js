export const API_ENDPOINTS = Object.freeze({
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_ME: '/auth/me',
  PRODUCTS: '/api/products',
  PRODUCTS_LOW_STOCK_SUMMARY: '/api/products/alerts/low-stock/summary',
  SUPPLIERS: '/api/suppliers',
  SUPPLIERS_RANKINGS: '/api/suppliers/rankings',
  REPORT_PO_STATUS_SUMMARY: '/api/reports/purchase-orders/status-summary',
  REPORT_SPEND_SUMMARY: '/api/reports/spend/summary',
  REPORT_SPEND_BY_SUPPLIER: '/api/reports/spend/by-supplier'
});

export default API_ENDPOINTS;
