import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router"
import { lazy } from "react"
import AppShell from "@/components/AppShell"

const WelcomePage = lazy(() => import("@/pages/WelcomePage"))
const AuthPage = lazy(() => import("@/pages/AuthPage"))
const DashboardPage = lazy(() => import("@/pages/DashboardPage"))
const ProductsPage = lazy(() => import("@/pages/ProductsPage"))
const PurchasingPage = lazy(() => import("@/pages/PurchasingPage"))

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/welcome",
  component: WelcomePage,
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

const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app/products",
  component: () => (
    <AppShell>
      <ProductsPage />
    </AppShell>
  ),
})

const purchasingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app/purchasing",
  component: () => (
    <AppShell>
      <PurchasingPage />
    </AppShell>
  ),
})

const routeTree = rootRoute.addChildren([
  welcomeRoute,
  indexRoute,
  dashboardRoute,
  productsRoute,
  purchasingRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
