import { projectPromotionAwareDemand } from '../services/aiInsightsService.js';

describe('AI Insights Service', () => {
  it('applies promotion lifts to demand projection', () => {
    const result = projectPromotionAwareDemand({
      baseDailyDemand: 10,
      horizonDays: 7,
      promotions: [
        {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          liftPercent: 50
        }
      ]
    });

    expect(result.horizonDays).toBe(7);
    expect(result.adjustedDemand).toBeGreaterThan(result.baselineDemand);
    expect(result.incrementalDemand).toBeGreaterThan(0);
    expect(result.dailyProjection).toHaveLength(7);
  });

  it('ignores invalid promotions and keeps baseline projection', () => {
    const result = projectPromotionAwareDemand({
      baseDailyDemand: 12,
      horizonDays: 5,
      promotions: [
        {
          startDate: 'invalid-date',
          endDate: 'invalid-date',
          liftPercent: 100
        }
      ]
    });

    expect(result.baselineDemand).toBe(60);
    expect(result.adjustedDemand).toBe(60);
    expect(result.incrementalDemand).toBe(0);
  });
});
