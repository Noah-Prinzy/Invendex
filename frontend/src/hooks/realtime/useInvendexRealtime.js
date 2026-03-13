import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import REALTIME_EVENTS from '../../realtime/events.js';
import { invalidateQueriesForRealtimeEvent } from '../../realtime/queryInvalidation.js';

export const useInvendexRealtime = ({
  baseUrl,
  accessToken,
  warehouseId = null,
  onInventoryUpdated = null,
  onPurchaseOrderCreated = null,
  onPurchaseOrderUpdated = null,
  onPurchaseOrderReceived = null,
  onCogsRecorded = null,
  onValuationUpdated = null,
  onEmployeeSignedIn = null,
  onNotificationCreated = null
}) => {
  const queryClient = useQueryClient();
  const tokenRef = useRef(accessToken || null);
  const clientRef = useRef(null);
  tokenRef.current = accessToken || null;

  useEffect(() => {
    if (!accessToken) {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      return undefined;
    }

    let isDisposed = false;
    let client = null;
    const unsubscribers = [];
    const subscribeWithInvalidation = (subscribeFn, eventName, callback) => {
      unsubscribers.push(
        subscribeFn((payload) => {
          invalidateQueriesForRealtimeEvent({
            queryClient,
            eventName,
            accessToken: tokenRef.current || ''
          });
          if (typeof callback === 'function') {
            callback(payload);
          }
        })
      );
    };

    const startRealtime = async () => {
      try {
        const { createInvendexRealtimeClient } =
          await import('../../realtime/socketClient.js');

        if (isDisposed) return;

        client = createInvendexRealtimeClient({
          baseUrl,
          getAccessToken: () => tokenRef.current,
          autoConnect: false
        });
        clientRef.current = client;

        client.connect();
        if (warehouseId) {
          client.subscribeWarehouse(warehouseId);
        }

        subscribeWithInvalidation(
          client.onInventoryUpdated.bind(client),
          REALTIME_EVENTS.INVENTORY_UPDATED,
          onInventoryUpdated
        );
        subscribeWithInvalidation(
          client.onPurchaseOrderCreated.bind(client),
          REALTIME_EVENTS.PURCHASE_ORDER_CREATED,
          onPurchaseOrderCreated
        );
        subscribeWithInvalidation(
          client.onPurchaseOrderUpdated.bind(client),
          REALTIME_EVENTS.PURCHASE_ORDER_UPDATED,
          onPurchaseOrderUpdated
        );
        subscribeWithInvalidation(
          client.onPurchaseOrderReceived.bind(client),
          REALTIME_EVENTS.PURCHASE_ORDER_RECEIVED,
          onPurchaseOrderReceived
        );
        subscribeWithInvalidation(
          client.onCogsRecorded.bind(client),
          REALTIME_EVENTS.FINANCE_COGS_RECORDED,
          onCogsRecorded
        );
        subscribeWithInvalidation(
          client.onValuationUpdated.bind(client),
          REALTIME_EVENTS.FINANCE_VALUATION_UPDATED,
          onValuationUpdated
        );
        subscribeWithInvalidation(
          client.onEmployeeSignedIn.bind(client),
          REALTIME_EVENTS.AUTH_EMPLOYEE_SIGNED_IN,
          onEmployeeSignedIn
        );
        subscribeWithInvalidation(
          client.onNotificationCreated.bind(client),
          REALTIME_EVENTS.NOTIFICATION_CREATED,
          onNotificationCreated
        );
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[realtime] failed to start client:', error);
        }
      }
    };

    void startRealtime();

    return () => {
      isDisposed = true;

      if (warehouseId && client) {
        client.unsubscribeWarehouse(warehouseId);
      }
      for (const unsubscribe of unsubscribers) {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      }
      if (client) {
        client.disconnect();
      }
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [
    baseUrl,
    accessToken,
    warehouseId,
    onInventoryUpdated,
    onPurchaseOrderCreated,
    onPurchaseOrderUpdated,
    onPurchaseOrderReceived,
    onCogsRecorded,
    onValuationUpdated,
    onEmployeeSignedIn,
    onNotificationCreated,
    queryClient
  ]);

  return clientRef.current;
};

export default useInvendexRealtime;
