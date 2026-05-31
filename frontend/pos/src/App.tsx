import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AppShell } from "./AppShell";
import { NotificationsProvider } from "./notifications";
import { RedirectIfAuthenticated, RequireAuth, RequireRole, SessionProvider } from "./session";
import { LoginPage } from "./pages/LoginPage";
import { ManagementPage } from "./pages/ManagementPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrderEntryPage } from "./pages/OrderEntryPage";
import { OrdersPage } from "./pages/OrdersPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { TicketsPage } from "./pages/TicketsPage";
import { UsersPage } from "./pages/UsersPage";

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
                <Route path="ticket-cucina" element={<TicketsPage />} />
                <Route path="ticket-cucina/:ticketId" element={<TicketDetailPage />} />
                <Route
                  path="gestione"
                  element={(
                    <RequireRole minimumRole="management">
                      <ManagementPage />
                    </RequireRole>
                  )}
                />
                <Route
                  path="utenti"
                  element={(
                    <RequireRole minimumRole="management">
                      <UsersPage />
                    </RequireRole>
                  )}
                />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </SessionProvider>
      </NotificationsProvider>
    </QueryClientProvider>
  );
}