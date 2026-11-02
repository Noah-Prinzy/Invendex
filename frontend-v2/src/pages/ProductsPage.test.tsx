import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import { useAppStore } from "@/state/appStore"
import ProductsPage from "./ProductsPage"

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ProductsPage />
    </QueryClientProvider>,
  )
}

describe("ProductsPage", () => {
  beforeEach(async () => {
    await db.cache.clear()
    await db.outbox.clear()
    useAppStore.setState({ activeWarehouseId: "" })
  })

  it("lists products from the API", async () => {
    renderPage()
    expect(await screen.findByText("Posho Beans 1kg")).toBeInTheDocument()
    expect(screen.getByText("Sugar 1kg")).toBeInTheDocument()
    expect(screen.getByText(/3 products/)).toBeInTheDocument()
  })

  it("flags low stock", async () => {
    renderPage()
    await screen.findByText("Cooking Oil 1L")
    expect(screen.getByText("8")).toBeInTheDocument()
  })

  it("optimistically adjusts stock and posts to the API", async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText("Posho Beans 1kg")
    const before = screen.getByText("42")
    await user.click(
      screen.getByRole("button", { name: /increase posho beans/i }),
    )
    await waitFor(() => expect(screen.getByText("43")).toBeInTheDocument())
    expect(before).toBeInTheDocument()
  })

  it("filters products when a warehouse is selected", async () => {
    useAppStore.setState({ activeWarehouseId: "wh-kampala" })
    renderPage()
    await screen.findByText("Posho Beans 1kg")
    expect(screen.queryByText("Sugar 1kg")).not.toBeInTheDocument()
    expect(screen.getByText(/2 products/)).toBeInTheDocument()
  })
})
