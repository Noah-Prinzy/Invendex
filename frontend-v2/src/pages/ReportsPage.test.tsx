import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import ReportsPage from "./ReportsPage"

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ReportsPage />
    </QueryClientProvider>,
  )
}

describe("ReportsPage", () => {
  it("shows spend summary on the reports tab", async () => {
    renderPage()
    expect(await screen.findByText("UGX 2,450,000")).toBeInTheDocument()
    expect(screen.getByText("Kampala Wholesalers Ltd")).toBeInTheDocument()
  })

  it("switches to finance tab and shows valuation", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole("tab", { name: /finance/i }))
    expect(await screen.findByText("UGX 5,820,000")).toBeInTheDocument()
  })

  it("has all five consolidated tabs", () => {
    renderPage()
    for (const name of [
      "Reports",
      "Finance",
      "Warehouses",
      "Team",
      "Security",
    ]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument()
    }
  })
})
