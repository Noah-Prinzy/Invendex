import PurchaseOrder from '../models/PurchaseOrder.js';
import ReorderAlert from '../models/ReorderAlert.js';
import Supplier from '../models/Supplier.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';

/**
 * 🤖 Generate draft purchase orders from reorder alerts (A20.4 + A20.4.4)
 */
export const generatePurchaseOrdersFromAlerts = async (req, res, next) => {
  try {
    const organizationId = req.organizationId || req.user?.organization;
    if (!organizationId) {
      throw new AppError('User is not assigned to an organization', 403);
    }

    const { warehouse } = req.body;
    if (!warehouse) {
      throw new AppError('Warehouse is required', 400);
    }

    const alerts = await ReorderAlert.find({
      organization: organizationId,
      resolved: false,
      supplier: { $ne: null }
    }).populate('product');

    if (!alerts.length) {
      throw new AppError('No active reorder alerts found', 400);
    }

    // 🔁 Group alerts by supplier
    const grouped = {};

    for (const alert of alerts) {
      const supplierId = alert.supplier.toString();

      if (!grouped[supplierId]) {
        grouped[supplierId] = [];
      }

      grouped[supplierId].push(alert);
    }

    const affectedOrders = [];

    for (const supplierId of Object.keys(grouped)) {
      const supplier = await Supplier.findOne({
        _id: supplierId,
        organization: organizationId
      });
      if (!supplier) continue;

      // 🔍 A20.4.4 — Check for existing draft PO
      let order = await PurchaseOrder.findOne({
        organization: organizationId,
        supplier: supplier._id,
        status: 'DRAFT'
      });

      // If no draft exists → create a new one
      if (!order) {
        const poCount = await PurchaseOrder.countDocuments({
          organization: organizationId
        });
        const poNumber = `PO-${String(poCount + 1).padStart(6, '0')}`;

        order = await PurchaseOrder.create({
          organization: organizationId,
          poNumber,
          supplier: supplier._id,
          warehouse,
          items: [],
          totalQuantity: 0,
          totalAmount: 0,
          status: 'DRAFT',
          createdBy: req.user._id
        });
      }

      // 🔄 Merge alert items into PO
      for (const alert of grouped[supplierId]) {
        const product = alert.product;
        if (!product) continue;

        const quantity = Math.max(alert.reorderLevel - alert.stock, 1);

        const unitCost = alert.supplierUnitCost || 0;
        const totalCost = quantity * unitCost;

        // Check if item already exists in PO
        const existingItem = order.items.find(
          (item) => item.product.toString() === product._id.toString()
        );

        if (existingItem) {
          existingItem.quantity += quantity;
          existingItem.totalCost += totalCost;
        } else {
          order.items.push({
            product: product._id,
            sku: product.sku,
            quantity,
            unitCost,
            totalCost,
            reorderAlert: alert._id
          });
        }

        order.totalQuantity += quantity;
        order.totalAmount += totalCost;
      }

      await order.save();
      affectedOrders.push(order);
    }

    return successResponse(
      res,
      affectedOrders,
      'Purchase orders generated from reorder alerts'
    );
  } catch (err) {
    next(err);
  }
};
