import { Search } from "lucide-react"
import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
  sortable?: boolean
}

interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  isLoading?: boolean
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  emptyState?: React.ReactNode
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  isLoading = false,
  searchPlaceholder = "Search…",
  searchKeys = [],
  emptyState,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const filtered = useMemo(() => {
    if (!query.trim() || searchKeys.length === 0) return rows
    const q = query.toLowerCase()
    return rows.filter((row) =>
      searchKeys.some((k) =>
        String(row[k] ?? "")
          .toLowerCase()
          .includes(q),
      ),
    )
  }, [rows, query, searchKeys])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const col = columns.find((c) => c.key === sortKey)
      if (!col?.sortable) return 0
      const rawA = a[sortKey as keyof T]
      const rawB = b[sortKey as keyof T]
      const numA = Number(rawA)
      const numB = Number(rawB)
      if (
        Number.isFinite(numA) &&
        Number.isFinite(numB) &&
        rawA !== "" &&
        rawB !== ""
      ) {
        return (numA - numB) * (sortDir === "asc" ? 1 : -1)
      }
      const av = String(rawA ?? "")
      const bv = String(rawB ?? "")
      return (av > bv ? 1 : -1) * (sortDir === "asc" ? 1 : -1)
    })
  }, [filtered, sortKey, sortDir, columns])

  const toggleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {searchKeys.length > 0 ? (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
            aria-label={searchPlaceholder}
          />
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-none border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={c.className}
                  aria-sort={
                    sortKey === c.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <button
                    type="button"
                    className={
                      c.sortable ? "cursor-pointer select-none" : undefined
                    }
                    onClick={() => toggleSort(c.key, c.sortable)}
                  >
                    {c.header}
                    {c.sortable
                      ? sortKey === c.key
                        ? sortDir === "asc"
                          ? " ↑"
                          : " ↓"
                        : ""
                      : null}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }, (_, i) => `row-${i}`).map((k) => (
                  <TableRow key={k}>
                    {columns.map((c) => (
                      <TableCell key={c.key}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : sorted.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((c) => (
                      <TableCell key={c.key} className={c.className}>
                        {c.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            {!isLoading && sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-10 text-center text-muted-foreground"
                >
                  {emptyState ?? "Nothing here yet."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
