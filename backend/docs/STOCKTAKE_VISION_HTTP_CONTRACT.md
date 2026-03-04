# Stocktake Vision HTTP Provider Contract

When `STOCKTAKE_VISION_PROVIDER=http`, Ledgerly calls `STOCKTAKE_VISION_HTTP_URL` with:

```json
{
  "contractVersion": 1,
  "imageBase64": "<base64>",
  "mimeType": "image/jpeg",
  "maxDetections": 50,
  "confidenceThreshold": 0.35,
  "sessionContext": {
    "totalSkuHints": 42
  },
  "skuHints": [
    {
      "productId": "65f...",
      "sku": "SKU-001",
      "productName": "Sample Product",
      "expectedQuantity": 12
    }
  ]
}
```

Provider should return:

```json
{
  "counts": [
    {
      "productId": "65f...",
      "sku": "SKU-001",
      "estimatedQuantity": 11,
      "confidence": 0.81,
      "source": "cv_model"
    }
  ],
  "warnings": []
}
```

Notes:

- `counts` can include `productId` or `sku` (both preferred).
- `estimatedQuantity` must be a non-negative integer.
- `confidence` is clamped to `[0, 1]` by Ledgerly.
- Ledgerly applies policy gates server-side:
  - min confidence
  - max variance ratio
  - max absolute variance
  - rows failing gates are marked `autoApplyEligible=false`.
