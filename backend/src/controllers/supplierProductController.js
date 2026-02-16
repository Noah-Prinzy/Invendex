import SupplierProduct from '../models/SupplierProduct.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';

/**
 * ➕ Link supplier to product
 */
export const createSupplierProduct = async (req, res, next) => {
  try {
    const { product, isPreferred } = req.body;
    const organizationId = req.organizationId;

    // 🔁 Enforce single preferred supplier per product
    if (isPreferred === true) {
      await SupplierProduct.updateMany(
        { organization: organizationId, product },
        { $set: { isPreferred: false } }
      );
    }

    const link = await SupplierProduct.create({
      ...req.body,
      organization: organizationId
    });

    return successResponse(
      res,
      link,
      'Supplier linked to product successfully',
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 📄 Get all supplier-product links
 */
export const getSupplierProducts = async (req, res, next) => {
  try {
    const links = await SupplierProduct.find({
      organization: req.organizationId,
      isActive: true
    })
      .populate('supplier', 'name leadTimeDays')
      .populate('product', 'sku name')
      .sort({ createdAt: -1 });

    return successResponse(
      res,
      links,
      'Supplier-product links fetched successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 🔍 Get links for a single product
 */
export const getSuppliersForProduct = async (req, res, next) => {
  try {
    const links = await SupplierProduct.find({
      organization: req.organizationId,
      product: req.params.productId,
      isActive: true
    })
      .populate('supplier', 'name leadTimeDays')
      .sort({ isPreferred: -1 });

    return successResponse(
      res,
      links,
      'Suppliers for product fetched successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * ✏️ Update supplier-product link
 */
export const updateSupplierProduct = async (req, res, next) => {
  try {
    const { isPreferred } = req.body;

    const link = await SupplierProduct.findOne({
      _id: req.params.id,
      organization: req.organizationId
    });

    if (!link) {
      throw new AppError('Supplier-product link not found', 404);
    }

    // 🔁 Enforce single preferred supplier per product
    if (isPreferred === true) {
      await SupplierProduct.updateMany(
        {
          organization: req.organizationId,
          product: link.product,
          _id: { $ne: link._id }
        },
        { $set: { isPreferred: false } }
      );
    }

    Object.assign(link, req.body);
    await link.save();

    return successResponse(
      res,
      link,
      'Supplier-product link updated successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 🗑️ Disable supplier-product link (soft delete)
 */
export const deleteSupplierProduct = async (req, res, next) => {
  try {
    const link = await SupplierProduct.findOneAndUpdate(
      {
        _id: req.params.id,
        organization: req.organizationId
      },
      { isActive: false },
      { new: true }
    );

    if (!link) {
      throw new AppError('Supplier-product link not found', 404);
    }

    return successResponse(
      res,
      null,
      'Supplier-product link disabled successfully'
    );
  } catch (err) {
    next(err);
  }
};
