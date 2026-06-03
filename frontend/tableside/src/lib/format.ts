import { format } from "date-fns";

import type { OrderStatus, SourceApp, UserRole } from "../types";

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "dd/MM/yyyy HH:mm");
}

export function formatRoleLabel(role: UserRole) {
  switch (role) {
    case "admin":
      return "Admin";
    case "management":
      return "Gestione";
    case "operator":
      return "Operatore";
  }
}

export function formatStatusLabel(status: OrderStatus) {
  return status === "Printed" ? "Stampato" : "Inviato";
}

export function formatSourceAppLabel(sourceApp: SourceApp) {
  return sourceApp === "POS" ? "POS" : "Tableside";
}