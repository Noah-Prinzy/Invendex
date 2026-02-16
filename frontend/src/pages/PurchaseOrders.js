import React, { useMemo, useState } from 'react';
import usePurchaseOrdersRealtime from '../hooks/realtime/usePurchaseOrdersRealtime.js';

const PurchaseOrders = ({ accessToken, warehouseId = null }) => {
  const [lastPoEvent, setLastPoEvent] = useState(null);

  const realtimeBaseUrl = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : ''),
    []
  );

  usePurchaseOrdersRealtime({
    baseUrl: realtimeBaseUrl,
    accessToken,
    warehouseId,
    onPurchaseOrderCreated: payload => setLastPoEvent(payload),
    onPurchaseOrderUpdated: payload => setLastPoEvent(payload),
    onPurchaseOrderReceived: payload => setLastPoEvent(payload)
  });

  return (
    <section>
      <h1>Purchase Orders</h1>
      <p>Realtime socket connected for purchase order events.</p>
      <pre>{JSON.stringify(lastPoEvent, null, 2)}</pre>
    </section>
  );
};

export default PurchaseOrders;
