import { AppError } from '../errors/AppError.js';
import {
  BACKGROUND_JOB_TYPES,
  createBackgroundJob,
  getBackgroundJobForOrganization
} from '../services/jobs/backgroundJobService.js';
import { readBackgroundJobArtifact } from '../services/jobs/backgroundJobArtifactService.js';
import {
  buildInventoryReportExport,
  normalizeInventoryReportExportFormat
} from '../services/inventory/inventoryReportExportService.js';
import { successResponse } from '../utils/response.js';

const INVENTORY_REPORT_EXPORT_TYPE = 'INVENTORY_REPORT';

const ensureInventoryReportExportJob = (job) => {
  const reportType = String(job?.payload?.reportType || '').toUpperCase();
  if (
    !job ||
    job.type !== BACKGROUND_JOB_TYPES.REPORT_EXPORT ||
    reportType !== INVENTORY_REPORT_EXPORT_TYPE
  ) {
    throw new AppError('Inventory report export job not found', 404);
  }

  return job;
};

export const exportInventoryReport = async (req, res, next) => {
  try {
    const { format = 'csv', from = null, to = null } = req.query || {};

    const report = await buildInventoryReportExport({
      organizationId: req.organizationId,
      generatedBy: req.user?._id,
      from,
      to,
      format
    });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${report.downloadName}`
    );
    res.setHeader('Content-Type', report.contentType);
    return res.send(report.buffer);
  } catch (err) {
    next(err);
  }
};

export const queueInventoryReportExport = async (req, res, next) => {
  try {
    const format = normalizeInventoryReportExportFormat(
      req.body?.format || 'csv'
    );
    const from = req.body?.from || null;
    const to = req.body?.to || null;

    const dedupeKey = [
      INVENTORY_REPORT_EXPORT_TYPE,
      format,
      String(from || ''),
      String(to || '')
    ].join(':');

    const job = await createBackgroundJob({
      organizationId: req.organizationId,
      createdBy: req.user?._id || null,
      type: BACKGROUND_JOB_TYPES.REPORT_EXPORT,
      dedupeKey,
      payload: {
        reportType: INVENTORY_REPORT_EXPORT_TYPE,
        format,
        from,
        to
      }
    });

    return successResponse(
      res,
      {
        ...job,
        pollPath: `/api/inventory-reports/export/jobs/${job.id}`,
        downloadPath: `/api/inventory-reports/export/jobs/${job.id}/download`
      },
      'Inventory report export job queued',
      202
    );
  } catch (error) {
    next(error);
  }
};

export const getInventoryReportExportJobStatus = async (req, res, next) => {
  try {
    const job = await getBackgroundJobForOrganization({
      organizationId: req.organizationId,
      jobId: req.params.jobId,
      includePayload: true
    });

    ensureInventoryReportExportJob(job);

    return successResponse(
      res,
      {
        ...job,
        downloadPath: `/api/inventory-reports/export/jobs/${job.id}/download`
      },
      'Inventory report export job status fetched'
    );
  } catch (error) {
    next(error);
  }
};

export const downloadInventoryReportExport = async (req, res, next) => {
  try {
    const job = ensureInventoryReportExportJob(
      await getBackgroundJobForOrganization({
        organizationId: req.organizationId,
        jobId: req.params.jobId,
        includePayload: true
      })
    );

    if (String(job.status || '').toUpperCase() !== 'COMPLETED') {
      throw new AppError('Inventory report export is not completed yet', 409);
    }

    const artifact = job?.result?.artifact || null;
    if (!artifact?.fileName) {
      throw new AppError('Inventory report export artifact not found', 404);
    }

    const buffer = await readBackgroundJobArtifact({
      fileName: artifact.fileName
    }).catch((error) => {
      if (error?.code === 'ENOENT') {
        throw new AppError(
          'Inventory report export file no longer exists',
          404
        );
      }
      throw error;
    });

    const contentType = String(
      artifact.contentType || 'application/octet-stream'
    );
    const downloadName = String(
      artifact.downloadName || `inventory-report.${artifact.extension || 'bin'}`
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
  exportInventoryReport,
  queueInventoryReportExport,
  getInventoryReportExportJobStatus,
  downloadInventoryReportExport
};
