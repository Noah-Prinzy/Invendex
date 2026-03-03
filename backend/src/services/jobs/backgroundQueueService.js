import { logger } from '../../observability/logger.js';

const DEFAULT_QUEUE_NAME = 'ledgerly:background-jobs';

const asString = (value) => String(value || '').trim();
const asBoolean = (value) =>
  ['1', 'true', 'yes', 'on'].includes(asString(value).toLowerCase());
const asInteger = (value) => {
  const parsed = Number.parseInt(asString(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveQueueEnabled = () =>
  asBoolean(process.env.BACKGROUND_JOB_QUEUE_ENABLED);

const resolveInlineWorkerEnabled = () => {
  const explicit = asString(process.env.BACKGROUND_JOB_RUN_INLINE_WORKER);
  if (explicit) return asBoolean(explicit);
  return asString(process.env.NODE_ENV || 'development') !== 'production';
};

const resolveQueueName = () =>
  asString(process.env.BACKGROUND_JOB_QUEUE_NAME) || DEFAULT_QUEUE_NAME;

const resolveRedisUrl = () =>
  asString(
    process.env.BACKGROUND_JOB_REDIS_URL ||
      process.env.REALTIME_REDIS_URL ||
      process.env.RATE_LIMIT_REDIS_URL
  );

const resolveWorkerConcurrency = () => {
  const configured = asInteger(process.env.BACKGROUND_JOB_WORKER_CONCURRENCY);
  if (configured == null) return 3;
  return Math.max(1, Math.min(configured, 50));
};

let queue = null;
let queueConnection = null;
let worker = null;
let workerConnection = null;

let queueState = {
  enabled: false,
  queueReady: false,
  workerReady: false,
  usingBullMq: false,
  queueName: resolveQueueName(),
  reason: 'not_initialized'
};

const resetState = (reason) => {
  queueState = {
    enabled: resolveQueueEnabled(),
    queueReady: false,
    workerReady: false,
    usingBullMq: false,
    queueName: resolveQueueName(),
    reason
  };
};

export const initializeBackgroundJobQueue = async () => {
  const enabled = resolveQueueEnabled();
  resetState(enabled ? 'initializing' : 'not_enabled');

  if (!enabled) {
    return false;
  }

  if (queue && queueState.queueReady) {
    return true;
  }

  const redisUrl = resolveRedisUrl();
  if (!redisUrl) {
    queueState.reason = 'redis_url_missing';
    logger.warn('background_job_queue_redis_url_missing');
    return false;
  }

  try {
    const [{ Queue }, { default: IORedis }] = await Promise.all([
      import('bullmq'),
      import('ioredis')
    ]);

    queueConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null
    });
    queue = new Queue(resolveQueueName(), {
      connection: queueConnection,
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 1000 }
      }
    });

    await queue.waitUntilReady();

    queueState = {
      ...queueState,
      queueReady: true,
      usingBullMq: true,
      reason: 'ok'
    };

    logger.info('background_job_queue_initialized', {
      queueName: resolveQueueName()
    });
    return true;
  } catch (error) {
    queueState.reason = 'queue_init_failed';
    logger.warn('background_job_queue_init_failed', {
      err: error
    });
    await shutdownBackgroundJobQueue();
    resetState('queue_init_failed');
    return false;
  }
};

export const enqueueBackgroundJob = async ({ jobId, type, organizationId }) => {
  if (!queueState.usingBullMq || !queue) {
    return false;
  }

  const normalizedJobId = asString(jobId);
  if (!normalizedJobId) {
    return false;
  }

  try {
    await queue.add(
      String(type || 'BACKGROUND_JOB'),
      {
        jobId: normalizedJobId,
        type: String(type || ''),
        organizationId: String(organizationId || '')
      },
      {
        jobId: normalizedJobId
      }
    );
    return true;
  } catch (error) {
    logger.warn('background_job_queue_enqueue_failed', {
      jobId: normalizedJobId,
      err: error
    });
    return false;
  }
};

export const startBackgroundJobWorker = async ({ force = false } = {}) => {
  if (!force && !resolveInlineWorkerEnabled()) {
    queueState.reason = queueState.queueReady ? 'inline_worker_disabled' : 'ok';
    return false;
  }

  if (!queueState.queueReady || !queueState.usingBullMq) {
    const initialized = await initializeBackgroundJobQueue();
    if (!initialized) {
      return false;
    }
  }

  if (worker && queueState.workerReady) {
    return true;
  }

  const redisUrl = resolveRedisUrl();
  if (!redisUrl) {
    queueState.reason = 'worker_redis_url_missing';
    return false;
  }

  try {
    const [{ Worker }, { default: IORedis }, { processQueuedBackgroundJob }] =
      await Promise.all([
        import('bullmq'),
        import('ioredis'),
        import('./backgroundJobProcessor.js')
      ]);

    workerConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null
    });

    worker = new Worker(
      resolveQueueName(),
      async (queuedJob) => {
        const queuedJobId = asString(queuedJob?.data?.jobId || queuedJob?.id);
        if (!queuedJobId) {
          throw new Error('Queued background job is missing jobId');
        }
        await processQueuedBackgroundJob(queuedJobId);
      },
      {
        connection: workerConnection,
        concurrency: resolveWorkerConcurrency()
      }
    );

    worker.on('failed', (queuedJob, error) => {
      logger.warn('background_job_worker_job_failed', {
        queueJobId: queuedJob?.id ? String(queuedJob.id) : null,
        err: error
      });
    });

    worker.on('error', (error) => {
      logger.error('background_job_worker_error', {
        err: error
      });
    });

    await worker.waitUntilReady();
    queueState = {
      ...queueState,
      workerReady: true,
      reason: 'ok'
    };

    logger.info('background_job_worker_started', {
      queueName: resolveQueueName(),
      concurrency: resolveWorkerConcurrency()
    });
    return true;
  } catch (error) {
    queueState.reason = 'worker_start_failed';
    logger.warn('background_job_worker_start_failed', {
      err: error
    });
    await stopBackgroundJobWorker();
    return false;
  }
};

export const stopBackgroundJobWorker = async () => {
  const pending = [];
  if (worker) {
    pending.push(
      worker.close().catch(() => {
        /* no-op */
      })
    );
  }
  if (workerConnection) {
    pending.push(
      workerConnection.quit().catch(() => {
        /* no-op */
      })
    );
  }

  await Promise.all(pending);
  worker = null;
  workerConnection = null;
  queueState.workerReady = false;
};

export const shutdownBackgroundJobQueue = async () => {
  await stopBackgroundJobWorker();

  const pending = [];
  if (queue) {
    pending.push(
      queue.close().catch(() => {
        /* no-op */
      })
    );
  }
  if (queueConnection) {
    pending.push(
      queueConnection.quit().catch(() => {
        /* no-op */
      })
    );
  }

  await Promise.all(pending);
  queue = null;
  queueConnection = null;
  queueState.queueReady = false;
  queueState.usingBullMq = false;
  queueState.reason = queueState.enabled ? 'stopped' : 'not_enabled';
};

export const getBackgroundJobQueueStatus = () => ({
  ...queueState,
  inlineWorkerEnabled: resolveInlineWorkerEnabled()
});

export default {
  initializeBackgroundJobQueue,
  enqueueBackgroundJob,
  startBackgroundJobWorker,
  stopBackgroundJobWorker,
  shutdownBackgroundJobQueue,
  getBackgroundJobQueueStatus
};
