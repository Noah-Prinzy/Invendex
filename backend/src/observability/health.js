import mongoose from 'mongoose';
import { getRealtimeEmitStats } from '../realtime/publisher.js';

const CONNECTION_STATE = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

const withTimeout = (promise, timeoutMs) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Operation timed out'));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });

const getMemory = () => {
  const usage = process.memoryUsage();
  return {
    rssMb: Number((usage.rss / 1024 / 1024).toFixed(2)),
    heapUsedMb: Number((usage.heapUsed / 1024 / 1024).toFixed(2)),
    heapTotalMb: Number((usage.heapTotal / 1024 / 1024).toFixed(2))
  };
};

const baseHealth = () => ({
  service: 'ledgerly-backend',
  uptimeSeconds: Number(process.uptime().toFixed(2)),
  timestamp: new Date().toISOString(),
  memory: getMemory()
});

export const getLivenessHealth = () => ({
  status: 'ok',
  ...baseHealth()
});

export const getReadinessHealth = async () => {
  const stateCode = mongoose.connection.readyState;
  const state = CONNECTION_STATE[stateCode] || 'unknown';

  let mongoPingOk = false;
  let pingError = null;
  const timeoutMs = Number(process.env.HEALTHCHECK_DB_TIMEOUT_MS || 1000);

  if (stateCode === 1 && mongoose.connection?.db?.admin) {
    try {
      await withTimeout(mongoose.connection.db.admin().ping(), timeoutMs);
      mongoPingOk = true;
    } catch (error) {
      pingError = error.message;
    }
  }

  const ready = stateCode === 1 && mongoPingOk;

  return {
    status: ready ? 'ready' : 'degraded',
    ready,
    ...baseHealth(),
    db: {
      state,
      pingOk: mongoPingOk,
      pingError
    },
    realtime: {
      enabled:
        String(process.env.REALTIME_ENABLED || 'false').toLowerCase() ===
        'true',
      emittedEvents: getRealtimeEmitStats()
    }
  };
};

export default {
  getLivenessHealth,
  getReadinessHealth
};
