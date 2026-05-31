import { Suspense, lazy } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { LoadingScreen } from "./components/Feedback";
import { NotificationsProvider } from "./notifications";
import { RedirectIfAuthenticated, RequireAuth, SessionProvider } from "./session";

const AppShell = lazy(() => import("./AppShell").then((module) => ({ default: module.AppShell })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage").then((module) => ({ default: module.OrderDetailPage })));
const OrderEntryPage = lazy(() => import("./pages/OrderEntryPage").then((module) => ({ default: module.OrderEntryPage })));
const OrdersPage = lazy(() => import("./pages/OrdersPage").then((module) => ({ default: module.OrdersPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry(failureCount, error) {
        if (typeof error === "object" && error !== null && "status" in error) {
          return error.status !== 401 && failureCount < 1;
        }

        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationsProvider>
        <SessionProvider>
          <Router>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route
                  path="/login"
                  element={(
                    <RedirectIfAuthenticated>
                      <LoginPage />
                    </RedirectIfAuthenticated>
                  )}
                />
                <Route
                  path="/"
                  element={(
                    <RequireAuth>
                      <AppShell />
                    </RequireAuth>
                  )}
                >
                  <Route index element={<Navigate to="/ordini/nuovo" replace />} />
                  <Route path="ordini/nuovo" element={<OrderEntryPage />} />
                  <Route path="ordini" element={<OrdersPage />} />
                  <Route path="ordini/:orderId" element={<OrderDetailPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </Router>
        </SessionProvider>
      </NotificationsProvider>
    </QueryClientProvider>
  );
}