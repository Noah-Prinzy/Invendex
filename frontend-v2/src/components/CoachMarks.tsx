import { useLocation } from "@tanstack/react-router"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "invendex:v2:coached"

const STEPS = [
  {
    path: "/app",
    title: "Welcome to Invendex",
    text: "This dashboard is your command center. Press Ctrl+K anywhere for every action.",
  },
  {
    path: "/app/products",
    title: "Stock in one table",
    text: "Search, sort and adjust stock inline — works offline and syncs when you're back.",
  },
  {
    path: "/app/purchasing",
    title: "Purchasing",
    text: "Track supplier orders and receive them into stock from one list.",
  },
  {
    path: "/app/reports",
    title: "Reports & settings",
    text: "Money, warehouses, team and security all live here.",
  },
]

export default function CoachMarks() {
  const location = useLocation()
  const [stepIndex, setStepIndex] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    let coached = false
    try {
      coached = window.localStorage.getItem(STORAGE_KEY) === "1"
    } catch {
      coached = false
    }
    if (coached) return
    const idx = STEPS.findIndex((s) => s.path === location.pathname)
    if (idx >= 0) setStepIndex(idx)
  }, [location.pathname])

  if (stepIndex === null) return null
  const step = STEPS[stepIndex]!

  const finish = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      // ignore
    }
    setStepIndex(null)
  }

  const next = () => {
    if (stepIndex === STEPS.length - 1) {
      finish()
    } else {
      setStepIndex(stepIndex + 1)
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Getting started"
      className="fixed bottom-24 left-1/2 z-50 w-[20rem] -translate-x-1/2 border bg-card p-4 shadow-xl max-md:bottom-20"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-heading text-sm font-bold">{step.title}</h2>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          aria-label="Dismiss tutorial"
          onClick={finish}
        >
          <X className="size-3" />
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {stepIndex + 1} / {STEPS.length}
        </span>
        <Button size="sm" onClick={next}>
          {stepIndex === STEPS.length - 1 ? "Done" : "Next"}
        </Button>
      </div>
    </div>
  )
}
