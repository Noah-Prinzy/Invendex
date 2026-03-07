import BackgroundJob, {
  BACKGROUND_JOB_STATUSES,
  BACKGROUND_JOB_TYPES
} from '../../models/BackgroundJob.js';
import Product from '../../models/Product.js';
import InventorySnapshot from '../../models/InventorySnapshot.js';
import { logger } from '../../observability/logger.js';
import {
  executeProductBulkImport,
  normalizeBulkImportOptions
} from '../product/bulkImportService.js';
import { generateDailyInventoryMetrics } from '../inventoryMetricsService.js';
import forecastService from '../inventory/forecastService.js';
import { runReorderEngine } from '../reorderEngine.js';
import { sendEmailNotification } from '../notifications/notificationService.js';
import {
  buildInventoryReportExport,
  normalizeInventoryReportExportFormat
} from '../inventory/inventoryReportExportService.js';
import { persistBackgroundJobArtifact } from './backgroundJobArtifactService.js';
import {
  REPORT_EXPORT_TYPES,
  buildReportExportPayload
} from '../reports/reportExportService.js';

const { generateProductForecast } = forecastService;
const INVENTORY_REPORT_EXPORT_TYPE = 'INVENTORY_REPORT';

const activeJobIds = new Set();

const clampPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
};

const sanitizeJobError = (error) => ({
  message: String(error?.message || 'Background job failed'),
  code: String(error?.code || 'BACKGROUND_JOB_FAILED')
});

const toDayStart = (value) => {
  const candidate = value ? new Date(value) : new Date();
  if (!Number.isFinite(candidate.getTime())) {
    return null;
  }
  candidate.setHours(0, 0, 0, 0);
  return candidate;
};

const toIsoDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return null;
  return date.toISOString();
};

const buildGenericProgress = (result) => {
  const totalRows = Math.max(
    0,
    Number(result?.totalRows ?? result?.totalCount ?? result?.total ?? 1)
  );
  const processedRows = Math.max(
    0,
    Number(result?.processedRows ?? result?.processedCount ?? totalRows)
  );
  const createdCount = Math.max(
    0,
    Number(result?.createdCount ?? result?.generatedCount ?? 0)
  );
  const updatedCount = Math.max(0, Number(result?.updatedCount ?? 0));
  const skippedCount = Math.max(0, Number(result?.skippedCount ?? 0));
  const failedCount = Math.max(
    0,
    Number(result?.failedCount ?? result?.errorCount ?? 0)
  );
  const denominator = totalRows > 0 ? totalRows : Math.max(processedRows, 1);

  return {
    percent: clampPercent(Math.round((processedRows / denominator) * 100)),
    totalRows,
    processedRows,
    createdCount,
    updatedCount,
    skippedCount,
    failedCount
  };
};

const updateBackgroundJobProgress = async (jobId, snapshot = {}) => {
  const progress = {
    percent: clampPercent(snapshot?.percent),
    totalRows: Math.max(0, Number(snapshot?.totalRows || 0)),
    processedRows: Math.max(0, Number(snapshot?.processedRows || 0)),
    createdCount: Math.max(0, Number(snapshot?.createdCount || 0)),
    updatedCount: Math.max(0, Number(snapshot?.updatedCount || 0)),
    skippedCount: Math.max(0, Number(snapshot?.skippedCount || 0)),
    failedCount: Math.max(0, Number(snapshot?.failedCount || 0))
  };

  await BackgroundJob.findByIdAndUpdate(jobId, {
    $set: {
      progress,
      updatedAt: new Date()
    }
  });
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
    onProgress: async (snapshot) =>
      updateBackgroundJobProgress(jobId, {
        ...snapshot,
        totalRows: Number(snapshot?.totalRows || rows.length)
      })
  });
};

const processInventorySnapshotDailyJob = async ({
  payload,
  organizationId
}) => {
  const explicitSnapshotDate = toDayStart(payload?.snapshotDate);
  const snapshotDate = explicitSnapshotDate || toDayStart(new Date(Date.now()));
  if (!explicitSnapshotDate) {
    snapshotDate.setDate(snapshotDate.getDate() - 1);
  }

  const existingSnapshot = await InventorySnapshot.exists({
    organization: organizationId,
    recordedAt: snapshotDate,
    source: 'CRON'
  });

  if (existingSnapshot) {
    return {
      snapshotDate: snapshotDate.toISOString(),
      totalRows: 0,
      processedRows: 0,
      createdCount: 0,
      skippedCount: 1,
      failedCount: 0,
      skippedReason: 'snapshot_already_exists'
    };
  }

  const products = await Product.find({
    organization: organizationId,
    isActive: true
  })
    .select('_id sku stock price')
    .lean();

  if (!products.length) {
    return {
      snapshotDate: snapshotDate.toISOString(),
      totalRows: 0,
      processedRows: 0,
      createdCount: 0,
      skippedCount: 1,
      failedCount: 0,
      skippedReason: 'no_active_products'
    };
  }

  const records = products.map((product) => ({
    organization: organizationId,
    product: product._id,
    sku: product.sku,
    stock: Number(product.stock || 0),
    price: Number(product.price || 0),
    source: 'CRON',
    recordedAt: snapshotDate
  }));

  await InventorySnapshot.insertMany(records);

  return {
    snapshotDate: snapshotDate.toISOString(),
    totalRows: records.length,
    processedRows: records.length,
    createdCount: records.length,
    skippedCount: 0,
    failedCount: 0
  };
};

