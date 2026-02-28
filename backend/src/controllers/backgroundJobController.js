import { AppError } from '../errors/AppError.js';
import {
  BACKGROUND_JOB_TYPES,
  createBackgroundJob,
  getBackgroundJobForOrganization
} from '../services/jobs/backgroundJobService.js';
import { normalizeBulkImportOptions } from '../services/product/bulkImportService.js';
import { successResponse } from '../utils/response.js';

export const createProductBulkImportJob = async (req, res, next) => {
  try {
    const products = Array.isArray(req.body?.products) ? req.body.products : [];
    const fieldMap =
      req.body?.fieldMap && typeof req.body.fieldMap === 'object'
        ? req.body.fieldMap
        : {};
    const options = normalizeBulkImportOptions(req.body?.options || {});

    const job = await createBackgroundJob({
      organizationId: req.organizationId,
      createdBy: req.user?._id || null,
      type: BACKGROUND_JOB_TYPES.PRODUCT_BULK_IMPORT,
      payload: {
        products,
        fieldMap,
        options
      }
    });

    return successResponse(
      res,
      {
        ...job,
        pollPath: `/api/products/bulk-import/jobs/${job.id}`
      },
      'Bulk import job queued',
      202
    );
  } catch (error) {
    next(error);
  }
};

export const getProductBulkImportJobStatus = async (req, res, next) => {
  try {
    const job = await getBackgroundJobForOrganization({
      organizationId: req.organizationId,
      jobId: req.params.jobId
    });

    if (!job || job.type !== BACKGROUND_JOB_TYPES.PRODUCT_BULK_IMPORT) {
      throw new AppError('Bulk import job not found', 404);
    }

    return successResponse(res, job, 'Bulk import job status fetched');
  } catch (error) {
    next(error);
  }
};

export default {
  createProductBulkImportJob,
  getProductBulkImportJobStatus
};
