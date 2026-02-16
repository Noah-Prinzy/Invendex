import cron from 'node-cron';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { publishPurchaseOrderUpdated } from '../realtime/publisher.js';

export const autoClosePurchaseOrdersJob = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('Running auto-close purchase orders job...');

    const fourteenDaysAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000
    );

    const staleOrders = await PurchaseOrder.find({
      status: 'SENT',
      sentAt: { $lte: fourteenDaysAgo }
    });

    for (const po of staleOrders) {
      po.status = 'CLOSED';
      po.closedAt = new Date();

      await po.save();

      publishPurchaseOrderUpdated({
        organizationId: po.organization,
        actorUserId: null,
        purchaseOrder: po
      });

      console.log(`Auto-closed PO ${po.poNumber}`);
    }
  });
};