const processInventoryMetricsDailyJob = async ({ payload, organizationId }) => {
  const explicitTargetDate = toDayStart(payload?.targetDate);
  const targetDate = explicitTargetDate || toDayStart(new Date(Date.now()));
  if (!explicitTargetDate) {
    targetDate.setDate(targetDate.getDate() - 1);
  }

  const metrics = await generateDailyInventoryMetrics(
    targetDate,
    'cron_queue',
    organizationId
  );

  return {
    targetDate: targetDate.toISOString(),
    totalRows: 1,
    processedRows: 1,
    createdCount: 1,
    skippedCount: 0,
    failedCount: 0,
    metricId: metrics?._id ? String(metrics._id) : null,
    skuCount: Number(metrics?.skuCount || 0)
  };
};

const processForecastGenerationDailyJob = async ({
  jobId,
  payload,
  organizationId
}) => {
  const lookbackLimitRaw = Number(payload?.lookbackLimit || 30);
  const lookbackLimit = Number.isFinite(lookbackLimitRaw)
    ? Math.max(7, Math.min(lookbackLimitRaw, 120))
    : 30;

  const products = await Product.find({
    organization: organizationId,
    isActive: true
  })
    .select('_id sku')
    .lean();

  const totalRows = products.length;
  if (!totalRows) {
    return {
      lookbackLimit,
      totalRows: 0,
      processedRows: 0,
      createdCount: 0,
      skippedCount: 1,
      failedCount: 0,
      skippedReason: 'no_active_products'
    };
  }

  let processedRows = 0;
  let generatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const failures = [];

  for (const product of products) {
    try {
      const snapshots = await InventorySnapshot.find({
        organization: organizationId,
        product: product._id
      })
        .sort({ recordedAt: -1 })
        .limit(lookbackLimit)
        .lean();

      if (snapshots.length < 2) {
        skippedCount += 1;
      } else {
        const historicalDemand = [];
        for (let idx = 0; idx < snapshots.length - 1; idx += 1) {
          const consumed =
            Number(snapshots[idx]?.stock || 0) -
            Number(snapshots[idx + 1]?.stock || 0);
          if (consumed > 0) {
            historicalDemand.push(consumed);
          }
        }

        if (!historicalDemand.length) {
          skippedCount += 1;
        } else {
          await generateProductForecast({
            organizationId,
            productId: product._id,
            historicalDemand
          });
          generatedCount += 1;
        }
      }
    } catch (error) {
      failedCount += 1;
      if (failures.length < 20) {
        failures.push({
          productId: String(product?._id || ''),
          sku: product?.sku || null,
          message: String(error?.message || 'Forecast generation failed')
        });
      }
    } finally {
      processedRows += 1;
      await updateBackgroundJobProgress(jobId, {
        percent: Math.round((processedRows / totalRows) * 100),
        totalRows,
        processedRows,
        createdCount: generatedCount,
        skippedCount,
        failedCount
      });
    }
  }

  return {
    lookbackLimit,
    totalRows,
    processedRows,
    createdCount: generatedCount,
    skippedCount,
    failedCount,
    failures
  };
};

const processForecastReorderDailyJob = async ({ payload, organizationId }) => {
  const lookbackDaysRaw = Number(payload?.lookbackDays || 30);
  const lookbackDays = Number.isFinite(lookbackDaysRaw)
    ? Math.max(7, Math.min(lookbackDaysRaw, 120))
    : 30;

  const runDate =
    toDayStart(payload?.runDate) || toDayStart(new Date(Date.now()));

  const result = await runReorderEngine({
    triggeredBy: 'CRON_FORECAST',
    lookbackDays,
    source: 'forecast',
    runDate,
    organizationId
  });

  const generatedCount = Number(result?.generated || 0);

  return {
    runDate: runDate.toISOString(),
    lookbackDays,
    totalRows: 1,
    processedRows: 1,
    createdCount: generatedCount,
    skippedCount: generatedCount > 0 ? 0 : 1,
    failedCount: 0,
    generatedCount
  };
};

const processEmailNotificationJob = async ({ payload }) => {
  const to = String(payload?.to || '').trim();
  const subject = String(payload?.subject || '').trim();
  const text = String(payload?.text || '').trim();
  const html = payload?.html ? String(payload.html) : null;

  if (!to || !subject || !text) {
    throw new Error(
      'Email background job payload requires to, subject, and text'
    );
  }

  const delivery = await sendEmailNotification({
    to,
    subject,
    text,
    html,
    metadata: payload?.metadata || {}
  });

  return {
    totalRows: 1,
    processedRows: 1,
    createdCount: delivery?.success ? 1 : 0,
    skippedCount: delivery?.skipped ? 1 : 0,
    failedCount: delivery?.success || delivery?.skipped ? 0 : 1,
    delivery
  };
};

