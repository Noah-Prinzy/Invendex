import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSync } from "./lib/sync"
import { router } from "./router"
import "./index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

registerSync()

if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === "true") {
  const { worker } = await import("./mocks/browser")
  await worker.start()
}

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Missing #root element")
createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
