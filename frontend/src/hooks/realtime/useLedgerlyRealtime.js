import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createLedgerlyRealtimeClient } from '../../realtime/socketClient.js';
import REALTIME_EVENTS from '../../realtime/events.js';
import { invalidateQueriesForRealtimeEvent } from '../../realtime/queryInvalidation.js';

export const useLedgerlyRealtime = ({
  baseUrl,
  accessToken,
  warehouseId = null,
  onInventoryUpdated = null,
  onPurchaseOrderCreated = null,
  onPurchaseOrderUpdated = null,
  onPurchaseOrderReceived = null,
  onCogsRecorded = null,
  onValuationUpdated = null,
  onEmployeeSignedIn = null
}) => {
  const queryClient = useQueryClient();
  const tokenRef = useRef(accessToken || null);
  tokenRef.current = accessToken || null;

  const client = useMemo(
    () =>
      createLedgerlyRealtimeClient({
        baseUrl,
        getAccessToken: () => tokenRef.current,
        autoConnect: false
      }),
    [baseUrl]
  );

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    client.connect();
    if (warehouseId) {
      client.subscribeWarehouse(warehouseId);
    }

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

    return () => {
      if (warehouseId) {
        client.unsubscribeWarehouse(warehouseId);
      }
      for (const unsubscribe of unsubscribers) {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      }
      client.disconnect();
    };
  }, [
    client,
    accessToken,
    warehouseId,
    onInventoryUpdated,
    onPurchaseOrderCreated,
    onPurchaseOrderUpdated,
    onPurchaseOrderReceived,
    onCogsRecorded,
    onValuationUpdated,
    onEmployeeSignedIn,
    queryClient
  ]);

  return client;
};

export default useLedgerlyRealtime;