const processReportExportJob = async ({
  jobId,
  payload,
  organizationId,
  createdBy
}) => {
  const reportType = String(payload?.reportType || '')
    .trim()
    .toUpperCase();

  if (!createdBy) {
    throw new Error('Report export job requires createdBy');
  }

  let report = null;
  if (reportType === INVENTORY_REPORT_EXPORT_TYPE) {
    const format = normalizeInventoryReportExportFormat(
      payload?.format || 'csv'
    );
    const from = payload?.from || null;
    const to = payload?.to || null;

    report = await buildInventoryReportExport({
      organizationId,
      generatedBy: createdBy,
      from,
      to,
      warehouseId: payload?.warehouseId || null,
      format
    });
  } else if (Object.values(REPORT_EXPORT_TYPES).includes(reportType)) {
    report = await buildReportExportPayload({
      organizationId,
      reportType,
      warehouseId: payload?.warehouseId || null,
      format: payload?.format || 'xlsx'
    });
  } else {
    throw new Error('Unsupported report export payload type');
  }

  const artifact = await persistBackgroundJobArtifact({
    jobId: String(jobId),
    buffer: report.buffer,
    extension: report.extension
  });

  return {
    reportType,
    format: report.format,
    from: report.from || null,
    to: report.to || null,
    reportId: report.reportId || null,
    totalRows: report.rowCount || report.totalRows || 0,
    processedRows: report.rowCount || report.totalRows || 0,
    createdCount: 1,
    skippedCount: 0,
    failedCount: 0,
    artifact: {
      fileName: artifact.fileName,
      sizeBytes: artifact.sizeBytes,
      extension: report.extension,
      contentType: report.contentType,
      downloadName: report.downloadName
    }
  };
};

const normalizeCompletedJobResult = ({ type, result }) => {
  if (type === BACKGROUND_JOB_TYPES.PRODUCT_BULK_IMPORT) {
    return {
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
      previewRows: Array.isArray(result?.previewRows) ? result.previewRows : []
    };
  }

  const fallback = result && typeof result === 'object' ? result : {};
  return {
    ...fallback,
    completedAt: toIsoDate(new Date())
  };
};

export const processQueuedBackgroundJob = async (jobId) => {
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
    switch (queuedJob.type) {
      case BACKGROUND_JOB_TYPES.PRODUCT_BULK_IMPORT:
        result = await processProductBulkImportJob({
          jobId: queuedJob._id,
          payload: queuedJob.payload,
          organizationId: queuedJob.organization
        });
        break;
      case BACKGROUND_JOB_TYPES.INVENTORY_SNAPSHOT_DAILY:
        result = await processInventorySnapshotDailyJob({
          payload: queuedJob.payload,
          organizationId: queuedJob.organization
        });
        break;
      case BACKGROUND_JOB_TYPES.INVENTORY_METRICS_DAILY:
        result = await processInventoryMetricsDailyJob({
          payload: queuedJob.payload,
          organizationId: queuedJob.organization
        });
        break;
      case BACKGROUND_JOB_TYPES.FORECAST_GENERATION_DAILY:
        result = await processForecastGenerationDailyJob({
          jobId: queuedJob._id,
          payload: queuedJob.payload,
          organizationId: queuedJob.organization
        });
        break;
      case BACKGROUND_JOB_TYPES.FORECAST_REORDER_DAILY:
        result = await processForecastReorderDailyJob({
          payload: queuedJob.payload,
          organizationId: queuedJob.organization
        });
        break;
      case BACKGROUND_JOB_TYPES.EMAIL_NOTIFICATION:
        result = await processEmailNotificationJob({
          payload: queuedJob.payload
        });
        break;
      case BACKGROUND_JOB_TYPES.REPORT_EXPORT:
        result = await processReportExportJob({
          jobId: queuedJob._id,
          payload: queuedJob.payload,
          organizationId: queuedJob.organization,
          createdBy: queuedJob.createdBy
        });
        break;
      default:
        throw new Error(`Unsupported background job type: ${queuedJob.type}`);
    }

    const normalizedResult = normalizeCompletedJobResult({
      type: queuedJob.type,
      result
    });
    const progress = buildGenericProgress(normalizedResult);

    await BackgroundJob.findByIdAndUpdate(queuedJob._id, {
      $set: {
        status: BACKGROUND_JOB_STATUSES.COMPLETED,
        completedAt: new Date(),
        progress: {
          ...progress,
          percent: 100
        },
        result: normalizedResult,
        error: {
          message: null,
          code: null
        }
      }
    });
  } catch (error) {
    logger.error('background_job_processing_failed', {
      jobId: normalizedJobId,
      err: error
    });
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

export default {
  processQueuedBackgroundJob
};
