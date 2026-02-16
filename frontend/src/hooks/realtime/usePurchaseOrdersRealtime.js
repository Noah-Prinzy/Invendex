import { useLedgerlyRealtime } from './useLedgerlyRealtime.js';

export const usePurchaseOrdersRealtime = ({
  baseUrl,
  accessToken,
  warehouseId = null,
  onPurchaseOrderCreated = null,
  onPurchaseOrderUpdated = null,
  onPurchaseOrderReceived = null
}) =>
  useLedgerlyRealtime({
    baseUrl,
    accessToken,
    warehouseId,
    onPurchaseOrderCreated,
    onPurchaseOrderUpdated,
    onPurchaseOrderReceived
  });

export default usePurchaseOrdersRealtime;
