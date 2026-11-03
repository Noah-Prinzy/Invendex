import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import CoachMarks from "./CoachMarks"

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  )
  return { ...actual, useLocation: () => ({ pathname: currentPath }) }
})

let currentPath = "/app"

describe("CoachMarks", () => {
  beforeEach(() => {
    window.localStorage.clear()
    currentPath = "/app"
  })

  it("shows the first coach mark on /app for a new user", async () => {
    render(<CoachMarks />)
    expect(await screen.findByText("Welcome to Invendex")).toBeInTheDocument()
    expect(screen.getByText("1 / 4")).toBeInTheDocument()
  })

  it("does not show after dismissal (persisted)", async () => {
    const user = userEvent.setup()
    render(<CoachMarks />)
    await screen.findByText("Welcome to Invendex")
    await user.click(screen.getByRole("button", { name: /dismiss tutorial/i }))
    expect(screen.queryByText("Welcome to Invendex")).not.toBeInTheDocument()
    expect(window.localStorage.getItem("invendex:v2:coached")).toBe("1")
  })

  it("shows nothing on unknown paths", () => {
    currentPath = "/welcome"
    render(<CoachMarks />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("advances steps with Next", async () => {
    const user = userEvent.setup()
    render(<CoachMarks />)
    await screen.findByText("Welcome to Invendex")
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /next/i }))
    })
    expect(screen.getByText("2 / 4")).toBeInTheDocument()
  })
})
