import AppError from './AppError.js';
import { PURCHASE_ORDER_TRANSITIONS } from './purchaseOrderTransitions.js';

export const assertValidPurchaseOrderTransition = (
  currentStatus,
  nextStatus
) => {
  const allowed = PURCHASE_ORDER_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      `Invalid purchase order state transition: ${currentStatus} → ${nextStatus}`,
      400
    );
  }
};