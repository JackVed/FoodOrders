import { startTransition, useCallback, useEffect, useState } from "react";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { Navigate, Link as RouterLink, Outlet, useLocation } from "react-router-dom";

import { authApi } from "./api/services";
import { ApiError, setUnauthorizedHandler } from "./api/client";
import { LoadingScreen } from "./components/Feedback";
import { hasMinimumRole } from "./lib/roles";
import type { AuthenticatedUser, UserRole } from "./types";

type SessionStatus = "loading" | "authenticated" | "anonymous";

interface SessionContextValue {
  currentUser: AuthenticatedUser | null;
  status: SessionStatus;
  bootstrapError: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    queryClient.clear();
    startTransition(() => {
      setCurrentUser(null);
      setStatus("anonymous");
    });
  }, [queryClient]);

  const refreshSession = useCallback(async () => {
    startTransition(() => {
      setStatus("loading");
      setBootstrapError(null);
    });

    try {
      const response = await authApi.me();
      startTransition(() => {
        setCurrentUser(response.user);
        setStatus("authenticated");
        setBootstrapError(null);
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        startTransition(() => {
          setCurrentUser(null);
          setStatus("anonymous");
          setBootstrapError(null);
        });
        return;
      }

      startTransition(() => {
        setCurrentUser(null);
        setStatus("anonymous");
        setBootstrapError(error instanceof Error ? error.message : "Impossibile contattare il backend.");
      });
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });

    void refreshSession();

    return () => {
      setUnauthorizedHandler(undefined);
    };
  }, [clearSession, refreshSession]);

  async function login(username: string, password: string) {
    const response = await authApi.login({ username, password });
    queryClient.clear();

    startTransition(() => {
      setCurrentUser(response.user);
      setStatus("authenticated");
      setBootstrapError(null);
    });
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }

  return (
    <SessionContext.Provider value={{ currentUser, status, bootstrapError, login, logout, refreshSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }

  return context;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { status } = useSession();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { status } = useSession();
  const from = (location.state as { from?: string } | null)?.from;

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "authenticated") {
    return <Navigate to={from ?? "/ordini/nuovo"} replace />;
  }

  return <>{children}</>;
}

export function RequireRole({ minimumRole, children }: { minimumRole: UserRole; children: React.ReactNode }) {
  const { currentUser } = useSession();

  if (currentUser && hasMinimumRole(currentUser.role, minimumRole)) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 4 }}>
      <Card elevation={0} sx={{ maxWidth: 560, width: "100%", border: "1px solid rgba(18, 102, 79, 0.14)" }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h2">Accesso non consentito</Typography>
            <Typography color="text.secondary">
              Questa sezione richiede un ruolo con permessi di gestione.
            </Typography>
            <Button component={RouterLink} to="/ordini/nuovo">
              Torna al POS
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export function SessionOutlet() {
  return <Outlet />;
}