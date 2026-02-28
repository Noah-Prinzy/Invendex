import mongoose from 'mongoose';
import BackgroundJob, {
  BACKGROUND_JOB_STATUSES,
  BACKGROUND_JOB_TYPES
} from '../../models/BackgroundJob.js';
import {
  executeProductBulkImport,
  normalizeBulkImportOptions
} from '../product/bulkImportService.js';

const activeJobIds = new Set();

const clampPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
};

const toObjectId = (value) => {
  if (!value) return null;
  return typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;
};

const sanitizeJobError = (error) => ({
  message: String(error?.message || 'Background job failed'),
  code: String(error?.code || 'BACKGROUND_JOB_FAILED')
});

const mapJobForResponse = (job) => {
  if (!job) return null;

  const normalized = typeof job.toObject === 'function' ? job.toObject() : job;

  return {
    id: String(normalized._id || ''),
    type: normalized.type,
    status: normalized.status,
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
    updatedAt: normalized.updatedAt
  };
};

const processProductBulkImportJob = async ({
  jobId,
  payload,
  organizationId
}) => {
  const rows = Array.isArray(payload?.products) ? payload.products : [];
  const fieldMap =
    payload?.fieldMap && typeof payload.fieldMap === 'object'
      ? payload.fieldMap
      : {};
  const options = normalizeBulkImportOptions(payload?.options || {});

  return executeProductBulkImport({
    organizationId,
    rows,
    fieldMap,
    options,
    onProgress: async (snapshot) => {
      await BackgroundJob.findByIdAndUpdate(jobId, {
        $set: {
          progress: {
            percent: clampPercent(snapshot?.percent),
            totalRows: Number(snapshot?.totalRows || rows.length),
            processedRows: Number(snapshot?.processedRows || 0),
            createdCount: Number(snapshot?.createdCount || 0),
            updatedCount: Number(snapshot?.updatedCount || 0),
            skippedCount: Number(snapshot?.skippedCount || 0),
            failedCount: Number(snapshot?.failedCount || 0)
          },
          updatedAt: new Date()
        }
      });
    }
  });
};

const processJobById = async (jobId) => {
  const normalizedJobId = String(jobId || '').trim();
  if (!normalizedJobId || activeJobIds.has(normalizedJobId)) {
    return;
  }

  activeJobIds.add(normalizedJobId);
  try {
    const queuedJob = await BackgroundJob.findOneAndUpdate(
      {
        _id: normalizedJobId,
        status: BACKGROUND_JOB_STATUSES.QUEUED
      },
      {
        $set: {
          status: BACKGROUND_JOB_STATUSES.RUNNING,
          startedAt: new Date()
        }
      },
      { new: true }
    );

    if (!queuedJob) {
      return;
    }

    let result = null;
    if (queuedJob.type === BACKGROUND_JOB_TYPES.PRODUCT_BULK_IMPORT) {
      result = await processProductBulkImportJob({
        jobId: queuedJob._id,
        payload: queuedJob.payload,
        organizationId: queuedJob.organization
      });
    } else {
      throw new Error(`Unsupported background job type: ${queuedJob.type}`);
    }

    await BackgroundJob.findByIdAndUpdate(queuedJob._id, {
      $set: {
        status: BACKGROUND_JOB_STATUSES.COMPLETED,
        completedAt: new Date(),
        progress: {
          percent: 100,
          totalRows: Number(result?.totalRows || 0),
          processedRows: Number(result?.totalRows || 0),
          createdCount: Number(result?.createdCount || 0),
          updatedCount: Number(result?.updatedCount || 0),
          skippedCount: Number(result?.skippedCount || 0),
          failedCount: Number(result?.failedCount || 0)
        },
        result: {
          totalRows: Number(result?.totalRows || 0),
          validRows: Number(result?.validRows || 0),
          invalidRows: Number(result?.invalidRows || 0),
          createdCount: Number(result?.createdCount || 0),
          updatedCount: Number(result?.updatedCount || 0),
          skippedCount: Number(result?.skippedCount || 0),
          failedCount: Number(result?.failedCount || 0),
          rowErrors: Array.isArray(result?.rowErrors) ? result.rowErrors : [],
          dryRun: result?.dryRun === true,
          atomic: result?.atomic === true,
          duplicatePolicy: String(result?.duplicatePolicy || 'skip'),
          validationBlocked: result?.validationBlocked === true,
          previewRows: Array.isArray(result?.previewRows)
            ? result.previewRows
            : []
        },
        error: {
          message: null,
          code: null
        }
      }
    });
  } catch (error) {
    await BackgroundJob.findByIdAndUpdate(normalizedJobId, {
      $set: {
        status: BACKGROUND_JOB_STATUSES.FAILED,
        completedAt: new Date(),
        error: sanitizeJobError(error)
      }
    });
  } finally {
    activeJobIds.delete(normalizedJobId);
  }
};

const scheduleJobProcessing = (jobId) => {
  setImmediate(() => {
    void processJobById(jobId);
  });
};

export const createBackgroundJob = async ({
  organizationId,
  createdBy,
  type,
  payload = {}
}) => {
  const resolvedType = String(type || '')
    .trim()
    .toUpperCase();
  if (!Object.values(BACKGROUND_JOB_TYPES).includes(resolvedType)) {
    throw new Error('Unsupported background job type');
  }

  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const job = await BackgroundJob.create({
    organization: toObjectId(organizationId),
    createdBy: createdBy ? toObjectId(createdBy) : null,
    type: resolvedType,
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

  scheduleJobProcessing(job._id.toString());
  return mapJobForResponse(job);
};

export const getBackgroundJobForOrganization = async ({
  organizationId,
  jobId
}) => {
  const job = await BackgroundJob.findOne({
    _id: jobId,
    organization: organizationId
  }).lean();

  return mapJobForResponse(job);
};

export { BACKGROUND_JOB_TYPES, BACKGROUND_JOB_STATUSES };

export default {
  createBackgroundJob,
  getBackgroundJobForOrganization,
  BACKGROUND_JOB_TYPES,
  BACKGROUND_JOB_STATUSES
};
