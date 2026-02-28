# Changelog

## Unreleased

### Added

- Product SKU automation with manual override support.
- Barcode and barcode type support for products.
- Product bulk import endpoint and frontend CSV import workflow.
- Product bulk import CSV template download.
- Reports export options for CSV, Excel, and PDF.

### Improved

- Product bulk import safety rails:
  - validate-only mode (no writes),
  - duplicate handling policy (`skip`, `update`, `fail`),
  - atomic-mode validation gate,
  - structured row-level errors for UI and CSV error export.
- CSV export hardening with formula-injection escaping.
