import { startTransition, useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { authApi } from "./api/services";
import { ApiError, setUnauthorizedHandler } from "./api/client";
import { LoadingScreen } from "./components/Feedback";
import type { AuthenticatedUser } from "./types";

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