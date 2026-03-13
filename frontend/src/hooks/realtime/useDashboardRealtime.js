import { useInvendexRealtime } from './useInvendexRealtime.js';

export const useDashboardRealtime = ({
  baseUrl,
  accessToken,
  warehouseId = null,
  onInventoryChange = null,
  onValuationChange = null,
  onCogsRecorded = null
}) =>
  useInvendexRealtime({
    baseUrl,
    accessToken,
    warehouseId,
    onInventoryUpdated: onInventoryChange,
    onValuationUpdated: onValuationChange,
    onCogsRecorded
  });

export default useDashboardRealtime;
