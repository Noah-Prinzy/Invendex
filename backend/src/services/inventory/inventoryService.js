import Product from '../../models/Product.js';
import InventorySnapshot from '../../models/InventorySnapshot.js';
import ReorderAlert from '../../models/ReorderAlert.js';
import AppError from '../../utils/AppError.js';

/**
 * Applies inventory updates when a Purchase Order is received.
 * Idempotent per purchaseOrder + product
 */
export const applyPurchaseOrderToInventory = async ({ purchaseOrder }) => {
  if (!purchaseOrder || !purchaseOrder.items?.length) {
    throw new AppError(
      'Invalid purchase order supplied to inventory service',
      400
    );
  }

  for (const item of purchaseOrder.items) {
    const { product: productId, quantity, reorderAlert } = item;

    // 🔒 Idempotency: if a snapshot already exists for this product + PO, skip
    const existingSnapshot = await InventorySnapshot.findOne({
      product: productId,
      purchaseOrder: purchaseOrder._id
    });

    if (existingSnapshot) {
      continue;
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError(
        `Product not found for inventory update (${productId})`,
        404
      );
    }

    const previousStock = product.stock;

    // 📦 Apply stock increment
    product.stock = previousStock + quantity;
    await product.save();

    // 📸 Record inventory snapshot
    await InventorySnapshot.create({
      product: productId,
      purchaseOrder: purchaseOrder._id,
      change: quantity,
      previousStock,
      newStock: product.stock
    });

    // ✅ Resolve linked reorder alert (if any)
    if (reorderAlert) {
      await ReorderAlert.findByIdAndUpdate(reorderAlert, {
        resolved: true,
        resolvedAt: new Date()
      });
    }
  }
};

export default {
  applyPurchaseOrderToInventory
};
