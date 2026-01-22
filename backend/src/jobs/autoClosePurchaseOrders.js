import cron from 'node-cron';
import PurchaseOrder from '../models/PurchaseOrder.js';

export const autoClosePurchaseOrdersJob = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running auto-close purchase orders job...');

    const fourteenDaysAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000
    );

    const staleOrders = await PurchaseOrder.find({
      status: 'sent',
      received: false,
      sentAt: { $lte: fourteenDaysAgo }
    });

    for (const po of staleOrders) {
      po.status = 'closed';
      po.closedReason = 'Auto-closed: not received after 14 days';
      po.closedAt = new Date();

      await po.save();

      console.log(`✅ Auto-closed PO ${po.poNumber}`);
    }
  });
};
