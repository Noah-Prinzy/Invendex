import { Link, useNavigate } from "@tanstack/react-router"
import {
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
import CommandPalette from "@/components/CommandPalette"
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
      <CommandPalette />
      <nav className="flex items-center gap-1 border-b px-4 py-2 text-sm">
        <Link
          to="/app"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-accent [&.active]:bg-accent [&.active]:font-medium"
        >
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>
        <Link
          to="/app/products"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-accent [&.active]:bg-accent [&.active]:font-medium"
        >
          <Package className="size-4" />
          Stock
        </Link>
        <Link
          to="/app/purchasing"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-accent [&.active]:bg-accent [&.active]:font-medium"
        >
          <ShoppingCart className="size-4" />
          Purchasing
        </Link>
      </nav>
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
