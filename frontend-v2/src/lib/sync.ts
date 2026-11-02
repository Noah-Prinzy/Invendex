import { db, type OutboxItem, pendingMutations } from "./db"

const getBaseUrl = () =>
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/+$/,
    "",
  ) ?? "http://localhost:4000"

const replayOne = async (item: OutboxItem): Promise<boolean> => {
  if (item.id === undefined) return false
  await db.outbox.update(item.id, { status: "syncing" })
  try {
    const res = await fetch(`${getBaseUrl()}${item.path}`, {
      method: item.method,
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": item.opId,
      },
      credentials: "include",
      body: item.method === "DELETE" ? undefined : JSON.stringify(item.body),
    })
    if (res.status === 409) {
      await db.outbox.update(item.id, {
        status: "conflict",
        lastError: "conflict",
      })
      return false
    }
    if (!res.ok) {
      await db.outbox.update(item.id, {
        status: "failed",
        attempts: item.attempts + 1,
        lastError: `HTTP ${res.status}`,
      })
      return false
    }
    await db.outbox.delete(item.id)
    return true
  } catch {
    await db.outbox.update(item.id, {
      status: "failed",
      attempts: item.attempts + 1,
      lastError: "network",
    })
    return false
  }
}

export const syncOutbox = async (): Promise<{
  synced: number
  remaining: number
}> => {
  const items = await pendingMutations()
  let synced = 0
  for (const item of items) {
    if (await replayOne(item)) synced += 1
  }
  const remaining = (await pendingMutations()).length
  return { synced, remaining }
}

export const registerSync = () => {
  if (typeof window === "undefined") return
  window.addEventListener("online", () => {
    void syncOutbox()
  })
  window.addEventListener("focus", () => {
    void syncOutbox()
  })
  const register = async () => {
    if (!("serviceWorker" in navigator)) return
    try {
      await navigator.serviceWorker.register("/sw.js")
    } catch {
      // offline shell optional during development
    }
  }
  void register()
}
