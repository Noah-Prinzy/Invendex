import Supplier from '../models/Supplier.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import ReorderAlert from '../models/ReorderAlert.js';
import SupplierProduct from '../models/SupplierProduct.js';
import mongoose from 'mongoose';

/**
 * ➕ Create supplier
 */
export const createSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.create({
      ...req.body,
      organization: req.organizationId
    });

    return successResponse(res, supplier, 'Supplier created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 📄 Get all suppliers
 */
export const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find({
      organization: req.organizationId
    }).sort({ createdAt: -1 });

    return successResponse(res, suppliers, 'Suppliers fetched successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 🔍 Get single supplier
 */
export const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      organization: req.organizationId
    });

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    return successResponse(res, supplier, 'Supplier fetched successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * ✏️ Update supplier
 */
export const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: req.params.id,
        organization: req.organizationId
      },
      req.body,
      { new: true }
    );

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    return successResponse(res, supplier, 'Supplier updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 🗑️ Delete supplier (soft delete not needed yet)
 */
export const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOneAndDelete({
      _id: req.params.id,
      organization: req.organizationId
    });

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    return successResponse(res, null, 'Supplier deleted successfully');
  } catch (err) {
    next(err);
  }
};
/**
 * 📊 Supplier performance analytics
 */
export const getSupplierPerformance = async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const { warehouseId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      throw new AppError('Invalid supplier ID', 400);
    }

    /**
     * 1️⃣ Alert statistics
     */
    const alerts = await ReorderAlert.find({
      supplier: supplierId,
      organization: req.organizationId,
      ...(warehouseId ? { warehouse: warehouseId } : {})
    });

    const totalAlerts = alerts.length;
    const activeAlerts = alerts.filter((a) => !a.resolved).length;
    const resolvedAlerts = alerts.filter((a) => a.resolved).length;

    /**
     * 2️⃣ Average resolution time (hours)
     */
    const resolutionTimes = alerts
      .filter((a) => a.resolved && a.resolvedAt)
      .map((a) => (a.resolvedAt - a.triggeredAt) / (1000 * 60 * 60));

    const avgResolutionHours =
      resolutionTimes.length > 0
        ? Number(
            (
              resolutionTimes.reduce((sum, t) => sum + t, 0) /
              resolutionTimes.length
            ).toFixed(2)
          )
        : null;

    /**
     * 3️⃣ Supplier lead time (average)
     */
    const supplierLinks = await SupplierProduct.find({
      supplier: supplierId,
      organization: req.organizationId,
      isActive: true
    });

    const avgLeadTimeDays =
      supplierLinks.length > 0
        ? Number(
            (
              supplierLinks.reduce(
                (sum, sp) => sum + (sp.leadTimeDays || 0),
                0
              ) / supplierLinks.length
            ).toFixed(1)
          )
        : null;

    /**
     * 4️⃣ Reliability score (0–100)
     */
    let reliabilityScore = 100;

    reliabilityScore -= activeAlerts * 10;
    reliabilityScore -= avgResolutionHours ? avgResolutionHours / 2 : 0;
    reliabilityScore += resolvedAlerts * 2;

    reliabilityScore = Math.max(0, Math.min(100, Math.round(reliabilityScore)));

    return successResponse(
      res,
      {
        supplierId,
        totalAlerts,
        activeAlerts,
        resolvedAlerts,
        avgResolutionHours,
        avgLeadTimeDays,
        reliabilityScore
      },
      'Supplier performance analytics fetched successfully'
    );
  } catch (err) {
    next(err);
  }
};
/**
 * 🏆 Supplier ranking & comparison
 */
export const getSupplierRankings = async (req, res, next) => {
  try {
    const suppliers = await Supplier.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(req.organizationId)
        }
      },
      {
        $lookup: {
          from: 'reorderalerts',
          localField: '_id',
          foreignField: 'supplier',
          as: 'alerts'
        }
      },
      {
        $lookup: {
          from: 'supplierproducts',
          localField: '_id',
          foreignField: 'supplier',
          as: 'products'
        }
      },
      {
        $addFields: {
          totalAlerts: { $size: '$alerts' },
          resolvedAlerts: {
            $size: {
              $filter: {
                input: '$alerts',
                as: 'a',
                cond: { $eq: ['$$a.resolved', true] }
              }
            }
          },
          avgLeadTime: { $avg: '$products.leadTimeDays' },
          avgUnitCost: { $avg: '$products.unitCost' }
        }
      },
      {
        $addFields: {
          reliabilityScore: {
            $cond: [
              { $eq: ['$totalAlerts', 0] },
              100,
              {
                $multiply: [
                  { $divide: ['$resolvedAlerts', '$totalAlerts'] },
                  100
                ]
              }
            ]
          }
        }
      }
    ]);

    // Normalize + final score
    const ranked = suppliers.map((s) => {
      const leadTimeScore = s.avgLeadTime
        ? Math.max(0, 100 - s.avgLeadTime * 5)
        : 50;

      const alertPenalty = Math.min(s.totalAlerts * 5, 100);
      const costScore = s.avgUnitCost
        ? Math.max(0, 100 - s.avgUnitCost / 10)
        : 50;

      const finalScore =
        s.reliabilityScore * 0.4 +
        leadTimeScore * 0.3 +
        (100 - alertPenalty) * 0.2 +
        costScore * 0.1;

      return {
        supplierId: s._id,
        name: s.name,
        reliabilityScore: Math.round(s.reliabilityScore),
        avgLeadTime: Math.round(s.avgLeadTime || 0),
        totalAlerts: s.totalAlerts,
        finalScore: Math.round(finalScore)
      };
    });

    ranked.sort((a, b) => b.finalScore - a.finalScore);

    return successResponse(
      res,
      ranked.map((s, i) => ({ rank: i + 1, ...s })),
      'Supplier rankings generated'
    );
  } catch (err) {
    next(err);
  }
};
