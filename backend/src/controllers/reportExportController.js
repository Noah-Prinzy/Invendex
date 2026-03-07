import { AppError } from '../errors/AppError.js';
import {
  BACKGROUND_JOB_TYPES,
  createBackgroundJob,
  getBackgroundJobForOrganization
} from '../services/jobs/backgroundJobService.js';
import { readBackgroundJobArtifact } from '../services/jobs/backgroundJobArtifactService.js';
import {
  REPORT_EXPORT_TYPES,
  normalizeReportExportFormat,
  normalizeReportExportType
} from '../services/reports/reportExportService.js';
import { successResponse } from '../utils/response.js';

const isSupportedReportType = (value) =>
  Object.values(REPORT_EXPORT_TYPES).includes(
    String(value || '').toUpperCase()
  );

const ensureOperationalReportExportJob = (job) => {
  const reportType = String(job?.payload?.reportType || '').toUpperCase();
  if (
    !job ||
    job.type !== BACKGROUND_JOB_TYPES.REPORT_EXPORT ||
    !isSupportedReportType(reportType)
  ) {
    throw new AppError('Report export job not found', 404);
  }

  return job;
};

export const queueReportExportJob = async (req, res, next) => {
  try {
    const reportType = normalizeReportExportType(req.body?.reportType);
    const format = normalizeReportExportFormat(req.body?.format || 'xlsx');
    const warehouseId = req.body?.warehouseId || null;
    const dedupeKey = [reportType, format, String(warehouseId || '')].join(':');

    const job = await createBackgroundJob({
      organizationId: req.organizationId,
      createdBy: req.user?._id || null,
      type: BACKGROUND_JOB_TYPES.REPORT_EXPORT,
      dedupeKey,
      payload: {
        reportType,
        format,
        warehouseId
      }
    });

    return successResponse(
      res,
      {
        ...job,
        pollPath: `/api/reports/export/jobs/${job.id}`,
        downloadPath: `/api/reports/export/jobs/${job.id}/download`
      },
      'Report export job queued',
      202
    );
  } catch (error) {
    next(error);
  }
};

export const getReportExportJobStatus = async (req, res, next) => {
  try {
    const job = await getBackgroundJobForOrganization({
      organizationId: req.organizationId,
      jobId: req.params.jobId,
      includePayload: true
    });

    ensureOperationalReportExportJob(job);

    return successResponse(
      res,
      {
        ...job,
        downloadPath: `/api/reports/export/jobs/${job.id}/download`
      },
      'Report export job status fetched'
    );
  } catch (error) {
    next(error);
  }
};

export const downloadReportExportJob = async (req, res, next) => {
  try {
    const job = ensureOperationalReportExportJob(
      await getBackgroundJobForOrganization({
        organizationId: req.organizationId,
        jobId: req.params.jobId,
        includePayload: true
      })
    );

    if (String(job.status || '').toUpperCase() !== 'COMPLETED') {
      throw new AppError('Report export is not completed yet', 409);
    }

    const artifact = job?.result?.artifact || null;
    if (!artifact?.fileName) {
      throw new AppError('Report export artifact not found', 404);
    }

    const buffer = await readBackgroundJobArtifact({
      fileName: artifact.fileName
    }).catch((error) => {
      if (error?.code === 'ENOENT') {
        throw new AppError('Report export file no longer exists', 404);
      }
      throw error;
    });

    const contentType = String(
      artifact.contentType || 'application/octet-stream'
    );
    const downloadName = String(
      artifact.downloadName || `report-export.${artifact.extension || 'bin'}`
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${downloadName}`
    );
    res.setHeader('Content-Length', String(buffer.length));

    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export default {
  queueReportExportJob,
  getReportExportJobStatus,
  downloadReportExportJob
};
