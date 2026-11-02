import Dexie, { type EntityTable } from "dexie"

export interface OutboxItem {
  id?: number
  opId: string
  method: "POST" | "PATCH" | "PUT" | "DELETE"
  path: string
  body: unknown
  createdAt: number
  attempts: number
  status: "pending" | "syncing" | "failed" | "conflict"
  lastError?: string
}

export interface CachedResource {
  id: string
  data: unknown
  fetchedAt: number
}

class InvendexDB extends Dexie {
  outbox!: EntityTable<OutboxItem, "id">
  cache!: EntityTable<CachedResource, "id">

  constructor() {
    super("invendex-v2")
    this.version(1).stores({
      outbox: "++id, opId, status, createdAt, method, path",
      cache: "id, fetchedAt",
    })
  }
}

export const db = new InvendexDB()

export const enqueueMutation = (
  item: Omit<OutboxItem, "id" | "attempts" | "status" | "createdAt">,
) =>
  db.outbox.add({
    ...item,
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
  })

export const pendingMutations = () =>
  db.outbox.where("status").anyOf("pending", "failed").toArray()
