import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem as SelectOption,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import { ApiError } from "../api/client";
import { ordersApi } from "../api/services";
import { EmptyState, ErrorState, LoadingCard, OrderStatusChip } from "../components/Feedback";
import { PageHeader } from "../components/PageHeader";
import { formatCurrency, formatDateTime } from "../lib/format";

export function OrdersPage() {
  const [status, setStatus] = useState<"" | "Sent" | "Printed">("");
  const [tableNumber, setTableNumber] = useState("");
  const [limit, setLimit] = useState("50");

  const parsedLimit = Number.parseInt(limit, 10);
  const parsedTableNumber = Number.parseInt(tableNumber, 10);
  const filters = {
    sourceApp: "Tableside" as const,
    ...(status ? { status } : {}),
    ...(Number.isInteger(parsedTableNumber) && parsedTableNumber > 0 ? { tableNumber: parsedTableNumber } : {}),
    limit: Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50,
  };

  const ordersQuery = useQuery({
    queryKey: ["orders", filters],
    queryFn: () => ordersApi.list(filters),
  });

  const orders = ordersQuery.data?.orders ?? [];
  const sentCount = orders.filter((order) => order.status === "Sent").length;
  const printedCount = orders.filter((order) => order.status === "Printed").length;

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Storico"
        title="Ordini inviati"
        description="Consulta gli ordini gia inviati dal Tableside, con stato attuale, tavolo e totale confermato dal backend."
        actions={(
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void ordersQuery.refetch()}>
            Aggiorna
          </Button>
        )}
      />

      <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField select label="Stato" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <SelectOption value="">Tutti</SelectOption>
              <SelectOption value="Sent">Inviato</SelectOption>
              <SelectOption value="Printed">Stampato</SelectOption>
            </TextField>
            <TextField
              label="Tavolo"
              type="number"
              value={tableNumber}
              onChange={(event) => setTableNumber(event.target.value)}
            />
            <TextField select label="Limite" value={limit} onChange={(event) => setLimit(event.target.value)}>
              <SelectOption value="25">25</SelectOption>
              <SelectOption value="50">50</SelectOption>
              <SelectOption value="100">100</SelectOption>
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Card elevation={0} sx={{ flex: 1, border: "1px solid rgba(18, 102, 79, 0.14)" }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Ordini caricati</Typography>
            <Typography variant="h2">{orders.length}</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ flex: 1, border: "1px solid rgba(18, 102, 79, 0.14)" }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Inviati</Typography>
            <Typography variant="h2">{sentCount}</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ flex: 1, border: "1px solid rgba(18, 102, 79, 0.14)" }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Stampati</Typography>
            <Typography variant="h2">{printedCount}</Typography>
          </CardContent>
        </Card>
      </Stack>

      {ordersQuery.isLoading ? <LoadingCard message="Caricamento ordini..." /> : null}
      {ordersQuery.isError ? (
        <ErrorState
          description={ordersQuery.error instanceof ApiError ? ordersQuery.error.message : "Impossibile caricare gli ordini."}
          onRetry={() => void ordersQuery.refetch()}
        />
      ) : null}
      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 ? (
        <EmptyState
          title="Nessun ordine trovato"
          description="Non risultano ancora ordini Tableside con questi filtri."
        />
      ) : null}
      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length > 0 ? (
        <Stack spacing={2}>
          {orders.map((order) => (
            <Card key={order.id} elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                    <Stack spacing={0.5}>
                      <Typography variant="h3">Ordine #{order.reference}</Typography>
                      <Typography color="text.secondary">
                        Tavolo {order.tableNumber} · inserito da {order.createdByUsernameSnapshot}
                      </Typography>
                    </Stack>
                    <OrderStatusChip status={order.status} />
                  </Stack>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Chip label={formatDateTime(order.createdAt)} variant="outlined" size="small" />
                    <Chip label={`${order.items.length} righe`} variant="outlined" size="small" />
                    <Chip label={formatCurrency(order.totalAmountCents)} variant="outlined" size="small" />
                  </Stack>
                  <Button component={RouterLink} to={`/ordini/${order.id}`} startIcon={<VisibilityIcon />}>
                    Apri dettaglio
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}