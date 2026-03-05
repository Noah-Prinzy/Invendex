import express from 'express';
import {
  archiveWarehouse,
  createWarehouse,
  listWarehouses,
  restoreWarehouse,
  updateWarehouse
} from '../controllers/warehouseController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import requireRoles from '../middlewares/requireRoles.js';
import validateRequest from '../middlewares/validateRequest.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import {
  createWarehouseValidator,
  listWarehousesQueryValidator,
  restoreWarehouseValidator,
  updateWarehouseValidator,
  warehouseIdParamValidator
} from '../validations/warehouseValidators.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.INVENTORY_VIEW)
);

router.get('/', listWarehousesQueryValidator, validateRequest, listWarehouses);

router.post(
  '/',
  requireRoles('admin'),
  createWarehouseValidator,
  validateRequest,
  auditMiddleware({
    action: 'CREATE_WAREHOUSE',
    resource: 'WAREHOUSE'
  }),
  createWarehouse
);

router.patch(
  '/:warehouseId',
  requireRoles('admin'),
  updateWarehouseValidator,
  validateRequest,
  auditMiddleware({
    action: 'UPDATE_WAREHOUSE',
    resource: 'WAREHOUSE',
    resourceIdFrom: 'params.warehouseId'
  }),
  updateWarehouse
);

router.patch(
  '/:warehouseId/archive',
  requireRoles('admin'),
  warehouseIdParamValidator,
  validateRequest,
  auditMiddleware({
    action: 'ARCHIVE_WAREHOUSE',
    resource: 'WAREHOUSE',
    resourceIdFrom: 'params.warehouseId'
  }),
  archiveWarehouse
);

router.patch(
  '/:warehouseId/restore',
  requireRoles('admin'),
  restoreWarehouseValidator,
  validateRequest,
  auditMiddleware({
    action: 'RESTORE_WAREHOUSE',
    resource: 'WAREHOUSE',
    resourceIdFrom: 'params.warehouseId'
  }),
  restoreWarehouse
);

export default router;
