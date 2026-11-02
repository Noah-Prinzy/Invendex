import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import AuthPage from "./AuthPage"

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  )
  return { ...actual, useNavigate: () => vi.fn() }
})

describe("AuthPage", () => {
  it("renders the sign-in form", () => {
    render(<AuthPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("shows an error for invalid input", async () => {
    const user = userEvent.setup()
    render(<AuthPage />)
    await user.type(screen.getByLabelText(/email/i), "not-an-email")
    await user.type(screen.getByLabelText(/password/i), "short")
    await user.click(screen.getByRole("button", { name: /sign in/i }))
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
  })
})
