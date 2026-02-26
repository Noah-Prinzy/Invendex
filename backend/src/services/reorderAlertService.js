import ReorderAlert from '../models/ReorderAlert.js';

/**
 * ✅ Auto-resolve reorder alerts for received purchase order
 */
export const resolveAlertsForPurchaseOrder = async ({
  purchaseOrder,
  resolvedBy
}) => {
  const productIds = purchaseOrder.items.map((item) => item.product);

  const alerts = await ReorderAlert.find({
    organization: purchaseOrder.organization,
    product: { $in: productIds },
    resolved: false
  });

  for (const alert of alerts) {
    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolutionReason = `Resolved by purchase order ${purchaseOrder._id}`;
    alert.resolutionSource = 'purchase_order';
    alert.resolvedBy = resolvedBy;

    await alert.save();
  }

  return alerts.length;
};
