import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";

import type { OrderStatus, UserRole } from "../types";
import { formatRoleLabel, formatStatusLabel } from "../lib/format";

export function LoadingScreen({ message = "Caricamento in corso..." }: { message?: string }) {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 4 }}>
      <Stack spacing={2} alignItems="center">
        <CircularProgress />
        <Typography color="text.secondary">{message}</Typography>
      </Stack>
    </Box>
  );
}

export function LoadingCard({ message = "Caricamento in corso..." }: { message?: string }) {
  return (
    <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={24} />
          <Typography color="text.secondary">{message}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card elevation={0} sx={{ border: "1px dashed rgba(18, 102, 79, 0.24)" }}>
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={2} alignItems="flex-start">
          <Typography variant="h3">{title}</Typography>
          <Typography color="text.secondary">{description}</Typography>
          {action}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <Card elevation={0} sx={{ border: "1px solid rgba(183, 28, 28, 0.2)" }}>
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={2}>
          <Alert severity="error">{title ?? "Si e verificato un errore."}</Alert>
          <Typography color="text.secondary">{description}</Typography>
          {onRetry ? <Button onClick={onRetry}>Riprova</Button> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function RoleChip({ role }: { role: UserRole }) {
  const color = role === "admin" ? "secondary" : role === "management" ? "primary" : "default";
  return <Chip label={formatRoleLabel(role)} color={color} size="small" />;
}

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  return <Chip label={formatStatusLabel(status)} color={status === "Printed" ? "success" : "warning"} size="small" />;
}