import mongoose from 'mongoose';
import BackgroundJob, {
  BACKGROUND_JOB_STATUSES,
  BACKGROUND_JOB_TYPES
} from '../../models/BackgroundJob.js';
import { logger } from '../../observability/logger.js';
import { processQueuedBackgroundJob } from './backgroundJobProcessor.js';
import { enqueueBackgroundJob } from './backgroundQueueService.js';

const clampPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
};

const toObjectId = (value) => {
  if (!value) return null;
  return typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;
};

const mapJobForResponse = (job, { includePayload = false } = {}) => {
  if (!job) return null;

  const normalized = typeof job.toObject === 'function' ? job.toObject() : job;

  return {
    id: String(normalized._id || ''),
    type: normalized.type,
    status: normalized.status,
    ...(includePayload
      ? {
          payload:
            normalized.payload && typeof normalized.payload === 'object'
              ? normalized.payload
              : null
        }
      : {}),
    progress: {
      percent: clampPercent(normalized?.progress?.percent),
      totalRows: Number(normalized?.progress?.totalRows || 0),
      processedRows: Number(normalized?.progress?.processedRows || 0),
      createdCount: Number(normalized?.progress?.createdCount || 0),
      updatedCount: Number(normalized?.progress?.updatedCount || 0),
      skippedCount: Number(normalized?.progress?.skippedCount || 0),
      failedCount: Number(normalized?.progress?.failedCount || 0)
    },
    result: normalized.result || null,
    error: normalized.error?.message
      ? {
          message: normalized.error.message,
          code: normalized.error.code || null
        }
      : null,
    createdAt: normalized.createdAt,
    startedAt: normalized.startedAt,
    completedAt: normalized.completedAt,
    updatedAt: normalized.updatedAt,
    organizationId: normalized.organization
      ? String(normalized.organization)
      : null,
    createdBy: normalized.createdBy ? String(normalized.createdBy) : null
  };
};

const scheduleJobProcessing = (jobId) => {
  setImmediate(() => {
    void processQueuedBackgroundJob(jobId);
  });
};

export const createBackgroundJob = async ({
  organizationId,
  createdBy,
  type,
  payload = {},
  dedupeKey = null
}) => {
  const resolvedType = String(type || '')
    .trim()
    .toUpperCase();
  if (!Object.values(BACKGROUND_JOB_TYPES).includes(resolvedType)) {
    throw new Error('Unsupported background job type');
  }

  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const normalizedDedupeKey = String(dedupeKey || '').trim() || null;

  if (normalizedDedupeKey) {
    const existingJob = await BackgroundJob.findOne({
      organization: toObjectId(organizationId),
      type: resolvedType,
      dedupeKey: normalizedDedupeKey,
      status: {
        $in: [BACKGROUND_JOB_STATUSES.QUEUED, BACKGROUND_JOB_STATUSES.RUNNING]
      }
    });

    if (existingJob) {
      return mapJobForResponse(existingJob);
    }
  }

  const job = await BackgroundJob.create({
    organization: toObjectId(organizationId),
    createdBy: createdBy ? toObjectId(createdBy) : null,
    type: resolvedType,
    dedupeKey: normalizedDedupeKey,
    status: BACKGROUND_JOB_STATUSES.QUEUED,
    payload: safePayload,
    progress: {
      percent: 0,
      totalRows: Number(
        Array.isArray(safePayload?.products) ? safePayload.products.length : 0
      ),
      processedRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0
    },
    result: null,
    error: {
      message: null,
      code: null
    }
  });

  const jobId = job._id.toString();
  const enqueued = await enqueueBackgroundJob({
    jobId,
    type: resolvedType,
    organizationId: String(organizationId || '')
  });

  if (!enqueued) {
    logger.info('background_job_fallback_inline_processing', {
      jobId,
      type: resolvedType
    });
    scheduleJobProcessing(jobId);
  }

  return mapJobForResponse(job);
};

export const getBackgroundJobForOrganization = async ({
  organizationId,
  jobId,
  includePayload = false
}) => {
  const job = await BackgroundJob.findOne({
    _id: jobId,
    organization: organizationId
  }).lean();

  return mapJobForResponse(job, { includePayload });
};

export { BACKGROUND_JOB_TYPES, BACKGROUND_JOB_STATUSES };

export default {
  createBackgroundJob,
  getBackgroundJobForOrganization,
  BACKGROUND_JOB_TYPES,
  BACKGROUND_JOB_STATUSES
};
