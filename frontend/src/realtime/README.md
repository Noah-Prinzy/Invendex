## Invendex Realtime Client

This folder contains a lightweight Socket.IO client integration for dashboard and purchase-order live updates.

### Required frontend dependency

Install:

```bash
npm install socket.io-client
```

### Quick usage

```js
import { useInvendexRealtime } from '../hooks/realtime/useInvendexRealtime';

useInvendexRealtime({
  baseUrl: import.meta.env.VITE_API_URL,
  accessToken,
  warehouseId,
  onInventoryUpdated: (payload) => {
    // refresh inventory widget
  },
  onPurchaseOrderUpdated: (payload) => {
    // refresh purchase order list
  }
});
```

### Supported server events

- `inventory.updated`
- `purchase_order.created`
- `purchase_order.updated`
- `purchase_order.received`
- `finance.cogs_recorded`
- `finance.valuation_updated`
