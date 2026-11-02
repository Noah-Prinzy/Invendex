import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Minus, Plus } from "lucide-react"
import { useState } from "react"
import {
  adjustStock,
  cacheGet,
  cacheSet,
  getProducts,
  type Product,
} from "@/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAppStore } from "@/state/appStore"

const CACHE_KEY = (warehouseId: string) => `products:${warehouseId || "all"}`

export default function ProductsPage() {
  const { activeWarehouseId } = useAppStore()
  const queryClient = useQueryClient()
  const [adjustingId, setAdjustingId] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ["products", activeWarehouseId],
    queryFn: async () => {
      const cached = await cacheGet<{ items: Product[] }>(
        CACHE_KEY(activeWarehouseId),
      )
      try {
        const fresh = await getProducts(activeWarehouseId)
        await cacheSet(CACHE_KEY(activeWarehouseId), fresh)
        return fresh
      } catch (err) {
        if (cached) return cached
        throw err
      }
    },
  })

  const adjust = useMutation({
    mutationFn: (input: { product: Product; delta: number }) =>
      adjustStock({
        productId: input.product._id,
        warehouseId: activeWarehouseId || "all",
        delta: input.delta,
        reason: input.delta > 0 ? "restock" : "adjustment",
      }),
    onMutate: async ({ product, delta }) => {
      setAdjustingId(product._id)
      await queryClient.cancelQueries({
        queryKey: ["products", activeWarehouseId],
      })
      const previous = queryClient.getQueryData<{ items: Product[] }>([
        "products",
        activeWarehouseId,
      ])
      queryClient.setQueryData<{ items: Product[] }>(
        ["products", activeWarehouseId],
        (old) => ({
          items: (old?.items ?? []).map((p) =>
            p._id === product._id ? { ...p, stock: p.stock + delta } : p,
          ),
        }),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["products", activeWarehouseId], ctx.previous)
      }
    },
    onSettled: () => {
      setAdjustingId(null)
      void queryClient.invalidateQueries({ queryKey: ["products"] })
    },
  })

  const products = query.data?.items ?? []

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold">Products</h1>
        {query.isFetching ? (
          <Badge variant="secondary">Syncing…</Badge>
        ) : query.isError ? (
          <Badge variant="destructive">Offline — showing cached data</Badge>
        ) : null}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {products.length} products
            {activeWarehouseId
              ? " in selected warehouse"
              : " across all warehouses"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Price (UGX)</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Adjust</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const low = p.stock <= p.lowStockThreshold
                return (
                  <TableRow key={p._id}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.category ? (
                        <div className="text-xs text-muted-foreground">
                          {p.category}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat("en-UG").format(p.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={low ? "destructive" : "secondary"}>
                        {p.stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={`Decrease ${p.name}`}
                          disabled={adjustingId === p._id}
                          onClick={() =>
                            adjust.mutate({ product: p, delta: -1 })
                          }
                        >
                          <Minus className="size-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={`Increase ${p.name}`}
                          disabled={adjustingId === p._id}
                          onClick={() =>
                            adjust.mutate({ product: p, delta: 1 })
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}
