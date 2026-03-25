# Forecasting Notes

Forecasting and intelligence already show up in multiple parts of the backend:

- demand anomaly detection and AI insight endpoints
- reorder and slow-moving SKU analysis
- stock aging and dead-stock intelligence
- supplier ranking and reliability signals

What exists now:

- dashboard intelligence APIs aggregate operational signals
- AI insight controllers expose anomaly and supplier-reliability data
- finance and inventory services contribute valuation, margin, and dead-stock context

What this doc should grow into:

- forecasting input definitions
- data freshness expectations
- fallback behavior when demand history is sparse
- explanation of confidence, anomalies, and recommended actions

Open questions for future refinement:

- whether demand forecasting should remain request-driven or move to scheduled materialization
- whether anomaly thresholds should be organization-configurable
- how warehouse scoping should affect seasonality models
