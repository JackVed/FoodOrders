import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import CategoryIcon from "@mui/icons-material/Category";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LocalDiningIcon from "@mui/icons-material/LocalDining";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
import TableRestaurantIcon from "@mui/icons-material/TableRestaurant";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import { ApiError } from "../api/client";
import { menuApi, ordersApi, type CreateOrderItemInput } from "../api/services";
import { EmptyState, ErrorState, LoadingCard } from "../components/Feedback";
import { PageHeader } from "../components/PageHeader";
import { formatCurrency } from "../lib/format";
import { estimateMenuItemUnitPriceCents } from "../lib/pricing";
import { useNotifications } from "../notifications";
import type { MenuCategory, MenuItem, MenuOptionGroup } from "../types";

interface CartSelection {
  optionGroupId: number;
  optionId: number;
  optionGroupName: string;
  optionName: string;
}

interface CartLine {
  key: string;
  menuItemId: number;
  displayName: string;
  quantity: number;
  estimatedUnitPriceCents: number;
  kitchenAreaName: string | null;
  selections: CartSelection[];
}

function getCartKey(menuItemId: number, selections: CartSelection[]) {
  const normalizedSelections = [...selections]
    .sort((left, right) => left.optionGroupId - right.optionGroupId || left.optionId - right.optionId)
    .map((selection) => `${selection.optionGroupId}:${selection.optionId}`)
    .join("|");

  return `${menuItemId}:${normalizedSelections}`;
}

function buildSelections(menuItem: MenuItem, selectedOptionIdsByGroupId: Record<number, number[]>) {
  return menuItem.optionGroups.flatMap((optionGroup) => {
    const selectedIds = selectedOptionIdsByGroupId[optionGroup.id] ?? [];

    return optionGroup.options
      .filter((option) => selectedIds.includes(option.id))
      .map((option) => ({
        optionGroupId: optionGroup.id,
        optionId: option.id,
        optionGroupName: optionGroup.name,
        optionName: option.name,
      }));
  });
}

function validateSelections(menuItem: MenuItem, selectedOptionIdsByGroupId: Record<number, number[]>) {
  const invalidGroupIds = menuItem.optionGroups
    .filter((group) => {
      const selectedCount = selectedOptionIdsByGroupId[group.id]?.length ?? 0;
      return selectedCount < group.minSelect || selectedCount > group.maxSelect;
    })
    .map((group) => group.id);

  return {
    valid: invalidGroupIds.length === 0,
    invalidGroupIds,
  };
}

