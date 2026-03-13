import { fireEvent, render, waitFor } from '@testing-library/react';
import {
  flushOfflineMutations,
  getOfflineQueueSize
} from '../../offline/offlineQueue.js';
import { useOfflineSync } from './useOfflineSync.js';

vi.mock('../../api/client.js', () => ({
  API_BASE_URL: 'http://localhost:4000'
}));

vi.mock('../../offline/offlineQueue.js', () => ({
  flushOfflineMutations: vi.fn(),
  getOfflineQueueSize: vi.fn()
}));

const HookHarness = (props) => {
  useOfflineSync(props);
  return null;
};

describe('useOfflineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOfflineQueueSize.mockReturnValue(0);
    flushOfflineMutations.mockResolvedValue({
      attempted: 0,
      applied: 0,
      failed: 0,
      remaining: 0
    });
  });

  it('syncs queue size on mount and reacts to browser online/offline events', () => {
    const setIsOnline = vi.fn();
    const setOfflineQueueSize = vi.fn();
    getOfflineQueueSize.mockReturnValue(3);

    render(
      <HookHarness
        isOnline={false}
        isAuthenticated={false}
        accessToken=""
        setIsOnline={setIsOnline}
        setOfflineQueueSize={setOfflineQueueSize}
      />
    );

    expect(setOfflineQueueSize).toHaveBeenCalledWith(3);

    fireEvent(window, new Event('offline'));
    fireEvent(window, new Event('online'));

    expect(setIsOnline).toHaveBeenCalledWith(false);
    expect(setIsOnline).toHaveBeenCalledWith(true);
  });

  it('flushes queued mutations when online and authenticated', async () => {
    const setIsOnline = vi.fn();
    const setOfflineQueueSize = vi.fn();
    flushOfflineMutations.mockResolvedValue({
      attempted: 2,
      applied: 2,
      failed: 0,
      remaining: 1
    });

    render(
      <HookHarness
        isOnline={true}
        isAuthenticated={true}
        accessToken="token-1"
        setIsOnline={setIsOnline}
        setOfflineQueueSize={setOfflineQueueSize}
      />
    );

    await waitFor(() => {
      expect(flushOfflineMutations).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'token-1',
          baseUrl: expect.any(String)
        })
      );
    });

    await waitFor(() => {
      expect(setOfflineQueueSize).toHaveBeenLastCalledWith(1);
    });
  });

  it('does not flush when offline or unauthenticated', async () => {
    const setIsOnline = vi.fn();
    const setOfflineQueueSize = vi.fn();

    render(
      <HookHarness
        isOnline={false}
        isAuthenticated={false}
        accessToken=""
        setIsOnline={setIsOnline}
        setOfflineQueueSize={setOfflineQueueSize}
      />
    );

    await waitFor(() => {
      expect(flushOfflineMutations).not.toHaveBeenCalled();
    });
  });
});
