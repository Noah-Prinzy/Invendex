export const calculatePurchaseOrderTotals = (items) => {
  let totalQuantity = 0;
  let totalAmount = 0;

  const calculatedItems = items.map((item) => {
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unitCost);

    if (quantity <= 0 || unitCost < 0) {
      throw new Error('Invalid quantity or unit cost');
    }

    const totalCost = quantity * unitCost;

    totalQuantity += quantity;
    totalAmount += totalCost;

    return {
      ...item,
      quantity,
      unitCost,
      totalCost
    };
  });

  return {
    items: calculatedItems,
    totalQuantity,
    totalAmount
  };
};
