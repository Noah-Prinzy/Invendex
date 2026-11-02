import { beforeEach, describe, expect, it } from "vitest"
import { db, enqueueMutation, pendingMutations } from "./db"

describe("offline outbox", () => {
  beforeEach(async () => {
    await db.outbox.clear()
  })

  it("enqueues a mutation as pending", async () => {
    await enqueueMutation({
      opId: "op-1",
      method: "POST",
      path: "/api/v1/inventory/adjust",
      body: { productId: "p1", delta: -2 },
    })
    const pending = await pendingMutations()
    expect(pending).toHaveLength(1)
    expect(pending[0]?.status).toBe("pending")
    expect(pending[0]?.opId).toBe("op-1")
  })

  it("keeps failed mutations in the pending set for retry", async () => {
    await db.outbox.add({
      opId: "op-2",
      method: "PATCH",
      path: "/api/v1/products/p1",
      body: { name: "x" },
      createdAt: Date.now(),
      attempts: 2,
      status: "failed",
      lastError: "network",
    })
    const pending = await pendingMutations()
    expect(pending).toHaveLength(1)
  })
})
