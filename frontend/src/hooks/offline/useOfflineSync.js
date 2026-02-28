import { useEffect } from 'react';
import { API_BASE_URL } from '../../api/client.js';
import {
  flushOfflineMutations,
  getOfflineQueueSize
} from '../../offline/offlineQueue.js';

export const useOfflineSync = ({
  isOnline,
  isAuthenticated,
  accessToken,
  setIsOnline,
  setOfflineQueueSize
}) => {
  useEffect(() => {
    setOfflineQueueSize(getOfflineQueueSize());
  }, [setOfflineQueueSize]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setIsOnline]);

  useEffect(() => {
    if (!isOnline || !isAuthenticated || !accessToken) {
      return;
    }

    let cancelled = false;

    const flush = async () => {
      const result = await flushOfflineMutations({
        accessToken,
        baseUrl: API_BASE_URL
      });

      if (cancelled) return;
      setOfflineQueueSize(Number(result?.remaining || 0));
    };

    flush().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isOnline, isAuthenticated, accessToken, setOfflineQueueSize]);
};

export default useOfflineSync;
