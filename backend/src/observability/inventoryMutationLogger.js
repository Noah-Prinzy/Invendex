import { logger } from './logger.js';

const coerceNullableString = value => {
  if (value === null || value === undefined) return null;
  return String(value);
};

export const logInventoryMutation = ({
  operation,
  organizationId,
  warehouseId = null,
  productId = null,
  quantityDelta = 0,
  quantityOnHand = null,
  quantityReserved = null,
  sourceType = null,
  sourceId = null,
  actorUserId = null,
  metadata = null
}) => {
  logger.info('inventory_mutation', {
    operation,
    organizationId: coerceNullableString(organizationId),
    warehouseId: coerceNullableString(warehouseId),
    productId: coerceNullableString(productId),
    quantityDelta: Number(quantityDelta || 0),
    quantityOnHand:
      quantityOnHand === null || quantityOnHand === undefined
        ? null
        : Number(quantityOnHand),
    quantityReserved:
      quantityReserved === null || quantityReserved === undefined
        ? null
        : Number(quantityReserved),
    sourceType: coerceNullableString(sourceType),
    sourceId: coerceNullableString(sourceId),
    actorUserId: coerceNullableString(actorUserId),
    metadata
  });
};

export default {
  logInventoryMutation
};
