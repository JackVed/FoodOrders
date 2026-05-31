import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { ApiError } from "../api/client";
import { ticketsApi } from "../api/services";
import { EmptyState, ErrorState, LoadingCard, OrderStatusChip } from "../components/Feedback";
import { PageHeader } from "../components/PageHeader";
import { formatDateTime, formatSourceAppLabel, prettifyJson } from "../lib/format";
import { hasMinimumRole } from "../lib/roles";
import { useNotifications } from "../notifications";
import { useSession } from "../session";

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const { currentUser } = useSession();
  const parsedTicketId = Number.parseInt(ticketId ?? "", 10);
  const canManage = currentUser ? hasMinimumRole(currentUser.role, "management") : false;

  const ticketQuery = useQuery({
    queryKey: ["ticket", parsedTicketId],
    queryFn: () => ticketsApi.get(parsedTicketId),
    enabled: Number.isInteger(parsedTicketId) && parsedTicketId > 0,
  });

  const retryDeliveryMutation = useMutation({
    mutationFn: () => ticketsApi.retryDelivery(parsedTicketId),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["ticket", parsedTicketId] });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      notify("Retry consegna ticket eseguito.", "success");
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Retry consegna non riuscito.", "error");
    },
  });

  const markPrintedMutation = useMutation({
    mutationFn: () => ticketsApi.markPrinted(parsedTicketId),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["ticket", parsedTicketId] });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      notify("Ticket marcato come stampato.", "success");
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Aggiornamento ticket non riuscito.", "error");
    },
  });

  if (!Number.isInteger(parsedTicketId) || parsedTicketId <= 0) {
    return (
      <Stack spacing={3}>
        <PageHeader eyebrow="Dettaglio" title="Ticket non valido" />
        <ErrorState description="L'identificativo del ticket non e valido." />
      </Stack>
    );
  }

  const ticket = ticketQuery.data?.kitchenTicket;

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Dettaglio"
        title="Ticket cucina"
        description="Contenuto del ticket, tentativi di consegna, payload e azioni operative di gestione."
        actions={(
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void ticketQuery.refetch()}>
              Aggiorna
            </Button>
            {canManage ? (
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => retryDeliveryMutation.mutate()}
                disabled={retryDeliveryMutation.isPending || ticket?.status === "Printed"}
              >
                Riprova consegna
              </Button>
            ) : null}
            {canManage ? (
              <Button
                variant="contained"
                startIcon={<TaskAltIcon />}
                onClick={() => markPrintedMutation.mutate()}
                disabled={markPrintedMutation.isPending || ticket?.status === "Printed"}
              >
                Segna stampato
              </Button>
            ) : null}
          </Stack>
        )}
      />
      {ticketQuery.isLoading ? <LoadingCard message="Caricamento ticket cucina..." /> : null}
      {ticketQuery.isError ? (
        <ErrorState
          description={ticketQuery.error instanceof ApiError ? ticketQuery.error.message : "Impossibile caricare il ticket."}
          onRetry={() => void ticketQuery.refetch()}
        />
      ) : null}
      {!ticketQuery.isLoading && !ticketQuery.isError && !ticket ? (
        <EmptyState title="Ticket non trovato" description="Il ticket richiesto non esiste o non e piu disponibile." />
      ) : null}
      {ticket ? (
        <>
          <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary">Ticket</Typography>
                    <Typography variant="h2">#{ticket.id}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <OrderStatusChip status={ticket.status} />
                    <Chip label={`Ordine ${ticket.orderReference}`} />
                  </Stack>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Area cucina</Typography>
                    <Typography>{ticket.kitchenArea?.name ?? "-"}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Stampante</Typography>
                    <Typography>{ticket.printer?.name ?? "Non assegnata"}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Inserito da</Typography>
                    <Typography>{ticket.insertedByUsernameSnapshot}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Origine</Typography>
                    <Typography>{formatSourceAppLabel(ticket.sourceApp)}</Typography>
                  </Box>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Tavolo</Typography>
                    <Typography>{ticket.tableNumber}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Creato</Typography>
                    <Typography>{formatDateTime(ticket.createdAt)}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Stampato</Typography>
                    <Typography>{formatDateTime(ticket.printedAt)}</Typography>
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
          {retryDeliveryMutation.data ? (
            <Alert severity={retryDeliveryMutation.data.deliveryResult.success ? "success" : "warning"}>
              {retryDeliveryMutation.data.deliveryResult.success
                ? "Retry consegna completato con successo."
                : retryDeliveryMutation.data.deliveryResult.errorMessage ?? "Retry consegna non riuscito."}
            </Alert>
          ) : null}
          <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h3">Contenuto ticket</Typography>
                {ticket.items.length === 0 ? (
                  <EmptyState title="Ticket vuoto" description="Il backend non ha restituito righe per questo ticket." />
                ) : (
                  <List disablePadding>
                    {ticket.items.map((item, index) => (
                      <Box key={item.id}>
                        <ListItem disableGutters sx={{ py: 1.5, alignItems: "flex-start" }}>
                          <ListItemText
                            primary={`${item.quantity}x ${item.displayNameSnapshot}`}
                            secondary={item.selections.length > 0 ? (
                              <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                                {item.selections.map((selection) => (
                                  <Chip
                                    key={`${item.id}:${selection.id}`}
                                    label={`${selection.optionGroupNameSnapshot}: ${selection.optionNameSnapshot}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                              </Stack>
                            ) : null}
                          />
                        </ListItem>
                        {index < ticket.items.length - 1 ? <Divider /> : null}
                      </Box>
                    ))}
                  </List>
                )}
              </Stack>
            </CardContent>
          </Card>
          <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h3">Tentativi di consegna</Typography>
                {ticket.deliveryAttempts.length === 0 ? (
                  <EmptyState title="Nessun tentativo registrato" description="Questo ticket non ha ancora tentativi di consegna registrati." />
                ) : (
                  <Stack spacing={2}>
                    {ticket.deliveryAttempts.map((attempt) => (
                      <Card key={attempt.id} elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.1)" }}>
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                              <Typography fontWeight={700}>
                                Tentativo #{attempt.id}
                              </Typography>
                              <Chip label={attempt.success ? "Successo" : "Errore"} color={attempt.success ? "success" : "warning"} size="small" />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {formatDateTime(attempt.attemptedAt)} · stampante {attempt.printerId ?? "-"}
                            </Typography>
                            {attempt.errorMessage ? <Alert severity="warning">{attempt.errorMessage}</Alert> : null}
                            {attempt.rawResponseJson ? (
                              <Box
                                component="pre"
                                sx={{
                                  m: 0,
                                  p: 2,
                                  borderRadius: 3,
                                  backgroundColor: "rgba(18, 102, 79, 0.06)",
                                  overflowX: "auto",
                                  fontSize: 13,
                                }}
                              >
                                {prettifyJson(attempt.rawResponseJson)}
                              </Box>
                            ) : null}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
          <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h3">Payload ticket</Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 2,
                    borderRadius: 3,
                    backgroundColor: "rgba(18, 102, 79, 0.06)",
                    overflowX: "auto",
                    fontSize: 13,
                  }}
                >
                  {prettifyJson(ticket.payloadJson)}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </>
      ) : null}
    </Stack>
  );
}