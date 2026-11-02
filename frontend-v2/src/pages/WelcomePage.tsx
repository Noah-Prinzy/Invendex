import { Link } from "@tanstack/react-router"
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Boxes,
  ScanLine,
  Warehouse,
} from "lucide-react"
import Logo from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const FEATURES = [
  {
    icon: Warehouse,
    title: "Multi-warehouse stock",
    text: "Track every SKU across all your shops and warehouses in one live view.",
  },
  {
    icon: ScanLine,
    title: "Scan to count",
    text: "Use your phone camera for barcode/QR stocktakes — works offline on the floor.",
  },
  {
    icon: BellRing,
    title: "Smart reorder alerts",
    text: "AI forecasts demand and tells you what to reorder, before you run out.",
  },
  {
    icon: BarChart3,
    title: "Reports that make sense",
    text: "Valuation, COGS, dead stock and spend — in UGX or any currency, exportable.",
  },
]

export default function WelcomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 font-heading text-xl font-bold">
          <Logo size={28} />
          Invendex
        </div>
        <Button asChild>
          <Link to="/">Sign in</Link>
        </Button>
      </header>
      <section className="flex flex-col items-center gap-6 px-6 py-16 text-center">
        <div className="flex items-center gap-3 rounded-none border bg-card px-4 py-2 text-sm text-muted-foreground">
          <Boxes className="size-4 text-primary" />
          Built for African businesses — offline-first, mobile money ready
        </div>
        <h1 className="max-w-3xl font-heading text-4xl font-bold leading-tight sm:text-5xl">
          Every item, every shop,{" "}
          <span className="text-primary">counted and forecast by AI</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Invendex replaces notebooks and guesswork with real-time,
          warehouse-aware inventory and purchasing — so you never lose a sale to
          an empty shelf.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link to="/">
              Get started free <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/app">Open dashboard</Link>
          </Button>
        </div>
      </section>
      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <CardHeader className="pb-2">
              <f.icon className="size-6 text-primary" />
              <CardTitle className="text-base">{f.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {f.text}
            </CardContent>
          </Card>
        ))}
      </section>
      <footer className="mt-auto border-t px-6 py-4 text-center text-sm text-muted-foreground">
        Invendex — inventory that thinks ahead.
      </footer>
    </main>
  )
}
