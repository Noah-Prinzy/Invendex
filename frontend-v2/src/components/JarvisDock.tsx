import { Bot, Send, Sparkles, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { apiRequest } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChatMessage {
  role: "user" | "jarvis"
  text: string
}

interface ChatResponse {
  reply: string
  suggestions: string[]
}

export default function JarvisDock() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "jarvis",
      text: "Hi, I'm Jarvis — your inventory AI. Ask me anything about your stock, suppliers, or what to reorder.",
    },
  ])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([
    "Will anything stock out this week?",
    "Which supplier is most reliable?",
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener("jarvis:open", onOpen)
    return () => window.removeEventListener("jarvis:open", onOpen)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight })
    }
  }, [messages, open])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setMessages((m) => [...m, { role: "user", text: trimmed }])
    setInput("")
    setBusy(true)
    try {
      const res = await apiRequest<ChatResponse>("/api/v1/ai/chat", {
        method: "POST",
        body: { message: trimmed },
      })
      setMessages((m) => [...m, { role: "jarvis", text: res.reply }])
      setSuggestions(res.suggestions)
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "jarvis",
          text: "I'm offline right now — your question is queued and I'll answer when we're back online.",
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <Button
        size="icon"
        className="fixed bottom-5 right-5 z-40 size-12 rounded-full shadow-lg"
        aria-label="Open Jarvis AI assistant"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="size-5" />
      </Button>
    )
  }

  return (
    <aside
      className="fixed bottom-5 right-5 z-40 flex h-[28rem] w-[22rem] flex-col border bg-card shadow-xl"
      aria-label="Jarvis AI assistant"
    >
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <Bot className="size-4 text-primary" />
        <span className="font-heading text-sm font-bold">Jarvis</span>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto size-7"
          aria-label="Close Jarvis"
          onClick={() => setOpen(false)}
        >
          <X className="size-4" />
        </Button>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 max-w-[85%] px-2.5 py-1.5 text-sm ${
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {m.text}
          </div>
        ))}
        {busy ? (
          <p className="text-xs text-muted-foreground">Jarvis is thinking…</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1 px-3 pb-1">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
            onClick={() => void send(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-2 border-t px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about stock, suppliers…"
          aria-label="Ask Jarvis"
        />
        <Button size="icon" type="submit" aria-label="Send" disabled={busy}>
          <Send className="size-4" />
        </Button>
      </form>
    </aside>
  )
}
