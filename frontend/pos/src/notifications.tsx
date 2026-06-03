import { Alert, Snackbar } from "@mui/material";
import { createContext, useContext, useMemo, useState } from "react";

type NotificationSeverity = "success" | "info" | "warning" | "error";

interface NotificationState {
  message: string;
  severity: NotificationSeverity;
}

interface NotificationsContextValue {
  notify: (message: string, severity?: NotificationSeverity) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const value = useMemo<NotificationsContextValue>(() => ({
    notify(message, severity = "info") {
      setNotification({ message, severity });
    },
  }), []);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <Snackbar
        open={notification !== null}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={notification?.severity ?? "info"} onClose={() => setNotification(null)} variant="filled">
          {notification?.message}
        </Alert>
      </Snackbar>
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider.");
  }

  return context;
}