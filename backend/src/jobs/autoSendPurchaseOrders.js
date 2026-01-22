import cron from 'node-cron';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { sendPurchaseOrder } from '../controllers/purchaseOrderController.js';

export const autoSendPurchaseOrdersJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    console.log('🤖 Running auto-send purchase order job...');

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const draftOrders = await PurchaseOrder.find({
      status: 'draft',
      createdFromAlert: true,
      createdAt: { $lte: tenMinutesAgo }
    });

    for (const po of draftOrders) {
      try {
        await sendPurchaseOrder(
          { params: { id: po._id } },
          { json: () => {} },
          () => {}
        );

        console.log(`✅ Auto-sent PO ${po._id}`);
      } catch (err) {
        console.error(`❌ Failed to auto-send PO ${po._id}`, err);
      }
    }
  });
};