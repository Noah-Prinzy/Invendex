import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router"
import { lazy } from "react"
import AppShell from "@/components/AppShell"

const AuthPage = lazy(() => import("@/pages/AuthPage"))
const DashboardPage = lazy(() => import("@/pages/DashboardPage"))

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: AuthPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  component: () => (
    <AppShell>
      <DashboardPage />
    </AppShell>
  ),
})

const routeTree = rootRoute.addChildren([indexRoute, dashboardRoute])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