function SelectionComposerDialog({
  item,
  open,
  onClose,
  onConfirm,
}: {
  item: MenuItem | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (item: MenuItem, selectedOptionIdsByGroupId: Record<number, number[]>) => void;
}) {
  const [selectedOptionIdsByGroupId, setSelectedOptionIdsByGroupId] = useState<Record<number, number[]>>({});
  const [invalidGroupIds, setInvalidGroupIds] = useState<number[]>([]);

  useEffect(() => {
    setSelectedOptionIdsByGroupId({});
    setInvalidGroupIds([]);
  }, [item?.id, open]);

  if (!item) {
    return null;
  }

  const currentItem = item;

  const estimatedUnitPriceCents = estimateMenuItemUnitPriceCents(currentItem, selectedOptionIdsByGroupId);

  function toggleOption(group: MenuOptionGroup, optionId: number) {
    setSelectedOptionIdsByGroupId((currentValue) => {
      const selectedIds = currentValue[group.id] ?? [];

      if (selectedIds.includes(optionId)) {
        return {
          ...currentValue,
          [group.id]: selectedIds.filter((candidate) => candidate !== optionId),
        };
      }

      if (group.maxSelect === 1) {
        return {
          ...currentValue,
          [group.id]: [optionId],
        };
      }

      if (selectedIds.length >= group.maxSelect) {
        return currentValue;
      }

      return {
        ...currentValue,
        [group.id]: [...selectedIds, optionId],
      };
    });
  }

  function handleConfirm() {
    const validation = validateSelections(currentItem, selectedOptionIdsByGroupId);

    if (!validation.valid) {
      setInvalidGroupIds(validation.invalidGroupIds);
      return;
    }

    onConfirm(currentItem, selectedOptionIdsByGroupId);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{currentItem.name}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Alert severity="info">
            Prezzo base {formatCurrency(item.basePriceCents)}. Totale stimato attuale {formatCurrency(estimatedUnitPriceCents)}.
            Il backend confermera il totale finale quando l'ordine verra inviato.
          </Alert>
          {currentItem.optionGroups.map((group) => {
            const selectedIds = selectedOptionIdsByGroupId[group.id] ?? [];
            const groupInvalid = invalidGroupIds.includes(group.id);

            return (
              <Card key={group.id} elevation={0} sx={{ border: groupInvalid ? "1px solid rgba(183, 28, 28, 0.3)" : "1px solid rgba(18, 102, 79, 0.14)" }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="h3">{group.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Seleziona da {group.minSelect} a {group.maxSelect} opzioni.
                        </Typography>
                      </Box>
                      <Chip label={`${selectedIds.length}/${group.maxSelect}`} color={groupInvalid ? "error" : "default"} />
                    </Stack>
                    {group.options.map((option) => {
                      const selected = selectedIds.includes(option.id);
                      const disabled = !selected && group.maxSelect > 1 && selectedIds.length >= group.maxSelect;

                      return (
                        <ListItemButton
                          key={option.id}
                          onClick={() => toggleOption(group, option.id)}
                          disabled={disabled}
                          sx={{ borderRadius: 3, border: selected ? "1px solid rgba(18, 102, 79, 0.3)" : "1px solid rgba(18, 102, 79, 0.08)", mb: 1 }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Chip size="small" color={selected ? "primary" : "default"} label={selected ? "OK" : "+"} />
                          </ListItemIcon>
                          <ListItemText
                            primary={option.name}
                            secondary={option.defaultDeltaCents === 0 ? "Nessun sovrapprezzo base" : `Delta base ${formatCurrency(option.defaultDeltaCents)}`}
                          />
                        </ListItemButton>
                      );
                    })}
                    {groupInvalid ? (
                      <Typography variant="body2" color="error.main">
                        Completa questo gruppo rispettando i limiti minimi e massimi.
                      </Typography>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Annulla</Button>
        <Button variant="contained" onClick={handleConfirm}>Aggiungi al carrello</Button>
      </DialogActions>
    </Dialog>
  );
}

export function OrderEntryPage() {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [tableNumber, setTableNumber] = useState("1");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [composerItem, setComposerItem] = useState<MenuItem | null>(null);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<{
    orderId: number;
    reference: number;
    totalAmountCents: number;
    deliveryResults: Array<{ success: boolean; ticketId: number; errorMessage?: string | null }>;
  } | null>(null);

  const menuQuery = useQuery({
    queryKey: ["menu"],
    queryFn: () => menuApi.getMenu(),
  });

  const createOrderMutation = useMutation({
    mutationFn: (items: CreateOrderItemInput[]) => {
      const parsedTableNumber = Number.parseInt(tableNumber, 10);

      return ordersApi.create({
        sourceApp: "POS",
        tableNumber: parsedTableNumber,
        items,
      });
    },
    onSuccess(data) {
      setLastCreatedOrder({
        orderId: data.order.id,
        reference: data.order.reference,
        totalAmountCents: data.order.totalAmountCents,
        deliveryResults: data.deliveryResults.map((result) => ({
          success: result.success,
          ticketId: result.ticketId,
          ...(result.errorMessage !== undefined ? { errorMessage: result.errorMessage } : {}),
        })),
      });
      setCartLines([]);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      notify(`Ordine ${data.order.reference} inviato.`, "success");
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Invio ordine non riuscito.", "error");
    },
  });

  const filteredCategories = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    const categories = menuQuery.data?.categories ?? [];

    if (!normalizedSearch) {
      return categories;
    }

    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => item.name.toLowerCase().includes(normalizedSearch)),
      }))
      .filter((category) => category.items.length > 0 || category.name.toLowerCase().includes(normalizedSearch));
  }, [deferredSearch, menuQuery.data?.categories]);

  useEffect(() => {
    if (filteredCategories.length === 0) {
      setActiveCategoryId(null);
      return;
    }

    if (activeCategoryId === null || !filteredCategories.some((category) => category.id === activeCategoryId)) {
      setActiveCategoryId(filteredCategories[0]?.id ?? null);
    }
  }, [activeCategoryId, filteredCategories]);

  const activeCategory = filteredCategories.find((category) => category.id === activeCategoryId) ?? filteredCategories[0] ?? null;
  const estimatedCartTotalCents = cartLines.reduce((total, line) => total + line.quantity * line.estimatedUnitPriceCents, 0);

  function addConfiguredItem(item: MenuItem, selectedOptionIdsByGroupId: Record<number, number[]>) {
    const selections = buildSelections(item, selectedOptionIdsByGroupId);
    const nextLine: CartLine = {
      key: getCartKey(item.id, selections),
      menuItemId: item.id,
      displayName: item.name,
      quantity: 1,
      estimatedUnitPriceCents: estimateMenuItemUnitPriceCents(item, selectedOptionIdsByGroupId),
      kitchenAreaName: activeCategory?.kitchenArea?.name ?? null,
      selections,
    };

    setCartLines((currentValue) => {
      const existingLine = currentValue.find((line) => line.key === nextLine.key);

      if (!existingLine) {
        return [...currentValue, nextLine];
      }

      return currentValue.map((line) => (
        line.key === nextLine.key
          ? {
              ...line,
              quantity: line.quantity + 1,
            }
          : line
      ));
    });

    setLastCreatedOrder(null);
    notify(`${item.name} aggiunto al carrello.`, "success");
    setComposerItem(null);
  }

  function addItem(item: MenuItem) {
    if (item.itemType === "composable") {
      setComposerItem(item);
      return;
    }

    addConfiguredItem(item, {});
  }

  function updateLineQuantity(lineKey: string, delta: number) {
    setCartLines((currentValue) => currentValue
      .map((line) => (line.key === lineKey ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line))
      .filter((line) => line.quantity > 0));
  }

  function removeLine(lineKey: string) {
    setCartLines((currentValue) => currentValue.filter((line) => line.key !== lineKey));
  }

  function submitOrder() {
    const parsedTableNumber = Number.parseInt(tableNumber, 10);

    if (!Number.isInteger(parsedTableNumber) || parsedTableNumber < 1 || parsedTableNumber > 999) {
      notify("Inserisci un numero tavolo valido tra 1 e 999.", "warning");
      return;
    }

    if (cartLines.length === 0) {
      notify("Aggiungi almeno una voce al carrello.", "warning");
      return;
    }

    createOrderMutation.mutate(cartLines.map((line) => ({
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      selections: line.selections.map((selection) => ({
        optionGroupId: selection.optionGroupId,
        optionId: selection.optionId,
      })),
    })));
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Cassa"
        title="Nuovo ordine"
        description="Seleziona il catalogo attivo, componi le voci e invia l'ordine alla cucina. Il backend resta l'autorita su prezzi finali e ticket generati."
      />
      {menuQuery.isLoading ? <LoadingCard message="Caricamento catalogo dal backend..." /> : null}
      {menuQuery.isError ? (
        <ErrorState
          description={menuQuery.error instanceof ApiError ? menuQuery.error.message : "Impossibile caricare il catalogo."}
          onRetry={() => void menuQuery.refetch()}
        />
      ) : null}
      {!menuQuery.isLoading && !menuQuery.isError && filteredCategories.length === 0 ? (
        <EmptyState
          title="Nessuna voce disponibile"
          description="Il catalogo attivo e vuoto. Controlla la configurazione di categorie, voci e aree cucina." 
        />
      ) : null}
      {!menuQuery.isLoading && !menuQuery.isError && filteredCategories.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: {
              xs: "1fr",
              lg: "260px minmax(0, 1fr) 360px",
            },
          }}
        >
          <Stack spacing={3}>
            <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    label="Cerca voce"
                    placeholder="Panino, birra, patatine..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Typography variant="h3">Categorie</Typography>
                  <List disablePadding>
                    {filteredCategories.map((category) => (
                      <ListItem key={category.id} disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                          selected={category.id === activeCategory?.id}
                          onClick={() => setActiveCategoryId(category.id)}
                          sx={{ borderRadius: 3 }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <CategoryIcon color={category.id === activeCategory?.id ? "primary" : "inherit"} />
                          </ListItemIcon>
                          <ListItemText
                            primary={category.name}
                            secondary={`${category.items.length} voci`}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
          <Stack spacing={3}>
            {activeCategory ? (
              <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="h3">{activeCategory.name}</Typography>
                    <Typography color="text.secondary">
                      Area cucina {activeCategory.kitchenArea?.name ?? "non assegnata"}. {activeCategory.items.length} voci attive per questa categoria.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            ) : null}
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                },
              }}
            >
              {activeCategory?.items.map((item) => (
                <Card key={item.id} elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h3">{item.name}</Typography>
                          <Typography color="text.secondary">
                            {item.itemType === "composable" ? "Voce componibile" : "Voce fissa"}
                          </Typography>
                        </Box>
                        <Chip label={formatCurrency(item.basePriceCents)} color="secondary" />
                      </Stack>
                      {item.itemType === "composable" ? (
                        <Typography variant="body2" color="text.secondary">
                          {item.optionGroups.length} gruppi opzione disponibili.
                        </Typography>
                      ) : null}
                      <Button variant="contained" startIcon={<AddShoppingCartIcon />} onClick={() => addItem(item)}>
                        Aggiungi
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Stack>
          <Stack spacing={3}>
            <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)", position: { lg: "sticky" }, top: { lg: 112 } }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LocalDiningIcon color="primary" />
                    <Typography variant="h3">Carrello</Typography>
                  </Stack>
                  <TextField
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value)}
                    type="number"
                    label="Numero tavolo"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <TableRestaurantIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {cartLines.length === 0 ? (
                    <EmptyState
                      title="Carrello vuoto"
                      description="Seleziona una voce dal catalogo per iniziare l'ordine."
                    />
                  ) : (
                    <Stack spacing={2}>
                      {cartLines.map((line) => (
                        <Card key={line.key} elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.1)" }}>
                          <CardContent sx={{ p: 2.5 }}>
                            <Stack spacing={1.5}>
                              <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                  <Typography fontWeight={700}>{line.displayName}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {line.kitchenAreaName ? `Area ${line.kitchenAreaName}` : "Area cucina da categoria"}
                                  </Typography>
                                </Box>
                                <IconButton onClick={() => removeLine(line.key)} size="small">
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                              {line.selections.length > 0 ? (
                                <Stack direction="row" gap={1} flexWrap="wrap">
                                  {line.selections.map((selection) => (
                                    <Chip
                                      key={`${selection.optionGroupId}:${selection.optionId}`}
                                      label={`${selection.optionGroupName}: ${selection.optionName}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  ))}
                                </Stack>
                              ) : null}
                              <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <IconButton size="small" onClick={() => updateLineQuantity(line.key, -1)}>
                                    <RemoveCircleOutlineIcon fontSize="small" />
                                  </IconButton>
                                  <Chip label={`x${line.quantity}`} />
                                  <IconButton size="small" onClick={() => updateLineQuantity(line.key, 1)}>
                                    <AddShoppingCartIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                                <Typography fontWeight={700}>
                                  {formatCurrency(line.quantity * line.estimatedUnitPriceCents)}
                                </Typography>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      Totale stimato del carrello
                    </Typography>
                    <Typography variant="h2">{formatCurrency(estimatedCartTotalCents)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Il totale definitivo viene ricalcolato dal backend al momento dell'invio.
                    </Typography>
                  </Stack>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={submitOrder}
                    disabled={createOrderMutation.isPending || cartLines.length === 0}
                  >
                    Invia ordine in cucina
                  </Button>
                  {createOrderMutation.isError ? (
                    <Alert severity="error">
                      {createOrderMutation.error instanceof ApiError ? createOrderMutation.error.message : "Invio ordine non riuscito."}
                    </Alert>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
            {lastCreatedOrder ? (
              <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Typography variant="h3">Ordine inviato</Typography>
                    <Typography color="text.secondary">
                      Riferimento ordine {lastCreatedOrder.reference}. Totale confermato {formatCurrency(lastCreatedOrder.totalAmountCents)}.
                    </Typography>
                    <Stack spacing={1}>
                      {lastCreatedOrder.deliveryResults.map((result) => (
                        <Alert key={result.ticketId} severity={result.success ? "success" : "warning"}>
                          Ticket {result.ticketId}: {result.success ? "consegnato o marcato stampato" : result.errorMessage ?? "consegna non riuscita"}
                        </Alert>
                      ))}
                    </Stack>
                    <Button component={RouterLink} to={`/ordini/${lastCreatedOrder.orderId}`} variant="outlined">
                      Apri dettaglio ordine
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ) : null}
          </Stack>
        </Box>
      ) : null}
      <SelectionComposerDialog
        item={composerItem}
        open={composerItem !== null}
        onClose={() => setComposerItem(null)}
        onConfirm={addConfiguredItem}
      />
    </Stack>
  );
}