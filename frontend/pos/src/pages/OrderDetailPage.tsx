import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
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
import { Link as RouterLink, useParams } from "react-router-dom";

import { ApiError } from "../api/client";
import { ordersApi } from "../api/services";
import { EmptyState, ErrorState, LoadingCard, OrderStatusChip } from "../components/Feedback";
import { PageHeader } from "../components/PageHeader";
import { formatCurrency, formatDateTime, formatSourceAppLabel } from "../lib/format";
import { hasMinimumRole } from "../lib/roles";
import { useNotifications } from "../notifications";
import { useSession } from "../session";

export function OrderDetailPage() {
  const { orderId } = useParams();
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const { currentUser } = useSession();
  const parsedOrderId = Number.parseInt(orderId ?? "", 10);
  const canManage = currentUser ? hasMinimumRole(currentUser.role, "management") : false;

  const orderQuery = useQuery({
    queryKey: ["order", parsedOrderId],
    queryFn: () => ordersApi.get(parsedOrderId),
    enabled: Number.isInteger(parsedOrderId) && parsedOrderId > 0,
  });

  const retryDeliveryMutation = useMutation({
    mutationFn: () => ordersApi.retryDelivery(parsedOrderId),
    onSuccess(data) {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["order", parsedOrderId] });
      notify(`Retry consegna eseguito per ordine ${data.order.reference}.`, "success");
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Retry consegna non riuscito.", "error");
    },
  });

  if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
    return (
      <Stack spacing={3}>
        <PageHeader eyebrow="Dettaglio" title="Ordine non valido" />
        <ErrorState description="L'identificativo dell'ordine non e valido." />
      </Stack>
    );
  }

  const order = orderQuery.data?.order;

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Dettaglio"
        title="Ordine"
        description="Dettaglio completo dell'ordine con voci, selezioni e ticket cucina generati dal backend."
        actions={(
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void orderQuery.refetch()}>
              Aggiorna
            </Button>
            {canManage ? (
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                disabled={retryDeliveryMutation.isPending || order?.status === "Printed"}
                onClick={() => retryDeliveryMutation.mutate()}
              >
                Riprova consegna ticket
              </Button>
            ) : null}
          </Stack>
        )}
      />
      {orderQuery.isLoading ? <LoadingCard message="Caricamento ordine..." /> : null}
      {orderQuery.isError ? (
        <ErrorState
          description={orderQuery.error instanceof ApiError ? orderQuery.error.message : "Impossibile caricare l'ordine."}
          onRetry={() => void orderQuery.refetch()}
        />
      ) : null}
      {!orderQuery.isLoading && !orderQuery.isError && !order ? (
        <EmptyState title="Ordine non trovato" description="L'ordine richiesto non esiste o non e piu disponibile." />
      ) : null}
      {order ? (
        <>
          <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary">Riferimento ordine</Typography>
                    <Typography variant="h2">#{order.reference}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <OrderStatusChip status={order.status} />
                    <Chip label={`Tavolo ${order.tableNumber}`} />
                    <Chip label={formatSourceAppLabel(order.sourceApp)} variant="outlined" />
                  </Stack>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Inserito da</Typography>
                    <Typography>{order.createdByUsernameSnapshot}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Creato</Typography>
                    <Typography>{formatDateTime(order.createdAt)}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Ultimo aggiornamento</Typography>
                    <Typography>{formatDateTime(order.updatedAt)}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Totale</Typography>
                    <Typography>{formatCurrency(order.totalAmountCents)}</Typography>
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
          {retryDeliveryMutation.data ? (
            <Alert severity="info">
              Retry eseguito su {retryDeliveryMutation.data.deliveryResults.length} ticket dell'ordine.
            </Alert>
          ) : null}
          <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h3">Voci ordine</Typography>
                <List disablePadding>
                  {order.items.map((item, index) => (
                    <Box key={item.id}>
                      <ListItem disableGutters sx={{ py: 1.5, alignItems: "flex-start" }}>
                        <ListItemText
                          primary={`${item.quantity}x ${item.displayNameSnapshot}`}
                          secondary={(
                            <Stack spacing={1} sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {item.kitchenArea?.name ?? "Area cucina non trovata"} · {formatCurrency(item.unitPriceCents)} cad. · {formatCurrency(item.lineTotalCents)} linea
                              </Typography>
                              {item.selections.length > 0 ? (
                                <Stack direction="row" gap={1} flexWrap="wrap">
                                  {item.selections.map((selection) => (
                                    <Chip
                                      key={selection.id}
                                      label={`${selection.optionGroupNameSnapshot}: ${selection.optionNameSnapshot}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  ))}
                                </Stack>
                              ) : null}
                            </Stack>
                          )}
                        />
                      </ListItem>
                      {index < order.items.length - 1 ? <Divider /> : null}
                    </Box>
                  ))}
                </List>
              </Stack>
            </CardContent>
          </Card>
          <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h3">Ticket cucina</Typography>
                {order.tickets.length === 0 ? (
                  <EmptyState title="Nessun ticket collegato" description="Il backend non ha restituito ticket per questo ordine." />
                ) : (
                  <Stack spacing={2}>
                    {order.tickets.map((ticket) => (
                      <Card key={ticket.id} elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.1)" }}>
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
                              <Box>
                                <Typography fontWeight={700}>Ticket #{ticket.id}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {ticket.kitchenArea?.name ?? "Area sconosciuta"} · stampante {ticket.printer?.name ?? "non assegnata"}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <OrderStatusChip status={ticket.status} />
                                <Button component={RouterLink} to={`/ticket-cucina/${ticket.id}`} size="small">
                                  Apri ticket
                                </Button>
                              </Stack>
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              Creato {formatDateTime(ticket.createdAt)} · tentativi {ticket.deliveryAttempts.length}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </>
      ) : null}
    </Stack>
  );
}