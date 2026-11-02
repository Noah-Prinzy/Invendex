import { db, enqueueMutation } from "@/lib/db"
import { syncOutbox } from "@/lib/sync"

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const baseUrl = () =>
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/+$/,
    "",
  ) ?? "http://localhost:4000"

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  offline?: boolean
}

export const apiRequest = async <T>(
  path: string,
  { method = "GET", body, offline = false }: RequestOptions = {},
): Promise<T> => {
  const online = typeof navigator === "undefined" ? true : navigator.onLine

  if (method !== "GET" && offline && !online) {
    const opId =
      globalThis.crypto?.randomUUID?.() ?? `op-${Date.now()}-${Math.random()}`
    await enqueueMutation({ opId, method, path, body })
    await syncOutbox().catch(() => {})
    return { queued: true, opId } as T
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers:
      body !== undefined ? { "content-type": "application/json" } : undefined,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new ApiError(res.status, text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const getProducts = (warehouseId: string) =>
  apiRequest<{ items: Product[] }>(
    `/api/v1/products${warehouseId ? `?warehouseId=${warehouseId}` : ""}`,
  )

export const adjustStock = (input: {
  productId: string
  warehouseId: string
  delta: number
  reason: string
}) =>
  apiRequest<{ ok: boolean }>("/api/v1/inventory/adjust", {
    method: "POST",
    body: input,
    offline: true,
  })

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const row = await db.cache.get(key)
  return (row?.data as T) ?? null
}

export const cacheSet = async (key: string, data: unknown): Promise<void> => {
  await db.cache.put({ id: key, data, fetchedAt: Date.now() })
}

export interface Product {
  _id: string
  name: string
  sku: string
  price: number
  stock: number
  lowStockThreshold: number
  category?: string
  barcode?: string | null
}
