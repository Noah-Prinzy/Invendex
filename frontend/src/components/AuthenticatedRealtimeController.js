import { useInvendexRealtime } from '../hooks/realtime/useInvendexRealtime.js';
import { useOfflineSync } from '../hooks/offline/useOfflineSync.js';

const AuthenticatedRealtimeController = ({
  baseUrl,
  accessToken,
  warehouseId,
  isOnline,
  isAuthenticated,
  setIsOnline,
  setOfflineQueueSize,
  onInventoryUpdated,
  onPurchaseOrderCreated,
  onPurchaseOrderUpdated,
  onPurchaseOrderReceived,
  onCogsRecorded,
  onValuationUpdated,
  onEmployeeSignedIn,
  onNotificationCreated
}) => {
  useInvendexRealtime({
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
    onNotificationCreated
  });

  useOfflineSync({
    isOnline,
    isAuthenticated,
    accessToken,
    setIsOnline,
    setOfflineQueueSize
  });

  return null;
};

export default AuthenticatedRealtimeController;
