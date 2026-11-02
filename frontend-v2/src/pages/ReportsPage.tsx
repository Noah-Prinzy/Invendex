import { useQuery } from "@tanstack/react-query"
import {
  BarChart3,
  Building2,
  Download,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react"
import { useState } from "react"
import { apiRequest } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const getSpend = () =>
  apiRequest<{
    totalSpendUgx: number
    topSupplier: string
    ordersThisMonth: number
    avgLeadTimeDays: number
  }>("/api/v1/reports/spend/summary")

const getValuation = () =>
  apiRequest<{ method: string; totalValueUgx: number; skuCount: number }>(
    "/api/v1/finance/valuation",
  )

const fmtUgx = (n: number) => `UGX ${new Intl.NumberFormat("en-UG").format(n)}`

export default function ReportsPage() {
  const [tab, setTab] = useState("reports")
  const spend = useQuery({ queryKey: ["reports:spend"], queryFn: getSpend })
  const valuation = useQuery({
    queryKey: ["finance:valuation"],
    queryFn: getValuation,
  })

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-heading text-xl font-bold">
          <BarChart3 className="size-5" /> Reports & Settings
        </h1>
        <Button variant="outline" size="sm">
          <Download className="size-4" /> Export CSV
        </Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Spend this month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-2xl font-bold">
                  {spend.data ? fmtUgx(spend.data.totalSpendUgx) : "…"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Top supplier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-lg font-bold">
                  {spend.data?.topSupplier ?? "…"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg lead time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-2xl font-bold">
                  {spend.data ? `${spend.data.avgLeadTimeDays} days` : "…"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="finance" className="mt-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inventory valuation ({valuation.data?.method ?? "…"})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl font-bold">
                {valuation.data ? fmtUgx(valuation.data.totalValueUgx) : "…"}
              </p>
              <p className="text-sm text-muted-foreground">
                across {valuation.data?.skuCount ?? "…"} SKUs
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4" /> Warehouses
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Kampala Central (KLA) · Gulu Depot (GUL) — manage locations here.
              Use the selector in the header to scope all data.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" /> Team & roles
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Invite staff and assign roles (owner / admin / manager / staff)
              here. Pending signup requests appear in the notifications bell.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4" /> Security & account
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>
                Two-factor authentication, active sessions and sign-out live
                here.
              </p>
              <div>
                <Button variant="outline" size="sm">
                  Manage sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Truck className="size-3" /> Supplier and delivery insights are computed
        from your purchase orders.
      </p>
    </section>
  )
}
