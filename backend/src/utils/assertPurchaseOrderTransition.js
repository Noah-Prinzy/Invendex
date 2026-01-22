import { AppError } from '../errors/AppError.js';
import { PURCHASE_ORDER_TRANSITIONS } from '../constants/purchaseOrderTransitions.js';

/**
 * Enforces valid purchase order state transitions.
 * Idempotent-safe: transitioning to the same state is allowed.
 */
export const assertPurchaseOrderTransition = ({
  currentStatus,
  nextStatus
}) => {
  if (!currentStatus || !nextStatus) {
    throw new AppError(
      'Purchase order transition requires both currentStatus and nextStatus',
      400
    );
  }

  // Normalize (defensive against casing issues)
  const from = currentStatus.toUpperCase();
  const to = nextStatus.toUpperCase();

  // Idempotent no-op (safe for retries)
  if (from === to) return;

  const allowedNextStates = PURCHASE_ORDER_TRANSITIONS[from];

  if (!allowedNextStates) {
    throw new AppError(
      `Unknown purchase order status "${from}"`,
      400
    );
  }

  if (!allowedNextStates.includes(to)) {
    throw new AppError(
      `Invalid purchase order transition from "${from}" to "${to}"`,
      400
    );
  }
};