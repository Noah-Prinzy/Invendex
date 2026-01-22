import Product from '../../models/Product.js';
import InventorySnapshot from '../../models/InventorySnapshot.js';
import ReorderAlert from '../../models/ReorderAlert.js';
import AppError from '../../utils/AppError.js'; // ✅ default import

/**
 * Applies inventory updates when a Purchase Order is received.
 * This operation is idempotent-safe.
 */
export const applyPurchaseOrderToInventory = async ({
  purchaseOrder
}) => {
  if (!purchaseOrder || !purchaseOrder.items?.length) {
    throw new AppError(
      'Invalid purchase order supplied to inventory service',
      400
    );
  }

  for (const item of purchaseOrder.items) {
    const { product: productId, quantity } = item;

    // Prevent double-application:
    // Check if a snapshot already exists for this PO + product
    const existingSnapshot = await InventorySnapshot.findOne({
      product: productId,
      sourceType: 'PURCHASE_ORDER',
      sourceId: purchaseOrder._id
    });

    if (existingSnapshot) {
      continue; // Idempotent no-op
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError(
        `Product not found for inventory update (${productId})`,
        404
      );
    }

    const previousStock = product.stock;
    const newStock = previousStock + quantity;

    // Update product stock
    product.stock = newStock;
    await product.save();

    // Record inventory snapshot (audit trail)
    await InventorySnapshot.create({
      product: productId,
      change: quantity,
      previousStock,
      newStock,
      sourceType: 'PURCHASE_ORDER',
      sourceId: purchaseOrder._id,
      note: `Stock received via PO ${purchaseOrder._id}`
    });

    // Resolve only alerts linked to this PO + product
    await ReorderAlert.updateMany(
      {
        product: productId,
        linkedPurchaseOrder: purchaseOrder._id,
        resolved: false
      },
      {
        $set: {
          resolved: true,
          resolvedAt: new Date()
        }
      }
    );
  }
};
export default {
  applyPurchaseOrderToInventory
};