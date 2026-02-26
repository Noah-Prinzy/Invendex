import { io } from 'socket.io-client';
import REALTIME_EVENTS from './events.js';
import { captureFrontendException } from '../observability/errorTracker.js';
import { getClientTraceId } from '../observability/traceContext.js';

const DEFAULT_TIMEOUT_MS = 10000;

export class LedgerlyRealtimeClient {
  constructor({
    baseUrl = '',
    getAccessToken = () => null,
    autoConnect = false,
    timeoutMs = DEFAULT_TIMEOUT_MS
  } = {}) {
    this.baseUrl = baseUrl;
    this.getAccessToken = getAccessToken;
    this.timeoutMs = timeoutMs;
    this.socket = null;
    this.handlers = new Map();

    if (autoConnect) {
      this.connect();
    }
  }

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = this.getAccessToken?.();
    const clientTraceId = getClientTraceId();
    this.socket = io(this.baseUrl, {
      transports: ['websocket'],
      reconnection: true,
      timeout: this.timeoutMs,
      auth: token ? { token, clientTraceId } : { clientTraceId }
    });

    this.socket.on('connect_error', error => {
      captureFrontendException(error, {
        scope: 'realtime_connect_error',
        baseUrl: this.baseUrl,
        clientTraceId
      }).catch(() => {});

      if (process.env.NODE_ENV !== 'production') {
        console.error('[realtime] connect_error:', error?.message || error);
      }
    });

    return this.socket;
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }

  subscribeWarehouse(warehouseId) {
    if (!this.socket) return;
    this.socket.emit('subscribe:warehouse', { warehouseId });
  }

  unsubscribeWarehouse(warehouseId) {
    if (!this.socket) return;
    this.socket.emit('unsubscribe:warehouse', { warehouseId });
  }

  on(eventName, callback) {
    if (!this.socket) this.connect();
    if (!this.socket) return () => {};

    this.socket.on(eventName, callback);
    const key = `${eventName}:${callback.toString()}:${Date.now()}`;
    this.handlers.set(key, { eventName, callback });

    return () => {
      this.off(eventName, callback);
      this.handlers.delete(key);
    };
  }

  off(eventName, callback) {
    if (!this.socket) return;
    this.socket.off(eventName, callback);
  }

  onInventoryUpdated(callback) {
    return this.on(REALTIME_EVENTS.INVENTORY_UPDATED, callback);
  }

  onPurchaseOrderCreated(callback) {
    return this.on(REALTIME_EVENTS.PURCHASE_ORDER_CREATED, callback);
  }

  onPurchaseOrderUpdated(callback) {
    return this.on(REALTIME_EVENTS.PURCHASE_ORDER_UPDATED, callback);
  }

  onPurchaseOrderReceived(callback) {
    return this.on(REALTIME_EVENTS.PURCHASE_ORDER_RECEIVED, callback);
  }

  onCogsRecorded(callback) {
    return this.on(REALTIME_EVENTS.FINANCE_COGS_RECORDED, callback);
  }

  onValuationUpdated(callback) {
    return this.on(REALTIME_EVENTS.FINANCE_VALUATION_UPDATED, callback);
  }

  onEmployeeSignedIn(callback) {
    return this.on(REALTIME_EVENTS.AUTH_EMPLOYEE_SIGNED_IN, callback);
  }
}

export const createLedgerlyRealtimeClient = options =>
  new LedgerlyRealtimeClient(options);

export default LedgerlyRealtimeClient;
