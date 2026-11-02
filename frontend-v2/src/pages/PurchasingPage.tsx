import { useQuery } from "@tanstack/react-query"
import { ShoppingCart } from "lucide-react"
import { useState } from "react"
import { apiRequest } from "@/api/client"
import { type Column, DataTable } from "@/components/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { PurchaseOrder } from "@/mocks/handlers"

const STATUS_VARIANT: Record<
  PurchaseOrder["status"],
  "secondary" | "default" | "outline" | "destructive"
> = {
  draft: "outline",
  sent: "default",
  received: "secondary",
  cancelled: "destructive",
}

const getPurchaseOrders = () =>
  apiRequest<{ items: PurchaseOrder[] }>("/api/v1/purchase-orders")

export default function PurchasingPage() {
  const [selected, setSelected] = useState<PurchaseOrder | null>(null)
  const query = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: getPurchaseOrders,
  })
  const orders = query.data?.items ?? []

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "poNumber",
      header: "PO #",
      sortable: true,
      cell: (po) => <span className="font-mono text-xs">{po.poNumber}</span>,
    },
    {
      key: "supplier",
      header: "Supplier",
      sortable: true,
      cell: (po) => po.supplier,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (po) => (
        <Badge variant={STATUS_VARIANT[po.status]} className="capitalize">
          {po.status}
        </Badge>
      ),
    },
    {
      key: "totalUgx",
      header: "Total (UGX)",
      sortable: true,
      className: "text-right",
      cell: (po) => (
        <span className="tabular-nums">
          {new Intl.NumberFormat("en-UG").format(po.totalUgx)}
        </span>
      ),
    },
    {
      key: "itemCount",
      header: "Items",
      sortable: true,
      className: "text-right",
      cell: (po) => po.itemCount,
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      cell: (po) => new Date(po.createdAt).toLocaleDateString("en-UG"),
    },
    {
      key: "view",
      header: "",
      className: "text-right",
      cell: (po) => (
        <Button size="sm" variant="outline" onClick={() => setSelected(po)}>
          View
        </Button>
      ),
    },
  ]

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-heading text-xl font-bold">
          <ShoppingCart className="size-5" /> Purchasing
        </h1>
        <Button>New purchase order</Button>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {orders.length} purchase orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={orders}
            columns={columns}
            rowKey={(po) => po._id}
            isLoading={query.isLoading}
            searchPlaceholder="Search POs or suppliers…"
            searchKeys={["poNumber", "supplier", "status"]}
            emptyState="No purchase orders yet — create one to restock from a supplier."
          />
        </CardContent>
      </Card>
      <Sheet
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selected?.poNumber}</SheetTitle>
            <SheetDescription>
              {selected?.supplier} —{" "}
              {selected
                ? new Date(selected.createdAt).toLocaleString("en-UG")
                : ""}
            </SheetDescription>
          </SheetHeader>
          {selected ? (
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge
                    variant={STATUS_VARIANT[selected.status]}
                    className="capitalize"
                  >
                    {selected.status}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Items</dt>
                <dd>{selected.itemCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="tabular-nums">
                  UGX {new Intl.NumberFormat("en-UG").format(selected.totalUgx)}
                </dd>
              </div>
            </dl>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  )
}
