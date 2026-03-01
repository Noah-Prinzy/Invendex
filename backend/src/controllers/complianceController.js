import bcrypt from 'bcryptjs';

import { AppError } from '../errors/AppError.js';
import Organization from '../models/Organization.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import User from '../models/User.js';
import Warehouse from '../models/Warehouse.js';
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import Supplier from '../models/Supplier.js';
import SupplierProduct from '../models/SupplierProduct.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Order from '../models/Order.js';
import StockMovement from '../models/StockMovement.js';
import InventoryBatch from '../models/InventoryBatch.js';
import InventorySerial from '../models/InventorySerial.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/auditLogger.js';
import { successResponse } from '../utils/response.js';

const MAX_EXPORT_LIMIT = 5000;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const mapCollection = async ({
  model,
  filter,
  projection = {},
  sort = { createdAt: -1 },
  limit = MAX_EXPORT_LIMIT
}) => {
  const [total, rows] = await Promise.all([
    model.countDocuments(filter),
    model.find(filter, projection).sort(sort).limit(limit).lean()
  ]);

  return {
    total,
    exported: rows.length,
    truncated: total > rows.length,
    rows
  };
};

const normalizeConfirmationText = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

export const exportOrganizationData = async (req, res, next) => {
  try {
    const organization = await Organization.findOne({
      _id: req.organizationId,
      isActive: true
    }).lean();

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    const includeAudit =
      String(req.query?.includeAudit || 'false')
        .trim()
        .toLowerCase() === 'true';
    const exportLimit = Math.min(
      MAX_EXPORT_LIMIT,
      parsePositiveInteger(req.query?.limit, 2000)
    );

    const baseFilter = { organization: req.organizationId };
    const [
      settings,
      users,
      warehouses,
      products,
      inventory,
      suppliers,
      supplierProducts,
      purchaseOrders,
      orders,
      stockMovements,
      inventoryBatches,
      inventorySerials,
      auditLogs
    ] = await Promise.all([
      OrganizationSettings.findOne(baseFilter).lean(),
      mapCollection({
        model: User,
        filter: baseFilter,
        projection: {
          password: 0,
          passwordResetToken: 0,
          passwordResetExpiresAt: 0,
          emailVerificationToken: 0,
          emailVerificationExpiresAt: 0,
          refreshTokens: 0,
          'twoFactor.secret': 0,
          'twoFactor.pendingSecret': 0,
          'twoFactor.recoveryCodes': 0,
          'twoFactor.pendingRecoveryCodeHashes': 0
        },
        limit: exportLimit
      }),
      mapCollection({
        model: Warehouse,
        filter: baseFilter,
        limit: exportLimit
      }),
      mapCollection({
        model: Product,
        filter: baseFilter,
        limit: exportLimit
      }),
      mapCollection({
        model: Inventory,
        filter: baseFilter,
        limit: exportLimit
      }),
      mapCollection({
        model: Supplier,
        filter: baseFilter,
        limit: exportLimit
      }),
      mapCollection({
        model: SupplierProduct,
        filter: baseFilter,
        limit: exportLimit
      }),
      mapCollection({
        model: PurchaseOrder,
        filter: baseFilter,
        limit: exportLimit
      }),
      mapCollection({
        model: Order,
        filter: baseFilter,
        limit: exportLimit
      }),
      mapCollection({
        model: StockMovement,
        filter: baseFilter,
        limit: exportLimit
      }),
      mapCollection({
        model: InventoryBatch,
        filter: baseFilter,
        limit: exportLimit
      }),
      mapCollection({
        model: InventorySerial,
        filter: baseFilter,
        limit: exportLimit
      }),
      includeAudit
        ? mapCollection({
            model: AuditLog,
            filter: baseFilter,
            limit: exportLimit
          })
        : Promise.resolve(null)
    ]);

    const payload = {
      generatedAt: new Date().toISOString(),
      limitPerCollection: exportLimit,
      includeAudit,
      organization,
      settings: settings || null,
      datasets: {
        users,
        warehouses,
        products,
        inventory,
        suppliers,
        supplierProducts,
        purchaseOrders,
        orders,
        stockMovements,
        inventoryBatches,
        inventorySerials,
        ...(includeAudit ? { auditLogs } : {})
      }
    };

    await logAudit({
      req,
      action: 'EXPORT_ORGANIZATION_DATA',
      resource: 'COMPLIANCE',
      resourceId: req.organizationId,
      organizationId: req.organizationId,
      meta: {
        includeAudit,
        limitPerCollection: exportLimit
      }
    });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=ledgerly-org-export-${Date.now()}.json`
    );
    return res.status(200).json({
      success: true,
      message: 'Organization export generated',
      data: payload
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteMyAccount = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new AppError('Not authenticated', 401);
    }

    const confirmationText = normalizeConfirmationText(
      req.body?.confirmationText
    );
    if (confirmationText !== 'DELETE MY ACCOUNT') {
      throw new AppError(
        'confirmationText must be exactly "DELETE MY ACCOUNT"',
        400
      );
    }

    const currentPassword = String(req.body?.currentPassword || '').trim();
    if (!currentPassword) {
      throw new AppError('currentPassword is required', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    user.isActive = false;
    user.refreshTokens = [];
    user.twoFactor = {
      enabled: false,
      secret: null,
      pendingSecret: null,
      recoveryCodes: [],
      pendingRecoveryCodeHashes: [],
      enabledAt: null,
      lastVerifiedAt: null
    };
    await user.save();

    res.clearCookie('refreshToken');

    await logAudit({
      req,
      action: 'DELETE_MY_ACCOUNT',
      resource: 'COMPLIANCE',
      resourceId: user._id,
      organizationId: user.organization || null
    });

    return successResponse(
      res,
      null,
      'Account deactivated. Contact your administrator to reactivate.'
    );
  } catch (error) {
    return next(error);
  }
};

export const deleteOrganization = async (req, res, next) => {
  try {
    if (!req.user?._id || !req.organizationId) {
      throw new AppError('Not authenticated', 401);
    }

    const currentPassword = String(req.body?.currentPassword || '').trim();
    if (!currentPassword) {
      throw new AppError('currentPassword is required', 400);
    }

    const owner = await User.findById(req.user._id).select('+password');
    if (!owner) {
      throw new AppError('User no longer exists', 401);
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      owner.password
    );
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    const organization = await Organization.findById(req.organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    const expectedConfirmation = normalizeConfirmationText(
      `DELETE ${organization.code}`
    );
    const submittedConfirmation = normalizeConfirmationText(
      req.body?.confirmationText
    );
    if (submittedConfirmation !== expectedConfirmation) {
      throw new AppError(
        `confirmationText must match "DELETE ${organization.code}"`,
        400
      );
    }

    organization.isActive = false;
    await organization.save();

    await User.updateMany(
      { organization: organization._id },
      {
        $set: {
          isActive: false,
          refreshTokens: [],
          twoFactor: {
            enabled: false,
            secret: null,
            pendingSecret: null,
            recoveryCodes: [],
            pendingRecoveryCodeHashes: [],
            enabledAt: null,
            lastVerifiedAt: null
          }
        }
      }
    );

    await Warehouse.updateMany(
      { organization: organization._id },
      { $set: { isActive: false, isArchived: true } }
    );

    res.clearCookie('refreshToken');

    await logAudit({
      req,
      action: 'DELETE_ORGANIZATION',
      resource: 'COMPLIANCE',
      resourceId: organization._id,
      organizationId: organization._id,
      meta: {
        organizationCode: organization.code
      }
    });

    return successResponse(
      res,
      {
        organizationId: organization._id,
        organizationCode: organization.code
      },
      'Organization deactivated successfully'
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  exportOrganizationData,
  deleteMyAccount,
  deleteOrganization
};
