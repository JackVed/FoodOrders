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
import { ticketsApi } from "../api/services";
import { EmptyState, ErrorState, LoadingCard, OrderStatusChip } from "../components/Feedback";
import { PageHeader } from "../components/PageHeader";
import { formatDateTime, formatSourceAppLabel } from "../lib/format";

export function TicketsPage() {
  const [status, setStatus] = useState<"" | "Sent" | "Printed">("");
  const [sourceApp, setSourceApp] = useState<"" | "POS" | "Tableside">("");
  const [tableNumber, setTableNumber] = useState("");
  const [orderId, setOrderId] = useState("");
  const [limit, setLimit] = useState("100");

  const filters = useMemo(() => ({
    ...(status ? { status } : {}),
    ...(sourceApp ? { sourceApp } : {}),
    ...(tableNumber ? { tableNumber: Number.parseInt(tableNumber, 10) } : {}),
    ...(orderId ? { orderId: Number.parseInt(orderId, 10) } : {}),
    limit: limit ? Number.parseInt(limit, 10) : 100,
  }), [limit, orderId, sourceApp, status, tableNumber]);

  const ticketsQuery = useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => ticketsApi.list(filters),
  });

  const tickets = ticketsQuery.data?.kitchenTickets ?? [];

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Cucina"
        title="Ticket cucina"
        description="Monitoraggio dei ticket generati dagli ordini e dello stato di consegna alle stampanti."
        actions={(
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void ticketsQuery.refetch()}>
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
            <TextField label="Ordine" type="number" value={orderId} onChange={(event) => setOrderId(event.target.value)} sx={{ maxWidth: 160 }} />
            <TextField label="Limite" type="number" value={limit} onChange={(event) => setLimit(event.target.value)} sx={{ maxWidth: 160 }} />
          </Stack>
        </CardContent>
      </Card>
      {ticketsQuery.isLoading ? <LoadingCard message="Caricamento ticket cucina..." /> : null}
      {ticketsQuery.isError ? (
        <ErrorState
          description={ticketsQuery.error instanceof ApiError ? ticketsQuery.error.message : "Impossibile caricare i ticket."}
          onRetry={() => void ticketsQuery.refetch()}
        />
      ) : null}
      {!ticketsQuery.isLoading && !ticketsQuery.isError && tickets.length === 0 ? (
        <EmptyState
          title="Nessun ticket trovato"
          description="Modifica i filtri oppure crea un nuovo ordine dal POS per generare ticket cucina."
        />
      ) : null}
      {!ticketsQuery.isLoading && !ticketsQuery.isError && tickets.length > 0 ? (
        <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)", overflowX: "auto" }}>
          <CardContent sx={{ p: 0 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket</TableCell>
                  <TableCell>Ordine</TableCell>
                  <TableCell>Area cucina</TableCell>
                  <TableCell>Stampante</TableCell>
                  <TableCell>Tavolo</TableCell>
                  <TableCell>Stato</TableCell>
                  <TableCell>Origine</TableCell>
                  <TableCell>Creato</TableCell>
                  <TableCell align="right">Azioni</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} hover>
                    <TableCell>#{ticket.id}</TableCell>
                    <TableCell>#{ticket.orderReference}</TableCell>
                    <TableCell>{ticket.kitchenArea?.name ?? "-"}</TableCell>
                    <TableCell>{ticket.printer?.name ?? "Non assegnata"}</TableCell>
                    <TableCell>{ticket.tableNumber}</TableCell>
                    <TableCell><OrderStatusChip status={ticket.status} /></TableCell>
                    <TableCell>{formatSourceAppLabel(ticket.sourceApp)}</TableCell>
                    <TableCell>{formatDateTime(ticket.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Button component={RouterLink} to={`/ticket-cucina/${ticket.id}`} size="small" startIcon={<VisibilityIcon />}>
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