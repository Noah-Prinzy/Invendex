import { useEffect, useMemo, useRef } from 'react';
import { createLedgerlyRealtimeClient } from '../../realtime/socketClient.js';

export const useLedgerlyRealtime = ({
  baseUrl,
  accessToken,
  warehouseId = null,
  onInventoryUpdated = null,
  onPurchaseOrderCreated = null,
  onPurchaseOrderUpdated = null,
  onPurchaseOrderReceived = null,
  onCogsRecorded = null,
  onValuationUpdated = null
}) => {
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

    if (typeof onInventoryUpdated === 'function') {
      unsubscribers.push(client.onInventoryUpdated(onInventoryUpdated));
    }
    if (typeof onPurchaseOrderCreated === 'function') {
      unsubscribers.push(client.onPurchaseOrderCreated(onPurchaseOrderCreated));
    }
    if (typeof onPurchaseOrderUpdated === 'function') {
      unsubscribers.push(client.onPurchaseOrderUpdated(onPurchaseOrderUpdated));
    }
    if (typeof onPurchaseOrderReceived === 'function') {
      unsubscribers.push(client.onPurchaseOrderReceived(onPurchaseOrderReceived));
    }
    if (typeof onCogsRecorded === 'function') {
      unsubscribers.push(client.onCogsRecorded(onCogsRecorded));
    }
    if (typeof onValuationUpdated === 'function') {
      unsubscribers.push(client.onValuationUpdated(onValuationUpdated));
    }

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
    onValuationUpdated
  ]);

  return client;
};

export default useLedgerlyRealtime;
