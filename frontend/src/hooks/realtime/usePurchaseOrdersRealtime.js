import { useInvendexRealtime } from './useInvendexRealtime.js';

export const usePurchaseOrdersRealtime = ({
  baseUrl,
  accessToken,
  warehouseId = null,
  onPurchaseOrderCreated = null,
  onPurchaseOrderUpdated = null,
  onPurchaseOrderReceived = null
}) =>
  useInvendexRealtime({
    baseUrl,
    accessToken,
    warehouseId,
    onPurchaseOrderCreated,
    onPurchaseOrderUpdated,
    onPurchaseOrderReceived
  });

export default usePurchaseOrdersRealtime;
