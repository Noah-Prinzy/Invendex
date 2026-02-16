import { useLedgerlyRealtime } from './useLedgerlyRealtime.js';

export const useDashboardRealtime = ({
  baseUrl,
  accessToken,
  warehouseId = null,
  onInventoryChange = null,
  onValuationChange = null,
  onCogsRecorded = null
}) =>
  useLedgerlyRealtime({
    baseUrl,
    accessToken,
    warehouseId,
    onInventoryUpdated: onInventoryChange,
    onValuationUpdated: onValuationChange,
    onCogsRecorded
  });

export default useDashboardRealtime;
