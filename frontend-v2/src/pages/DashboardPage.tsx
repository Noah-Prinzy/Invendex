import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppStore } from "@/state/appStore"

interface DashboardSummary {
  totalSkus: number
  lowStock: number
  openPurchaseOrders: number
  stockValueUgx: number
}

const fetchSummary = async (): Promise<DashboardSummary> => {
  const res = await fetch(
    `${(import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000"}/api/v1/dashboard/summary`,
    { credentials: "include" },
  )
  if (!res.ok) throw new Error("Failed to load dashboard")
  return (await res.json()) as DashboardSummary
}

export default function DashboardPage() {
  const { activeWarehouseId } = useAppStore()
  const query = useQuery({
    queryKey: ["dashboard:summary", activeWarehouseId],
    queryFn: fetchSummary,
  })

  const cards: { label: string; value: string }[] = query.data
    ? [
        { label: "Active SKUs", value: String(query.data.totalSkus) },
        { label: "Low stock alerts", value: String(query.data.lowStock) },
        {
          label: "Open purchase orders",
          value: String(query.data.openPurchaseOrders),
        },
        {
          label: "Stock value (UGX)",
          value: new Intl.NumberFormat("en-UG").format(
            query.data.stockValueUgx,
          ),
        },
      ]
    : []

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {query.isLoading
          ? Array.from({ length: 4 }, (_, i) => `skel-${i}`).map((key) => (
              <Skeleton key={key} className="h-24" />
            ))
          : cards.map((c) => (
              <Card key={c.label}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {c.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-2xl font-bold">{c.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>
      {query.isError ? (
        <p className="text-sm text-destructive">
          Could not load live data — showing offline mode.
        </p>
      ) : null}
    </section>
  )
}
