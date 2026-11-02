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

export const handlers = [
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
