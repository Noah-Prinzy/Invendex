import Warehouse from '../models/Warehouse.js';
import User from '../models/User.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import { AppError } from '../errors/AppError.js';
import { successResponse } from '../utils/response.js';

const normalizeWarehouseCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);

const buildWarehouseCode = (name) => {
  const base = String(name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

  if (base) return `${base}-01`;
  return `WH-${Date.now().toString().slice(-6)}`;
};

const buildWarehouseCodeCandidate = (baseCode, attempt) => {
  if (attempt <= 0) return baseCode;
  const suffix = `-${String(attempt + 1).padStart(2, '0')}`;
  const maxBaseLength = Math.max(1, 24 - suffix.length);
  return `${String(baseCode || '').slice(0, maxBaseLength)}${suffix}`;
};

const resolveGeneratedWarehouseCode = async ({ organizationId, baseCode }) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidateCode = buildWarehouseCodeCandidate(baseCode, attempt);
    const exists = await Warehouse.exists({
      organization: organizationId,
      code: candidateCode
    });
    if (!exists) return candidateCode;
  }

  return normalizeWarehouseCode(
    `${String(baseCode || 'WH').slice(0, 14)}-${Date.now().toString().slice(-8)}`
  );
};

const parseBooleanQuery = (value, fallback = false) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (!normalized) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const mapWarehouse = (warehouse) => {
  const raw = warehouse?.toObject ? warehouse.toObject() : warehouse || {};
  return {
    _id: raw._id || null,
    name: raw.name || '',
    code: raw.code || '',
    region: raw.region || '',
    address: raw.address || null,
    manager:
      raw.manager && typeof raw.manager === 'object'
        ? {
            _id: raw.manager._id || null,
            email: raw.manager.email || '',
            role: raw.manager.role || ''
          }
        : null,
    isActive: raw.isActive !== false,
    isArchived: raw.isArchived === true,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null
  };
};

const sanitizeAddress = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const address = {
    street: String(value.street || '').trim() || undefined,
    city: String(value.city || '').trim() || undefined,
    state: String(value.state || '').trim() || undefined,
    country: String(value.country || '').trim() || undefined,
    postalCode: String(value.postalCode || '').trim() || undefined
  };

  return Object.values(address).some(Boolean) ? address : null;
};

const ensureManagerInOrganization = async ({
  managerUserId,
  organizationId
}) => {
  if (!managerUserId) return null;

  const manager = await User.findOne({
    _id: managerUserId,
    organization: organizationId,
    isActive: { $ne: false }
  })
    .select('_id')
    .lean();

  if (!manager) {
    throw new AppError('Selected warehouse manager is not valid', 400);
  }

  return manager._id;
};

const ensureWarehouse = async ({ warehouseId, organizationId }) => {
  const warehouse = await Warehouse.findOne({
    _id: warehouseId,
    organization: organizationId
  });

  if (!warehouse) {
    throw new AppError('Warehouse not found', 404);
  }

  return warehouse;
};

const maybeSetDefaultWarehouse = async ({ organizationId, warehouseId }) => {
  const settings = await OrganizationSettings.findOne({
    organization: organizationId
  });

  if (!settings) {
    await OrganizationSettings.create({
      organization: organizationId,
      inventory: {
        defaultWarehouse: warehouseId
      }
    });
    return;
  }

  if (settings.inventory?.defaultWarehouse) {
    return;
  }

  settings.inventory = settings.inventory || {};
  settings.inventory.defaultWarehouse = warehouseId;
  await settings.save();
};

const unsetDefaultWarehouseIfArchived = async ({
  organizationId,
  warehouseId
}) => {
  const settings = await OrganizationSettings.findOne({
    organization: organizationId,
    'inventory.defaultWarehouse': warehouseId
  });

  if (!settings) return;
  settings.inventory = settings.inventory || {};
  settings.inventory.defaultWarehouse = null;
  await settings.save();
};

export const listWarehouses = async (req, res, next) => {
  try {
    const includeInactive = parseBooleanQuery(
      req.query?.includeInactive,
      false
    );
    const includeArchived = parseBooleanQuery(
      req.query?.includeArchived,
      false
    );

    const filter = {
      organization: req.organizationId
    };

    if (!includeInactive) {
      filter.isActive = true;
    }

    if (!includeArchived) {
      filter.isArchived = false;
    }

    const warehouses = await Warehouse.find(filter)
      .sort({ isArchived: 1, isActive: -1, name: 1, code: 1 })
      .populate('manager', '_id email role')
      .lean();

    return successResponse(
      res,
      {
        items: warehouses.map(mapWarehouse),
        total: warehouses.length
      },
      'Warehouses fetched successfully'
    );
  } catch (error) {
    return next(error);
  }
};

