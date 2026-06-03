import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Button,
  Card,
  CardContent,
  MenuItem as SelectOption,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import { ApiError } from "../api/client";
import { ordersApi } from "../api/services";
import { EmptyState, ErrorState, LoadingCard, OrderStatusChip } from "../components/Feedback";
import { PageHeader } from "../components/PageHeader";
import { formatCurrency, formatDateTime, formatSourceAppLabel } from "../lib/format";

export function OrdersPage() {
  const [status, setStatus] = useState<"" | "Sent" | "Printed">("");
  const [sourceApp, setSourceApp] = useState<"" | "POS" | "Tableside">("");
  const [tableNumber, setTableNumber] = useState("");
  const [limit, setLimit] = useState("100");

  const filters = useMemo(() => ({
    ...(status ? { status } : {}),
    ...(sourceApp ? { sourceApp } : {}),
    ...(tableNumber ? { tableNumber: Number.parseInt(tableNumber, 10) } : {}),
    limit: limit ? Number.parseInt(limit, 10) : 100,
  }), [limit, sourceApp, status, tableNumber]);

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
        eyebrow="Operativita"
        title="Ordini"
        description="Elenco ordini con stato, tavolo, origine e totale calcolato dal backend."
        actions={(
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void ordersQuery.refetch()}>
            Aggiorna
          </Button>
        )}
      />
      <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField select label="Stato" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} sx={{ minWidth: 160 }}>
              <SelectOption value="">Tutti</SelectOption>
              <SelectOption value="Sent">Inviato</SelectOption>
              <SelectOption value="Printed">Stampato</SelectOption>
            </TextField>
            <TextField select label="Origine" value={sourceApp} onChange={(event) => setSourceApp(event.target.value as typeof sourceApp)} sx={{ minWidth: 160 }}>
              <SelectOption value="">Tutte</SelectOption>
              <SelectOption value="POS">POS</SelectOption>
              <SelectOption value="Tableside">Tableside</SelectOption>
            </TextField>
            <TextField label="Tavolo" type="number" value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} sx={{ maxWidth: 160 }} />
            <TextField label="Limite" type="number" value={limit} onChange={(event) => setLimit(event.target.value)} sx={{ maxWidth: 160 }} />
          </Stack>
        </CardContent>
      </Card>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
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
          description="Modifica i filtri oppure crea un nuovo ordine dal POS."
        />
      ) : null}
      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length > 0 ? (
        <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)", overflowX: "auto" }}>
          <CardContent sx={{ p: 0 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rif.</TableCell>
                  <TableCell>Tavolo</TableCell>
                  <TableCell>Stato</TableCell>
                  <TableCell>Origine</TableCell>
                  <TableCell>Operatore</TableCell>
                  <TableCell>Creato</TableCell>
                  <TableCell>Totale</TableCell>
                  <TableCell align="right">Azioni</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>#{order.reference}</TableCell>
                    <TableCell>{order.tableNumber}</TableCell>
                    <TableCell><OrderStatusChip status={order.status} /></TableCell>
                    <TableCell>{formatSourceAppLabel(order.sourceApp)}</TableCell>
                    <TableCell>{order.createdByUsernameSnapshot}</TableCell>
                    <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(order.totalAmountCents)}</TableCell>
                    <TableCell align="right">
                      <Button component={RouterLink} to={`/ordini/${order.id}`} size="small" startIcon={<VisibilityIcon />}>
                        Apri
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}