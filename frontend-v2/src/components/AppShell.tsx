import { Link, useNavigate } from "@tanstack/react-router"
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  ShoppingCart,
  Sun,
  Warehouse,
} from "lucide-react"
import type { ReactNode } from "react"
import { lazy, Suspense } from "react"

const CommandPalette = lazy(() => import("@/components/CommandPalette"))
const JarvisDock = lazy(() => import("@/components/JarvisDock"))
const CoachMarks = lazy(() => import("@/components/CoachMarks"))

import Logo from "@/components/Logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppStore } from "@/state/appStore"

const WAREHOUSES = [
  { id: "wh-kampala", name: "Kampala Central", code: "KLA" },
  { id: "wh-gulu", name: "Gulu Depot", code: "GUL" },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const {
    activeWarehouseId,
    isOnline,
    offlineQueueSize,
    theme,
    setActiveWarehouseId,
    toggleTheme,
  } = useAppStore()

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link
          to="/app"
          className="flex items-center gap-2 font-heading text-lg font-bold"
        >
          <Logo size={24} />
          Invendex
        </Link>
        <div className="ml-4 flex items-center gap-2">
          <Warehouse className="size-4 text-muted-foreground" />
          <Select
            value={activeWarehouseId || "all"}
            onValueChange={(v) => setActiveWarehouseId(v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-52" aria-label="Warehouse">
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {WAREHOUSES.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={isOnline ? "secondary" : "destructive"}>
            {isOnline
              ? "Online"
              : `Offline${offlineQueueSize ? ` · ${offlineQueueSize} queued` : ""}`}
          </Badge>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            {theme === "light" ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() => void navigate({ to: "/" })}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>
      <Suspense fallback={null}>
        <CommandPalette />
        <JarvisDock />
      </Suspense>
      <nav
        aria-label="Primary"
        className="flex items-center gap-1 border-b px-4 py-2 text-sm max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-30 max-md:border-b-0 max-md:border-t max-md:bg-background max-md:justify-around max-md:py-2"
      >
        <Link
          to="/app"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-accent [&.active]:bg-accent [&.active]:font-medium max-md:flex-col max-md:gap-0.5 max-md:px-2 max-md:text-xs"
        >
          <LayoutDashboard className="size-4" />
          <span className="max-md:inline">Dashboard</span>
        </Link>
        <Link
          to="/app/products"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-accent [&.active]:bg-accent [&.active]:font-medium max-md:flex-col max-md:gap-0.5 max-md:px-2 max-md:text-xs"
        >
          <Package className="size-4" />
          <span className="max-md:inline">Stock</span>
        </Link>
        <Link
          to="/app/purchasing"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-accent [&.active]:bg-accent [&.active]:font-medium max-md:flex-col max-md:gap-0.5 max-md:px-2 max-md:text-xs"
        >
          <ShoppingCart className="size-4" />
          <span className="max-md:inline">Purchasing</span>
        </Link>
        <Link
          to="/app/reports"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-accent [&.active]:bg-accent [&.active]:font-medium max-md:flex-col max-md:gap-0.5 max-md:px-2 max-md:text-xs"
        >
          <BarChart3 className="size-4" />
          <span className="max-md:inline">Reports</span>
        </Link>
      </nav>
      <main className="flex-1 p-4 max-md:pb-20">{children}</main>
      <CoachMarks />
    </div>
  )
}
