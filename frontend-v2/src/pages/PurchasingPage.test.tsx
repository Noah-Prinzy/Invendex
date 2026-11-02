import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import PurchasingPage from "./PurchasingPage"

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <PurchasingPage />
    </QueryClientProvider>,
  )
}

describe("PurchasingPage", () => {
  beforeEach(async () => {
    await db.cache.clear()
    await db.outbox.clear()
  })

  it("lists purchase orders", async () => {
    renderPage()
    expect(await screen.findByText("PO-0001")).toBeInTheDocument()
    expect(screen.getAllByText("Kampala Wholesalers Ltd").length).toBeGreaterThan(0)
    expect(screen.getByText(/3 purchase orders/)).toBeInTheDocument()
  })

  it("opens the detail drawer", async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText("PO-0002")
    const viewButtons = screen.getAllByRole("button", { name: /view/i })
    await user.click(viewButtons[1]!)
    expect((await screen.findAllByText("Nile Agro Suppliers")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("draft").length).toBeGreaterThan(0)
  })
})
