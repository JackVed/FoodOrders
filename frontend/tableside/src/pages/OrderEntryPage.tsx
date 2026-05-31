import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
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
  IconButton,
  InputAdornment,
  ListItemButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { z } from "zod";

import { ApiError } from "../api/client";
import { menuApi, ordersApi, type CreateOrderItemInput } from "../api/services";
import { EmptyState, ErrorState, LoadingCard } from "../components/Feedback";
import { PageHeader } from "../components/PageHeader";
import { formatCurrency } from "../lib/format";
import { estimateMenuItemUnitPriceCents } from "../lib/pricing";
import { useNotifications } from "../notifications";
import type { MenuCategory, MenuItem, MenuOptionGroup } from "../types";

const tableNumberSchema = z.coerce.number().int().positive().max(999);

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
  categoryName: string;
  quantity: number;
  estimatedUnitPriceCents: number;
  selections: CartSelection[];
}

interface ComposerState {
  item: MenuItem;
  categoryName: string;
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
  composer,
  open,
  onClose,
  onConfirm,
}: {
  composer: ComposerState | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (composer: ComposerState, selectedOptionIdsByGroupId: Record<number, number[]>) => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [selectedOptionIdsByGroupId, setSelectedOptionIdsByGroupId] = useState<Record<number, number[]>>({});
  const [invalidGroupIds, setInvalidGroupIds] = useState<number[]>([]);

  useEffect(() => {
    setSelectedOptionIdsByGroupId({});
    setInvalidGroupIds([]);
  }, [composer?.item.id, open]);

  if (!composer) {
    return null;
  }

  const currentComposer = composer;

  const estimatedUnitPriceCents = estimateMenuItemUnitPriceCents(currentComposer.item, selectedOptionIdsByGroupId);

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
    const validation = validateSelections(currentComposer.item, selectedOptionIdsByGroupId);

    if (!validation.valid) {
      setInvalidGroupIds(validation.invalidGroupIds);
      return;
    }

    onConfirm(currentComposer, selectedOptionIdsByGroupId);
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="sm">
      <DialogTitle>{currentComposer.item.name}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Alert severity="info">
            Categoria {currentComposer.categoryName}. Prezzo base {formatCurrency(currentComposer.item.basePriceCents)}. Totale stimato attuale {formatCurrency(estimatedUnitPriceCents)}.
          </Alert>
          {currentComposer.item.optionGroups.map((group) => {
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
                          sx={{
                            borderRadius: 3,
                            border: selected ? "1px solid rgba(18, 102, 79, 0.3)" : "1px solid rgba(18, 102, 79, 0.08)",
                            mb: 1,
                          }}
                        >
                          <Stack spacing={0.25}>
                            <Typography fontWeight={700}>{option.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {option.defaultDeltaCents === 0 ? "Nessun sovrapprezzo base" : `Delta base ${formatCurrency(option.defaultDeltaCents)}`}
                            </Typography>
                          </Stack>
                          <Box sx={{ ml: "auto" }}>
                            <Chip size="small" color={selected ? "primary" : "default"} label={selected ? "OK" : "+"} />
                          </Box>
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

function CartDialog({
  open,
  cartLines,
  tableNumber,
  tableNumberError,
  onTableNumberChange,
  onClose,
  onDecrease,
  onIncrease,
  onRemove,
  onSubmit,
  isSubmitting,
  totalAmountCents,
}: {
  open: boolean;
  cartLines: CartLine[];
  tableNumber: string;
  tableNumberError: string | null;
  onTableNumberChange: (value: string) => void;
  onClose: () => void;
  onDecrease: (key: string) => void;
  onIncrease: (key: string) => void;
  onRemove: (key: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  totalAmountCents: number;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="sm">
      <DialogTitle>Carrello ordine</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <TextField
            label="Tavolo"
            value={tableNumber}
            onChange={(event) => onTableNumberChange(event.target.value)}
            error={Boolean(tableNumberError)}
            helperText={tableNumberError}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <TableRestaurantIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {cartLines.length === 0 ? (
            <EmptyState title="Carrello vuoto" description="Aggiungi qualche voce dal menu per poter inviare l'ordine." />
          ) : (
            <Stack spacing={1.5}>
              {cartLines.map((line) => (
                <Card key={line.key} elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography fontWeight={700}>{line.displayName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {line.categoryName} · {formatCurrency(line.estimatedUnitPriceCents)} cad.
                          </Typography>
                        </Box>
                        <IconButton onClick={() => onRemove(line.key)} size="small">
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      {line.selections.length > 0 ? (
                        <Stack direction="row" gap={1} flexWrap="wrap">
                          {line.selections.map((selection) => (
                            <Chip
                              key={`${selection.optionGroupId}:${selection.optionId}`}
                              size="small"
                              variant="outlined"
                              label={`${selection.optionGroupName}: ${selection.optionName}`}
                            />
                          ))}
                        </Stack>
                      ) : null}
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconButton onClick={() => onDecrease(line.key)} size="small">
                            <RemoveCircleOutlineIcon />
                          </IconButton>
                          <Chip label={`Quantita ${line.quantity}`} />
                          <Button size="small" onClick={() => onIncrease(line.key)}>+1</Button>
                        </Stack>
                        <Typography fontWeight={700}>{formatCurrency(line.quantity * line.estimatedUnitPriceCents)}</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Chiudi</Button>
        <Button variant="contained" onClick={onSubmit} disabled={cartLines.length === 0 || isSubmitting}>
          {isSubmitting ? "Invio..." : `Invia ${formatCurrency(totalAmountCents)}`}
        </Button>
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
  const [tableNumberError, setTableNumberError] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState(() => {
    if (typeof window === "undefined") {
      return "1";
    }

    return window.localStorage.getItem("foodorders.tableside.tableNumber") ?? "1";
  });
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [cartDialogOpen, setCartDialogOpen] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<{
    orderId: number;
    reference: number;
    totalAmountCents: number;
    deliveryResults: Array<{ success: boolean; ticketId: number; errorMessage?: string | null }>;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("foodorders.tableside.tableNumber", tableNumber);
    }
  }, [tableNumber]);

  const menuQuery = useQuery({
    queryKey: ["menu"],
    queryFn: () => menuApi.getMenu(),
  });

  const createOrderMutation = useMutation({
    mutationFn: ({ parsedTableNumber, items }: { parsedTableNumber: number; items: CreateOrderItemInput[] }) => ordersApi.create({
      sourceApp: "Tableside",
      tableNumber: parsedTableNumber,
      items,
    }),
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
      setCartDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      notify(`Ordine ${data.order.reference} inviato.`, "success");
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Invio ordine non riuscito.", "error");
    },
  });

  const categories = menuQuery.data?.categories ?? [];
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredCategories = normalizedSearch
    ? categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => item.name.toLowerCase().includes(normalizedSearch)),
      }))
      .filter((category) => category.items.length > 0 || category.name.toLowerCase().includes(normalizedSearch))
    : categories;

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
  const cartItemCount = cartLines.reduce((total, line) => total + line.quantity, 0);
  const estimatedCartTotalCents = cartLines.reduce((total, line) => total + line.quantity * line.estimatedUnitPriceCents, 0);

  function handleTableNumberChange(value: string) {
    setTableNumberError(null);
    setTableNumber(value.replace(/\D/g, "").slice(0, 3));
  }

  function upsertCartLine(nextLine: CartLine) {
    setCartLines((currentLines) => {
      const existingLine = currentLines.find((line) => line.key === nextLine.key);

      if (!existingLine) {
        return [...currentLines, nextLine];
      }

      return currentLines.map((line) => line.key === nextLine.key
        ? { ...line, quantity: line.quantity + nextLine.quantity }
        : line);
    });
  }

  function addConfiguredItem(composerState: ComposerState, selectedOptionIdsByGroupId: Record<number, number[]>) {
    const selections = buildSelections(composerState.item, selectedOptionIdsByGroupId);
    const nextLine: CartLine = {
      key: getCartKey(composerState.item.id, selections),
      menuItemId: composerState.item.id,
      displayName: composerState.item.name,
      categoryName: composerState.categoryName,
      quantity: 1,
      estimatedUnitPriceCents: estimateMenuItemUnitPriceCents(composerState.item, selectedOptionIdsByGroupId),
      selections,
    };

    upsertCartLine(nextLine);
    setComposer(null);
    notify(`${composerState.item.name} aggiunto al carrello.`, "success");
  }

  function handleAddFromCatalog(item: MenuItem, category: MenuCategory) {
    if (item.itemType === "composable" || item.optionGroups.length > 0) {
      setComposer({ item, categoryName: category.name });
      return;
    }

    addConfiguredItem({ item, categoryName: category.name }, {});
  }

  function updateQuantity(key: string, delta: number) {
    setCartLines((currentLines) => currentLines.flatMap((line) => {
      if (line.key !== key) {
        return [line];
      }

      const nextQuantity = line.quantity + delta;
      return nextQuantity <= 0 ? [] : [{ ...line, quantity: nextQuantity }];
    }));
  }

  function removeLine(key: string) {
    setCartLines((currentLines) => currentLines.filter((line) => line.key !== key));
  }

  function handleSubmitOrder() {
    if (cartLines.length === 0) {
      notify("Aggiungi almeno una voce al carrello.", "warning");
      return;
    }

    const parsedTableNumber = tableNumberSchema.safeParse(tableNumber);

    if (!parsedTableNumber.success) {
      const message = "Inserisci un numero di tavolo valido tra 1 e 999.";

      setTableNumberError(message);
      notify(message, "warning");
      return;
    }

    setTableNumberError(null);

    const items: CreateOrderItemInput[] = cartLines.map((line) => ({
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      selections: line.selections.map((selection) => ({
        optionGroupId: selection.optionGroupId,
        optionId: selection.optionId,
      })),
    }));

    createOrderMutation.mutate({ parsedTableNumber: parsedTableNumber.data, items });
  }

  const failedDeliveries = lastCreatedOrder?.deliveryResults.filter((result) => !result.success) ?? [];

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Operativo"
        title="Nuovo ordine"
        description="Menu mobile-first per comporre rapidamente l'ordine al tavolo e inviarlo subito in cucina."
        actions={(
          <Button variant="outlined" onClick={() => void menuQuery.refetch()}>
            Aggiorna menu
          </Button>
        )}
      />

      {lastCreatedOrder ? (
        <Alert
          severity={failedDeliveries.length > 0 ? "warning" : "success"}
          action={(
            <Button component={RouterLink} to={`/ordini/${lastCreatedOrder.orderId}`} color="inherit" size="small">
              Apri ordine
            </Button>
          )}
        >
          Ordine #{lastCreatedOrder.reference} inviato per {formatCurrency(lastCreatedOrder.totalAmountCents)}.
          {failedDeliveries.length > 0 ? ` ${failedDeliveries.length} ticket hanno riportato un errore di consegna.` : " Tutti i ticket risultano consegnati con successo o gia stampati."}
        </Alert>
      ) : null}

      <Box sx={{ position: "sticky", top: { xs: 90, sm: 98 }, zIndex: 2 }}>
        <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)", boxShadow: "0 12px 28px rgba(18, 102, 79, 0.08)" }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">Carrello corrente</Typography>
                  <Typography variant="h3">{cartItemCount} pezzi · {formatCurrency(estimatedCartTotalCents)}</Typography>
                </Box>
                <Chip icon={<ShoppingBagOutlinedIcon />} label={`${cartLines.length} righe`} />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  label="Tavolo"
                  value={tableNumber}
                  onChange={(event) => handleTableNumberChange(event.target.value)}
                  error={Boolean(tableNumberError)}
                  helperText={tableNumberError}
                  sx={{ flex: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TableRestaurantIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button variant="outlined" onClick={() => setCartDialogOpen(true)} disabled={cartLines.length === 0}>
                  Apri carrello
                </Button>
                <Button variant="contained" startIcon={<AddShoppingCartIcon />} onClick={handleSubmitOrder} disabled={cartLines.length === 0 || createOrderMutation.isPending}>
                  {createOrderMutation.isPending ? "Invio..." : "Invia ordine"}
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {cartLines.length > 0
                  ? cartLines.slice(0, 2).map((line) => `${line.quantity}x ${line.displayName}`).join(" · ")
                  : "Nessuna voce selezionata. Tocca un articolo del menu per iniziare."}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Cerca piatti, bevande o categorie"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {menuQuery.isLoading ? <LoadingCard message="Caricamento menu..." /> : null}
      {menuQuery.isError ? (
        <ErrorState
          description={menuQuery.error instanceof ApiError ? menuQuery.error.message : "Impossibile caricare il menu."}
          onRetry={() => void menuQuery.refetch()}
        />
      ) : null}
      {!menuQuery.isLoading && !menuQuery.isError && filteredCategories.length === 0 ? (
        <EmptyState
          title="Nessun risultato"
          description="Non ci sono categorie o articoli che corrispondono alla ricerca attuale."
        />
      ) : null}
      {!menuQuery.isLoading && !menuQuery.isError && filteredCategories.length > 0 ? (
        <>
          <Box sx={{ overflowX: "auto", mx: -0.5, px: 0.5, pb: 0.5 }}>
            <Stack direction="row" spacing={1} sx={{ width: "max-content" }}>
              {filteredCategories.map((category) => (
                <Chip
                  key={category.id}
                  clickable
                  color={category.id === activeCategory?.id ? "primary" : "default"}
                  variant={category.id === activeCategory?.id ? "filled" : "outlined"}
                  label={`${category.name} (${category.items.length})`}
                  onClick={() => setActiveCategoryId(category.id)}
                />
              ))}
            </Stack>
          </Box>

          {activeCategory ? (
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="h3">{activeCategory.name}</Typography>
                <Typography color="text.secondary">
                  {activeCategory.kitchenArea ? `Area ${activeCategory.kitchenArea.name}` : "Categoria senza area cucina associata"}
                </Typography>
              </Stack>
              {activeCategory.items.map((item) => (
                <Card key={item.id} elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h3">{item.name}</Typography>
                          <Typography color="text.secondary">
                            {item.itemType === "composable"
                              ? "Articolo configurabile prima dell'invio al carrello."
                              : "Articolo a prezzo fisso, aggiungibile subito al carrello."}
                          </Typography>
                        </Box>
                        <Typography fontWeight={700}>{formatCurrency(item.basePriceCents)}</Typography>
                      </Stack>
                      <Stack direction="row" gap={1} flexWrap="wrap">
                        <Chip label={item.itemType === "composable" ? "Configurabile" : "Prezzo fisso"} size="small" />
                        {item.optionGroups.length > 0 ? <Chip label={`${item.optionGroups.length} gruppi opzioni`} size="small" variant="outlined" /> : null}
                      </Stack>
                      <Button variant="contained" startIcon={<AddShoppingCartIcon />} onClick={() => handleAddFromCatalog(item, activeCategory)}>
                        {item.itemType === "composable" || item.optionGroups.length > 0 ? "Configura e aggiungi" : "Aggiungi al carrello"}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : null}
        </>
      ) : null}

      <SelectionComposerDialog
        composer={composer}
        open={composer !== null}
        onClose={() => setComposer(null)}
        onConfirm={addConfiguredItem}
      />
      <CartDialog
        open={cartDialogOpen}
        cartLines={cartLines}
        tableNumber={tableNumber}
        tableNumberError={tableNumberError}
        onTableNumberChange={handleTableNumberChange}
        onClose={() => setCartDialogOpen(false)}
        onDecrease={(key) => updateQuantity(key, -1)}
        onIncrease={(key) => updateQuantity(key, 1)}
        onRemove={removeLine}
        onSubmit={handleSubmitOrder}
        isSubmitting={createOrderMutation.isPending}
        totalAmountCents={estimatedCartTotalCents}
      />
    </Stack>
  );
}