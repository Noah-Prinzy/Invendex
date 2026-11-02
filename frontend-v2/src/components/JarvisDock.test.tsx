import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import JarvisDock from "./JarvisDock"

describe("JarvisDock", () => {
  it("opens via the floating button and answers a question", async () => {
    const user = userEvent.setup()
    render(<JarvisDock />)
    await user.click(screen.getByRole("button", { name: /open jarvis/i }))
    expect(await screen.findByText(/your inventory AI/i)).toBeInTheDocument()
    await user.type(
      screen.getByLabelText(/ask jarvis/i),
      "will anything stock out?",
    )
    await user.click(screen.getByRole("button", { name: /send/i }))
    await waitFor(() =>
      expect(screen.getByText(/Cooking Oil 1L/)).toBeInTheDocument(),
    )
  })

  it("opens via the jarvis:open event (command palette)", async () => {
    render(<JarvisDock />)
    window.dispatchEvent(new CustomEvent("jarvis:open"))
    expect(
      await screen.findByLabelText(/jarvis ai assistant/i),
    ).toBeInTheDocument()
  })

  it("shows quick-reply suggestions", async () => {
    const user = userEvent.setup()
    render(<JarvisDock />)
    await user.click(screen.getByRole("button", { name: /open jarvis/i }))
    await user.click(
      await screen.findByRole("button", {
        name: /which supplier is most reliable/i,
      }),
    )
    await waitFor(() =>
      expect(screen.getByText(/most reliable supplier/i)).toBeInTheDocument(),
    )
  })
})
