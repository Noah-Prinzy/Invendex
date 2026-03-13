let backgroundServicesPromise = null;

export const startBackgroundServices = () => {
  if (!backgroundServicesPromise) {
    backgroundServicesPromise = Promise.allSettled([
      import('../observability/errorTracker.js').then(
        ({ initGlobalErrorTracking }) => {
          initGlobalErrorTracking();
        }
      ),
      import('../offline/registerServiceWorker.js').then(
        ({ registerInvendexServiceWorker }) => {
          registerInvendexServiceWorker();
        }
      )
    ]);
  }

  return backgroundServicesPromise;
};

export default startBackgroundServices;