export const createWarehouse = async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const providedCode = normalizeWarehouseCode(req.body?.code);
    const code = providedCode
      ? providedCode
      : await resolveGeneratedWarehouseCode({
          organizationId: req.organizationId,
          baseCode: buildWarehouseCode(name)
        });
    const region = String(req.body?.region || '').trim();
    const managerUserId =
      req.body?.managerUserId === null
        ? null
        : String(req.body?.managerUserId || '').trim() || null;

    const managerId = await ensureManagerInOrganization({
      managerUserId,
      organizationId: req.organizationId
    });

    const warehouse = await Warehouse.create({
      organization: req.organizationId,
      name,
      code,
      region: region || undefined,
      manager: managerId || undefined,
      address: sanitizeAddress(req.body?.address) || undefined,
      isActive: true,
      isArchived: false
    });

    await maybeSetDefaultWarehouse({
      organizationId: req.organizationId,
      warehouseId: warehouse._id
    });

    const hydratedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('manager', '_id email role')
      .lean();

    return successResponse(
      res,
      mapWarehouse(hydratedWarehouse),
      'Warehouse created successfully',
      201
    );
  } catch (error) {
    if (Number(error?.code) === 11000) {
      return next(
        new AppError('Warehouse code already exists in this organization', 409)
      );
    }
    return next(error);
  }
};

export const updateWarehouse = async (req, res, next) => {
  try {
    const warehouse = await ensureWarehouse({
      warehouseId: req.params.warehouseId,
      organizationId: req.organizationId
    });

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'name')) {
      warehouse.name = String(req.body.name || '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'code')) {
      const normalizedCode = normalizeWarehouseCode(req.body.code);
      warehouse.code = normalizedCode || warehouse.code;
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'region')) {
      warehouse.region = String(req.body.region || '').trim() || undefined;
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'isActive')) {
      warehouse.isActive = Boolean(req.body.isActive);
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'address')) {
      warehouse.address = sanitizeAddress(req.body.address) || {};
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'managerUserId')) {
      const managerUserId =
        req.body?.managerUserId === null
          ? null
          : String(req.body?.managerUserId || '').trim() || null;

      const managerId = await ensureManagerInOrganization({
        managerUserId,
        organizationId: req.organizationId
      });
      warehouse.manager = managerId || null;
    }

    await warehouse.save();

    const hydratedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('manager', '_id email role')
      .lean();

    return successResponse(
      res,
      mapWarehouse(hydratedWarehouse),
      'Warehouse updated successfully'
    );
  } catch (error) {
    if (Number(error?.code) === 11000) {
      return next(
        new AppError('Warehouse code already exists in this organization', 409)
      );
    }
    return next(error);
  }
};

export const archiveWarehouse = async (req, res, next) => {
  try {
    const warehouse = await ensureWarehouse({
      warehouseId: req.params.warehouseId,
      organizationId: req.organizationId
    });

    warehouse.isArchived = true;
    warehouse.isActive = false;
    await warehouse.save();

    await unsetDefaultWarehouseIfArchived({
      organizationId: req.organizationId,
      warehouseId: warehouse._id
    });

    const hydratedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('manager', '_id email role')
      .lean();

    return successResponse(
      res,
      mapWarehouse(hydratedWarehouse),
      'Warehouse archived successfully'
    );
  } catch (error) {
    return next(error);
  }
};

export const restoreWarehouse = async (req, res, next) => {
  try {
    const warehouse = await ensureWarehouse({
      warehouseId: req.params.warehouseId,
      organizationId: req.organizationId
    });

    warehouse.isArchived = false;
    if (req.body?.activateOnRestore !== false) {
      warehouse.isActive = true;
    }
    await warehouse.save();

    const hydratedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('manager', '_id email role')
      .lean();

    return successResponse(
      res,
      mapWarehouse(hydratedWarehouse),
      'Warehouse restored successfully'
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  archiveWarehouse,
  restoreWarehouse
};
