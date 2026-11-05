import { HttpResponse, http } from "msw"
import type { Product } from "@/api/client"

const demoProducts: Product[] = [
  {
    _id: "p1",
    name: "Posho Beans 1kg",
    sku: "POSHO-1KG",
    price: 4500,
    stock: 42,
    lowStockThreshold: 20,
    category: "Groceries",
    barcode: "8901234567890",
  },
  {
    _id: "p2",
    name: "Cooking Oil 1L",
    sku: "OIL-1L",
    price: 8900,
    stock: 8,
    lowStockThreshold: 15,
    category: "Groceries",
    barcode: null,
  },
  {
    _id: "p3",
    name: "Sugar 1kg",
    sku: "SUGAR-1KG",
    price: 5200,
    stock: 60,
    lowStockThreshold: 25,
    category: "Groceries",
    barcode: "8901234567906",
  },
]

export interface PurchaseOrder {
  _id: string
  poNumber: string
  supplier: string
  status: "draft" | "sent" | "received" | "cancelled"
  totalUgx: number
  itemCount: number
  createdAt: string
}

const demoPurchaseOrders: PurchaseOrder[] = [
  {
    _id: "po1",
    poNumber: "PO-0001",
    supplier: "Kampala Wholesalers Ltd",
    status: "sent",
    totalUgx: 450000,
    itemCount: 5,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    _id: "po2",
    poNumber: "PO-0002",
    supplier: "Nile Agro Suppliers",
    status: "draft",
    totalUgx: 189000,
    itemCount: 3,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: "po3",
    poNumber: "PO-0003",
    supplier: "Kampala Wholesalers Ltd",
    status: "received",
    totalUgx: 920000,
    itemCount: 12,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
]

export const handlers = [
  http.get("*/api/v1/purchase-orders", () =>
    HttpResponse.json({ items: demoPurchaseOrders }),
  ),
  http.get("*/api/v1/suppliers", () =>
    HttpResponse.json({
      items: [
        {
          _id: "s1",
          name: "Kampala Wholesalers Ltd",
          phone: "+256 700 111222",
          leadTimeDays: 3,
        },
        {
          _id: "s2",
          name: "Nile Agro Suppliers",
          phone: "+256 772 333444",
          leadTimeDays: 7,
        },
      ],
    }),
  ),
  http.get("*/api/v1/products", ({ request }) => {
    const url = new URL(request.url)
    const warehouseId = url.searchParams.get("warehouseId")
    return HttpResponse.json({
      items: warehouseId
        ? demoProducts.filter((p) => p._id !== "p3")
        : demoProducts,
    })
  }),
  http.post("*/api/v1/inventory/adjust", async ({ request }) => {
    const body = (await request.json()) as { productId: string; delta: number }
    const product = demoProducts.find((p) => p._id === body.productId)
    if (product) product.stock += body.delta
    return HttpResponse.json({ ok: true })
  }),
  http.get("*/api/v1/reports/spend/summary", () =>
    HttpResponse.json({
      totalSpendUgx: 2450000,
      topSupplier: "Kampala Wholesalers Ltd",
      ordersThisMonth: 6,
      avgLeadTimeDays: 4.2,
    }),
  ),
  http.get("*/api/v1/finance/valuation", () =>
    HttpResponse.json({
      method: "FIFO",
      totalValueUgx: 5820000,
      skuCount: demoProducts.length,
    }),
  ),
  http.post("*/api/v1/ai/chat", async ({ request }) => {
    const body = (await request.json()) as { message: string }
    const q = body.message.toLowerCase()
    let answer: string
    if (
      q.includes("stock out") ||
      q.includes("run out") ||
      q.includes("reorder")
    ) {
      answer =
        "Based on current stock and 30-day demand: **Cooking Oil 1L** will stock out in ~5 days at the current rate. Suggested reorder: 24 units from Kampala Wholesalers Ltd (3-day lead time). Want me to draft the purchase order?"
    } else if (q.includes("supplier") || q.includes("lead time")) {
      answer =
        "**Kampala Wholesalers Ltd** is your most reliable supplier: avg lead time 3 days, 98% on-time over the last 90 days. Nile Agro Suppliers averages 7 days."
    } else if (q.includes("dead stock") || q.includes("slow")) {
      answer =
        "No dead stock detected in the last 90 days. Your slowest mover is Sugar 1kg at 4 units/week — still healthy."
    } else {
      answer = `Here's what I see in your data: 3 SKUs tracked, 1 low-stock alert (Cooking Oil 1L), stock value UGX 812,800. Ask me about stock-outs, suppliers, or dead stock.`
    }
    return HttpResponse.json({
      reply: answer,
      suggestions: [
        "Will anything stock out this week?",
        "Which supplier is most reliable?",
        "Any dead stock?",
      ],
    })
  }),
  http.get("*/api/v1/dashboard/summary", () =>
    HttpResponse.json({
      totalSkus: demoProducts.length,
      lowStock: demoProducts.filter((p) => p.stock <= p.lowStockThreshold)
        .length,
      openPurchaseOrders: 3,
      stockValueUgx: demoProducts.reduce(
        (sum, p) => sum + p.stock * p.price,
        0,
      ),
    }),
  ),
]
