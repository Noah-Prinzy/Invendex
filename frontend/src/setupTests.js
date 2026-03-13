import { act } from '@testing-library/react';
import { notifyManager } from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';

// React Query schedules observer updates outside React's event system.
// In tests, wrap those notifications in act() so state flushes stay deterministic.
notifyManager.setNotifyFunction((callback) => {
  act(callback);
});
