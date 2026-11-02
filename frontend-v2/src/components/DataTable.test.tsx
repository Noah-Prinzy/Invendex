import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { type Column, DataTable } from "./DataTable"

interface Row {
  id: string
  name: string
  qty: number
}

const rows: Row[] = [
  { id: "1", name: "Beans", qty: 42 },
  { id: "2", name: "Oil", qty: 8 },
  { id: "3", name: "Sugar", qty: 60 },
]

const columns: Column<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name, sortable: true },
  { key: "qty", header: "Qty", cell: (r) => r.qty, sortable: true },
]

describe("DataTable", () => {
  it("renders rows and filters by search", async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        searchKeys={["name"]}
      />,
    )
    expect(screen.getByText("Beans")).toBeInTheDocument()
    await user.type(screen.getByRole("textbox"), "oil")
    expect(screen.getByText("Oil")).toBeInTheDocument()
    expect(screen.queryByText("Beans")).not.toBeInTheDocument()
  })

  it("sorts by a sortable column", async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        searchKeys={["name"]}
      />,
    )
    await user.click(screen.getByRole("button", { name: /qty/i }))
    const cells = screen.getAllByRole("cell")
    expect(cells[1]).toHaveTextContent("8")
  })

  it("shows empty state", () => {
    render(
      <DataTable
        rows={[]}
        columns={columns}
        rowKey={(r) => r.id}
        emptyState="No products yet"
      />,
    )
    expect(screen.getByText("No products yet")).toBeInTheDocument()
  })
})
