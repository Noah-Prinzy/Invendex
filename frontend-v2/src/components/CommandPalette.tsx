import { useNavigate } from "@tanstack/react-router"
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogIn,
  Moon,
  PackagePlus,
  ShoppingCart,
  Sparkles,
} from "lucide-react"
import { useEffect, useState } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useAppStore } from "@/state/appStore"

interface CommandAction {
  id: string
  label: string
  icon: typeof LayoutDashboard
  shortcut?: string
  run: () => void
  group: string
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const toggleTheme = useAppStore((s) => s.toggleTheme)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const actions: CommandAction[] = [
    {
      id: "dashboard",
      label: "Go to Dashboard",
      icon: LayoutDashboard,
      shortcut: "G D",
      group: "Navigate",
      run: () => void navigate({ to: "/app" }),
    },
    {
      id: "stock",
      label: "Go to Stock",
      icon: Boxes,
      shortcut: "G S",
      group: "Navigate",
      run: () => void navigate({ to: "/app/products" }),
    },
    {
      id: "welcome",
      label: "Go to Welcome page",
      icon: LogIn,
      group: "Navigate",
      run: () => void navigate({ to: "/welcome" }),
    },
    {
      id: "new-product",
      label: "New product",
      icon: PackagePlus,
      shortcut: "N P",
      group: "Actions",
      run: () => void navigate({ to: "/app/products" }),
    },
    {
      id: "purchasing",
      label: "Open purchasing",
      icon: ShoppingCart,
      group: "Actions",
      run: () => void navigate({ to: "/app" }),
    },
    {
      id: "ask-jarvis",
      label: "Ask Jarvis (AI)",
      icon: Sparkles,
      shortcut: "A J",
      group: "Actions",
      run: () => window.dispatchEvent(new CustomEvent("jarvis:open")),
    },
    {
      id: "reports",
      label: "Open reports",
      icon: BarChart3,
      group: "Navigate",
      run: () => void navigate({ to: "/app" }),
    },
    {
      id: "theme",
      label: "Toggle dark mode",
      icon: Moon,
      group: "Preferences",
      run: () => toggleTheme(),
    },
  ]

  const groups = [...new Set(actions.map((a) => a.group))]

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results. Try "stock" or "ask Jarvis".</CommandEmpty>
        {groups.map((g) => (
          <CommandGroup key={g} heading={g}>
            {actions
              .filter((a) => a.group === g)
              .map((a) => (
                <CommandItem
                  key={a.id}
                  value={a.label}
                  onSelect={() => {
                    setOpen(false)
                    a.run()
                  }}
                >
                  <a.icon className="size-4" />
                  <span>{a.label}</span>
                  {a.shortcut ? (
                    <CommandShortcut>{a.shortcut}</CommandShortcut>
                  ) : null}
                </CommandItem>
              ))}
          </CommandGroup>
        ))}
        <CommandSeparator />
      </CommandList>
    </CommandDialog>
  )
}
