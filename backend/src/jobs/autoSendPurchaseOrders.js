import cron from 'node-cron';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { sendPurchaseOrder } from '../services/purchaseOrderService.js';
import { publishPurchaseOrderUpdated } from '../realtime/publisher.js';

export const autoSendPurchaseOrdersJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('Running auto-send purchase order job...');

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const queryResult = await PurchaseOrder.find({
        status: 'DRAFT',
        source: 'REORDER_ENGINE',
        createdAt: { $lte: tenMinutesAgo }
      })
        .lean()
        .exec();

      const draftOrders = Array.isArray(queryResult) ? queryResult : [];
      if (!Array.isArray(queryResult)) {
        console.error(
          'Auto-send PO job expected array from PurchaseOrder.find, got:',
          Object.prototype.toString.call(queryResult)
        );
      }

      for (const po of draftOrders) {
        try {
          await sendPurchaseOrder({
            purchaseOrderId: po._id,
            userId: null,
            organizationId: po.organization
          });

          const updated = await PurchaseOrder.findById(po._id);
          if (updated) {
            publishPurchaseOrderUpdated({
              organizationId: updated.organization,
              actorUserId: null,
              purchaseOrder: updated
            });
          }

          console.log(`Auto-sent PO ${po._id}`);
        } catch (err) {
          console.error(`Failed to auto-send PO ${po._id}`, err);
        }
      }
    } catch (err) {
      console.error(
        'Auto-send purchase order job failed before iteration',
        err
      );
    }
  });
};
