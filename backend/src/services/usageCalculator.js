export const calculateAverageDailyUsage = (
  stockHistory,
  windowDays = 30
) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);

  const sales = stockHistory.filter(
    (entry) =>
      entry.change < 0 &&
      entry.reason === 'sale' &&
      new Date(entry.createdAt) >= cutoff
  );

  const totalSold = sales.reduce(
    (sum, entry) => sum + Math.abs(entry.change),
    0
  );

  return Number((totalSold / windowDays).toFixed(2));
};