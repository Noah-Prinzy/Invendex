import { create } from "zustand"

interface AppState {
  activeWarehouseId: string
  isOnline: boolean
  offlineQueueSize: number
  theme: "light" | "dark"
  setActiveWarehouseId: (id: string) => void
  setIsOnline: (online: boolean) => void
  setOfflineQueueSize: (size: number) => void
  toggleTheme: () => void
}

export const useAppStore = create<AppState>((set) => ({
  activeWarehouseId: "",
  isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
  offlineQueueSize: 0,
  theme: "light",
  setActiveWarehouseId: (id) => set({ activeWarehouseId: id }),
  setIsOnline: (online) => set({ isOnline: online }),
  setOfflineQueueSize: (size) => set({ offlineQueueSize: size }),
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light"
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next === "dark")
      }
      return { theme: next }
    }),
}))
