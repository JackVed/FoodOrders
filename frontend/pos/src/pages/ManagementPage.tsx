import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
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
  MenuItem as SelectOption,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "../api/client";
import {
  managementApi,
  type CreateCategoryInput,
  type CreateKitchenAreaInput,
  type CreateMenuItemInput,
  type CreateOptionGroupInput,
  type CreateOptionInput,
  type CreatePrinterInput,
} from "../api/services";
import { ControlledSelectField, ControlledSwitchField, ControlledTextField } from "../components/FormFields";
import { ErrorState, LoadingCard } from "../components/Feedback";
import { PageHeader } from "../components/PageHeader";
import { formatCurrency, formatTransportTypeLabel } from "../lib/format";
import { useNotifications } from "../notifications";
import type {
  KitchenAreaRecord,
  ManagementConfiguration,
  MenuCategoryRecord,
  MenuItemRecord,
  OptionGroupRecord,
  OptionRecord,
  PrinterRecord,
  PricingStrategy,
} from "../types";

const kitchenAreaSchema = z.object({
  name: z.string().trim().min(1, "Inserisci il nome dell'area."),
  sortOrder: z.coerce.number().int().min(0, "Il sort order deve essere positivo o zero."),
  isActive: z.boolean(),
});

const printerSchema = z.object({
  kitchenAreaId: z.coerce.number().int().positive("Seleziona un'area cucina."),
  name: z.string().trim().min(1, "Inserisci il nome della stampante."),
  transportType: z.enum(["mock", "network", "system"]),
  connectionConfigText: z.string().superRefine((value, context) => {
    try {
      const parsedValue = JSON.parse(value || "{}");

      if (typeof parsedValue !== "object" || parsedValue === null || Array.isArray(parsedValue)) {
        context.addIssue({ code: "custom", message: "Inserisci un oggetto JSON valido." });
      }
    } catch {
      context.addIssue({ code: "custom", message: "JSON non valido." });
    }
  }),
  isEnabled: z.boolean(),
});

const categorySchema = z.object({
  kitchenAreaId: z.coerce.number().int().positive("Seleziona un'area cucina."),
  name: z.string().trim().min(1, "Inserisci il nome della categoria."),
  sortOrder: z.coerce.number().int().min(0, "Il sort order deve essere positivo o zero."),
  isActive: z.boolean(),
});

const menuItemSchema = z.object({
  categoryId: z.coerce.number().int().positive("Seleziona una categoria."),
  kitchenAreaId: z.string(),
  name: z.string().trim().min(1, "Inserisci il nome della voce."),
  itemType: z.enum(["fixed", "composable"]),
  basePriceCents: z.coerce.number().int().min(0, "Il prezzo deve essere positivo o zero."),
  sortOrder: z.coerce.number().int().min(0, "Il sort order deve essere positivo o zero."),
  isActive: z.boolean(),
});

const optionGroupSchema = z.object({
  menuItemId: z.coerce.number().int().positive("Seleziona una voce menu componibile."),
  name: z.string().trim().min(1, "Inserisci il nome del gruppo opzione."),
  code: z.string().trim().min(1, "Inserisci il codice.").regex(/^[a-z0-9-]+$/, "Usa solo lettere minuscole, numeri e trattini."),
  minSelect: z.coerce.number().int().min(0, "Il minimo deve essere positivo o zero."),
  maxSelect: z.coerce.number().int().positive("Il massimo deve essere maggiore di zero."),
  pricingStrategy: z.enum(["sum_options", "any_selected", "first_and_additional", "per_selected"]),
  firstSelectedDeltaCents: z.coerce.number().int().min(0).default(0),
  additionalSelectedDeltaCents: z.coerce.number().int().min(0).default(0),
  anySelectedDeltaCents: z.coerce.number().int().min(0).default(0),
  perSelectedDeltaCents: z.coerce.number().int().min(0).default(0),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
}).superRefine((value, context) => {
  if (value.maxSelect < value.minSelect) {
    context.addIssue({
      code: "custom",
      path: ["maxSelect"],
      message: "maxSelect deve essere maggiore o uguale a minSelect.",
    });
  }
});

const optionSchema = z.object({
  optionGroupId: z.coerce.number().int().positive("Seleziona un gruppo opzione."),
  name: z.string().trim().min(1, "Inserisci il nome dell'opzione."),
  code: z.string().trim().min(1, "Inserisci il codice.").regex(/^[a-z0-9-]+$/, "Usa solo lettere minuscole, numeri e trattini."),
  defaultDeltaCents: z.coerce.number().int().min(0, "Il delta deve essere positivo o zero."),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

function parseJsonObject(value: string) {
  const parsedValue = JSON.parse(value || "{}");
  return parsedValue as Record<string, unknown>;
}

function EntityStatusChip({ active }: { active: boolean }) {
  return <Chip label={active ? "Attivo" : "Disattivato"} color={active ? "success" : "default"} size="small" />;
}

function MutationErrorAlert({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }

  return <Alert severity="error">{error instanceof ApiError ? error.message : "Operazione non riuscita."}</Alert>;
}

function KitchenAreaDialog({
  open,
  entity,
  onClose,
}: {
  open: boolean;
  entity: KitchenAreaRecord | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const form = useForm<z.infer<typeof kitchenAreaSchema>>({
    resolver: zodResolver(kitchenAreaSchema),
    defaultValues: {
      name: entity?.name ?? "",
      sortOrder: entity?.sortOrder ?? 0,
      isActive: entity?.isActive ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      name: entity?.name ?? "",
      sortOrder: entity?.sortOrder ?? 0,
      isActive: entity?.isActive ?? true,
    });
  }, [entity, form, open]);

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof kitchenAreaSchema>) => {
      const payload: CreateKitchenAreaInput = values;
      return entity
        ? managementApi.updateKitchenArea(entity.id, payload)
        : managementApi.createKitchenArea(payload);
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["managementConfiguration"] });
      void queryClient.invalidateQueries({ queryKey: ["menu"] });
      notify(entity ? "Area cucina aggiornata." : "Area cucina creata.", "success");
      onClose();
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Salvataggio area cucina non riuscito.", "error");
    },
  });

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{entity ? "Modifica area cucina" : "Nuova area cucina"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <MutationErrorAlert error={mutation.error} />
          <ControlledTextField control={form.control} name="name" label="Nome" />
          <ControlledTextField control={form.control} name="sortOrder" label="Sort order" type="number" />
          <ControlledSwitchField control={form.control} name="isActive" label="Area attiva" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>Annulla</Button>
        <Button variant="contained" onClick={form.handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PrinterDialog({
  open,
  entity,
  kitchenAreas,
  onClose,
}: {
  open: boolean;
  entity: PrinterRecord | null;
  kitchenAreas: KitchenAreaRecord[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const form = useForm<z.infer<typeof printerSchema>>({
    resolver: zodResolver(printerSchema),
    defaultValues: {
      kitchenAreaId: entity?.kitchenAreaId ?? kitchenAreas[0]?.id ?? 0,
      name: entity?.name ?? "",
      transportType: entity?.transportType ?? "mock",
      connectionConfigText: JSON.stringify(entity?.connectionConfigJson ?? {}, null, 2),
      isEnabled: entity?.isEnabled ?? true,
    },
  });
  const selectedTransportType = form.watch("transportType");

  useEffect(() => {
    form.reset({
      kitchenAreaId: entity?.kitchenAreaId ?? kitchenAreas[0]?.id ?? 0,
      name: entity?.name ?? "",
      transportType: entity?.transportType ?? "mock",
      connectionConfigText: JSON.stringify(entity?.connectionConfigJson ?? {}, null, 2),
      isEnabled: entity?.isEnabled ?? true,
    });
  }, [entity, form, kitchenAreas, open]);

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof printerSchema>) => {
      const payload: CreatePrinterInput = {
        kitchenAreaId: values.kitchenAreaId,
        name: values.name,
        transportType: values.transportType,
        connectionConfigJson: parseJsonObject(values.connectionConfigText),
        isEnabled: values.isEnabled,
      };

      return entity
        ? managementApi.updatePrinter(entity.id, payload)
        : managementApi.createPrinter(payload);
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["managementConfiguration"] });
      notify(entity ? "Stampante aggiornata." : "Stampante creata.", "success");
      onClose();
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Salvataggio stampante non riuscito.", "error");
    },
  });

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{entity ? "Modifica stampante" : "Nuova stampante"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <MutationErrorAlert error={mutation.error} />
          <ControlledSelectField
            control={form.control}
            name="kitchenAreaId"
            label="Area cucina"
            options={kitchenAreas.map((area) => ({ value: area.id, label: area.name }))}
          />
          <ControlledTextField control={form.control} name="name" label="Nome" />
          <ControlledSelectField
            control={form.control}
            name="transportType"
            label="Trasporto"
            options={[
              { value: "mock", label: "Mock" },
              { value: "network", label: "Rete (non implementato)" },
              { value: "system", label: "Sistema (non implementato)" },
            ]}
          />
          {selectedTransportType !== "mock" ? (
            <Alert severity="warning">
              I trasporti Rete e Sistema sono ancora placeholder: il backend registrera un tentativo fallito finche non verra implementata l'integrazione reale.
            </Alert>
          ) : null}
          <ControlledTextField
            control={form.control}
            name="connectionConfigText"
            label="Configurazione JSON"
            multiline
            rows={6}
            helperText={selectedTransportType === "mock"
              ? 'Esempio: {} oppure {"forceFailure": true} per la mock printer.'
              : 'Mantieni solo la configurazione che vorrai usare quando il trasporto reale sara implementato.'}
          />
          <ControlledSwitchField control={form.control} name="isEnabled" label="Stampante abilitata" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>Annulla</Button>
        <Button variant="contained" onClick={form.handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CategoryDialog({
  open,
  entity,
  kitchenAreas,
  onClose,
}: {
  open: boolean;
  entity: MenuCategoryRecord | null;
  kitchenAreas: KitchenAreaRecord[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      kitchenAreaId: entity?.kitchenAreaId ?? kitchenAreas[0]?.id ?? 0,
      name: entity?.name ?? "",
      sortOrder: entity?.sortOrder ?? 0,
      isActive: entity?.isActive ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      kitchenAreaId: entity?.kitchenAreaId ?? kitchenAreas[0]?.id ?? 0,
      name: entity?.name ?? "",
      sortOrder: entity?.sortOrder ?? 0,
      isActive: entity?.isActive ?? true,
    });
  }, [entity, form, kitchenAreas, open]);

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof categorySchema>) => {
      const payload: CreateCategoryInput = values;
      return entity
        ? managementApi.updateCategory(entity.id, payload)
        : managementApi.createCategory(payload);
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["managementConfiguration"] });
      void queryClient.invalidateQueries({ queryKey: ["menu"] });
      notify(entity ? "Categoria aggiornata." : "Categoria creata.", "success");
      onClose();
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Salvataggio categoria non riuscito.", "error");
    },
  });

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{entity ? "Modifica categoria" : "Nuova categoria"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <MutationErrorAlert error={mutation.error} />
          <ControlledSelectField
            control={form.control}
            name="kitchenAreaId"
            label="Area cucina"
            options={kitchenAreas.map((area) => ({ value: area.id, label: area.name }))}
          />
          <ControlledTextField control={form.control} name="name" label="Nome" />
          <ControlledTextField control={form.control} name="sortOrder" label="Sort order" type="number" />
          <ControlledSwitchField control={form.control} name="isActive" label="Categoria attiva" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>Annulla</Button>
        <Button variant="contained" onClick={form.handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function MenuItemDialog({
  open,
  entity,
  kitchenAreas,
  categories,
  onClose,
}: {
  open: boolean;
  entity: MenuItemRecord | null;
  kitchenAreas: KitchenAreaRecord[];
  categories: MenuCategoryRecord[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const form = useForm<z.infer<typeof menuItemSchema>>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      categoryId: entity?.categoryId ?? categories[0]?.id ?? 0,
      kitchenAreaId: entity?.kitchenAreaId !== null && entity?.kitchenAreaId !== undefined ? String(entity.kitchenAreaId) : "",
      name: entity?.name ?? "",
      itemType: entity?.itemType ?? "fixed",
      basePriceCents: entity?.basePriceCents ?? 0,
      sortOrder: entity?.sortOrder ?? 0,
      isActive: entity?.isActive ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      categoryId: entity?.categoryId ?? categories[0]?.id ?? 0,
      kitchenAreaId: entity?.kitchenAreaId !== null && entity?.kitchenAreaId !== undefined ? String(entity.kitchenAreaId) : "",
      name: entity?.name ?? "",
      itemType: entity?.itemType ?? "fixed",
      basePriceCents: entity?.basePriceCents ?? 0,
      sortOrder: entity?.sortOrder ?? 0,
      isActive: entity?.isActive ?? true,
    });
  }, [categories, entity, form, open]);

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof menuItemSchema>) => {
      const payload: CreateMenuItemInput = {
        categoryId: values.categoryId,
        kitchenAreaId: values.kitchenAreaId ? Number.parseInt(values.kitchenAreaId, 10) : null,
        name: values.name,
        itemType: values.itemType,
        basePriceCents: values.basePriceCents,
        sortOrder: values.sortOrder,
        isActive: values.isActive,
      };

      return entity
        ? managementApi.updateMenuItem(entity.id, payload)
        : managementApi.createMenuItem(payload);
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["managementConfiguration"] });
      void queryClient.invalidateQueries({ queryKey: ["menu"] });
      notify(entity ? "Voce menu aggiornata." : "Voce menu creata.", "success");
      onClose();
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Salvataggio voce menu non riuscito.", "error");
    },
  });

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{entity ? "Modifica voce menu" : "Nuova voce menu"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <MutationErrorAlert error={mutation.error} />
          <ControlledSelectField
            control={form.control}
            name="categoryId"
            label="Categoria"
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
          />
          <ControlledSelectField
            control={form.control}
            name="kitchenAreaId"
            label="Area cucina specifica"
            options={[
              { value: "", label: "Usa l'area della categoria" },
              ...kitchenAreas.map((area) => ({ value: String(area.id), label: area.name })),
            ]}
          />
          <ControlledTextField control={form.control} name="name" label="Nome" />
          <ControlledSelectField
            control={form.control}
            name="itemType"
            label="Tipo voce"
            options={[
              { value: "fixed", label: "Fissa" },
              { value: "composable", label: "Componibile" },
            ]}
          />
          <ControlledTextField control={form.control} name="basePriceCents" label="Prezzo base (centesimi)" type="number" />
          <ControlledTextField control={form.control} name="sortOrder" label="Sort order" type="number" />
          <ControlledSwitchField control={form.control} name="isActive" label="Voce attiva" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>Annulla</Button>
        <Button variant="contained" onClick={form.handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function OptionGroupDialog({
  open,
  entity,
  items,
  onClose,
}: {
  open: boolean;
  entity: OptionGroupRecord | null;
  items: MenuItemRecord[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const composableItems = items.filter((item) => item.itemType === "composable");
  const form = useForm<z.infer<typeof optionGroupSchema>>({
    resolver: zodResolver(optionGroupSchema),
    defaultValues: {
      menuItemId: entity?.menuItemId ?? composableItems[0]?.id ?? 0,
      name: entity?.name ?? "",
      code: entity?.code ?? "",
      minSelect: entity?.minSelect ?? 0,
      maxSelect: entity?.maxSelect ?? 1,
      pricingStrategy: entity?.pricingStrategy ?? "sum_options",
      firstSelectedDeltaCents: entity?.firstSelectedDeltaCents ?? 0,
      additionalSelectedDeltaCents: entity?.additionalSelectedDeltaCents ?? 0,
      anySelectedDeltaCents: entity?.anySelectedDeltaCents ?? 0,
      perSelectedDeltaCents: entity?.perSelectedDeltaCents ?? 0,
      sortOrder: entity?.sortOrder ?? 0,
      isActive: entity?.isActive ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      menuItemId: entity?.menuItemId ?? composableItems[0]?.id ?? 0,
      name: entity?.name ?? "",
      code: entity?.code ?? "",
      minSelect: entity?.minSelect ?? 0,
      maxSelect: entity?.maxSelect ?? 1,
      pricingStrategy: entity?.pricingStrategy ?? "sum_options",
      firstSelectedDeltaCents: entity?.firstSelectedDeltaCents ?? 0,
      additionalSelectedDeltaCents: entity?.additionalSelectedDeltaCents ?? 0,
      anySelectedDeltaCents: entity?.anySelectedDeltaCents ?? 0,
      perSelectedDeltaCents: entity?.perSelectedDeltaCents ?? 0,
      sortOrder: entity?.sortOrder ?? 0,
      isActive: entity?.isActive ?? true,
    });
  }, [composableItems, entity, form, open]);

  const pricingStrategy = form.watch("pricingStrategy");

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof optionGroupSchema>) => {
      const payload: CreateOptionGroupInput = {
        name: values.name,
        code: values.code,
        minSelect: values.minSelect,
        maxSelect: values.maxSelect,
        pricingStrategy: values.pricingStrategy,
        sortOrder: values.sortOrder,
        isActive: values.isActive,
        ...(values.pricingStrategy === "any_selected" ? { anySelectedDeltaCents: values.anySelectedDeltaCents } : {}),
        ...(values.pricingStrategy === "first_and_additional"
          ? {
              firstSelectedDeltaCents: values.firstSelectedDeltaCents,
              additionalSelectedDeltaCents: values.additionalSelectedDeltaCents,
            }
          : {}),
        ...(values.pricingStrategy === "per_selected" ? { perSelectedDeltaCents: values.perSelectedDeltaCents } : {}),
      };

      return entity
        ? managementApi.updateOptionGroup(entity.id, payload)
        : managementApi.createOptionGroup(values.menuItemId, payload);
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["managementConfiguration"] });
      void queryClient.invalidateQueries({ queryKey: ["menu"] });
      notify(entity ? "Gruppo opzione aggiornato." : "Gruppo opzione creato.", "success");
      onClose();
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Salvataggio gruppo opzione non riuscito.", "error");
    },
  });

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{entity ? "Modifica gruppo opzione" : "Nuovo gruppo opzione"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <MutationErrorAlert error={mutation.error} />
          <ControlledSelectField
            control={form.control}
            name="menuItemId"
            label="Voce menu"
            disabled={Boolean(entity)}
            options={composableItems.map((item) => ({ value: item.id, label: item.name }))}
          />
          <ControlledTextField control={form.control} name="name" label="Nome" />
          <ControlledTextField control={form.control} name="code" label="Codice" helperText="Usa lettere minuscole, numeri e trattini." />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <ControlledTextField control={form.control} name="minSelect" label="Selezioni minime" type="number" />
            <ControlledTextField control={form.control} name="maxSelect" label="Selezioni massime" type="number" />
          </Stack>
          <ControlledSelectField
            control={form.control}
            name="pricingStrategy"
            label="Strategia prezzo"
            options={[
              { value: "sum_options", label: "Somma opzioni" },
              { value: "any_selected", label: "Prezzo una tantum se selezionato" },
              { value: "first_and_additional", label: "Prima selezione e aggiuntive" },
              { value: "per_selected", label: "Prezzo per ogni selezione" },
            ]}
          />
          {pricingStrategy === "any_selected" ? (
            <ControlledTextField control={form.control} name="anySelectedDeltaCents" label="Delta se presente una selezione" type="number" />
          ) : null}
          {pricingStrategy === "first_and_additional" ? (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <ControlledTextField control={form.control} name="firstSelectedDeltaCents" label="Delta prima selezione" type="number" />
              <ControlledTextField control={form.control} name="additionalSelectedDeltaCents" label="Delta selezioni aggiuntive" type="number" />
            </Stack>
          ) : null}
          {pricingStrategy === "per_selected" ? (
            <ControlledTextField control={form.control} name="perSelectedDeltaCents" label="Delta per selezione" type="number" />
          ) : null}
          <ControlledTextField control={form.control} name="sortOrder" label="Sort order" type="number" />
          <ControlledSwitchField control={form.control} name="isActive" label="Gruppo attivo" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>Annulla</Button>
        <Button variant="contained" onClick={form.handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function OptionDialog({
  open,
  entity,
  optionGroups,
  onClose,
}: {
  open: boolean;
  entity: OptionRecord | null;
  optionGroups: OptionGroupRecord[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const form = useForm<z.infer<typeof optionSchema>>({
    resolver: zodResolver(optionSchema),
    defaultValues: {
      optionGroupId: entity?.optionGroupId ?? optionGroups[0]?.id ?? 0,
      name: entity?.name ?? "",
      code: entity?.code ?? "",
      defaultDeltaCents: entity?.defaultDeltaCents ?? 0,
      sortOrder: entity?.sortOrder ?? 0,
      isActive: entity?.isActive ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      optionGroupId: entity?.optionGroupId ?? optionGroups[0]?.id ?? 0,
      name: entity?.name ?? "",
      code: entity?.code ?? "",
      defaultDeltaCents: entity?.defaultDeltaCents ?? 0,
      sortOrder: entity?.sortOrder ?? 0,
      isActive: entity?.isActive ?? true,
    });
  }, [entity, form, onClose, open, optionGroups]);

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof optionSchema>) => {
      const payload: CreateOptionInput = {
        name: values.name,
        code: values.code,
        defaultDeltaCents: values.defaultDeltaCents,
        sortOrder: values.sortOrder,
        isActive: values.isActive,
      };

      return entity
        ? managementApi.updateOption(entity.id, payload)
        : managementApi.createOption(values.optionGroupId, payload);
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: ["managementConfiguration"] });
      void queryClient.invalidateQueries({ queryKey: ["menu"] });
      notify(entity ? "Opzione aggiornata." : "Opzione creata.", "success");
      onClose();
    },
    onError(error) {
      notify(error instanceof ApiError ? error.message : "Salvataggio opzione non riuscito.", "error");
    },
  });

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{entity ? "Modifica opzione" : "Nuova opzione"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <MutationErrorAlert error={mutation.error} />
          <ControlledSelectField
            control={form.control}
            name="optionGroupId"
            label="Gruppo opzione"
            disabled={Boolean(entity)}
            options={optionGroups.map((group) => ({ value: group.id, label: group.name }))}
          />
          <ControlledTextField control={form.control} name="name" label="Nome" />
          <ControlledTextField control={form.control} name="code" label="Codice" helperText="Usa lettere minuscole, numeri e trattini." />
          <ControlledTextField control={form.control} name="defaultDeltaCents" label="Delta prezzo base (centesimi)" type="number" />
          <ControlledTextField control={form.control} name="sortOrder" label="Sort order" type="number" />
          <ControlledSwitchField control={form.control} name="isActive" label="Opzione attiva" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>Annulla</Button>
        <Button variant="contained" onClick={form.handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ManagementPage() {
  const [tab, setTab] = useState(0);
  const [editingKitchenArea, setEditingKitchenArea] = useState<KitchenAreaRecord | null>(null);
  const [editingPrinter, setEditingPrinter] = useState<PrinterRecord | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategoryRecord | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItemRecord | null>(null);
  const [editingOptionGroup, setEditingOptionGroup] = useState<OptionGroupRecord | null>(null);
  const [editingOption, setEditingOption] = useState<OptionRecord | null>(null);
  const [creatingKitchenArea, setCreatingKitchenArea] = useState(false);
  const [creatingPrinter, setCreatingPrinter] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [creatingOptionGroup, setCreatingOptionGroup] = useState(false);
  const [creatingOption, setCreatingOption] = useState(false);

  const configurationQuery = useQuery({
    queryKey: ["managementConfiguration"],
    queryFn: () => managementApi.getConfiguration(),
  });

  const configuration = configurationQuery.data;
  const kitchenAreaById = useMemo(() => new Map(configuration?.kitchenAreas.map((item) => [item.id, item]) ?? []), [configuration?.kitchenAreas]);
  const categoryById = useMemo(() => new Map(configuration?.categories.map((item) => [item.id, item]) ?? []), [configuration?.categories]);
  const itemById = useMemo(() => new Map(configuration?.items.map((item) => [item.id, item]) ?? []), [configuration?.items]);
  const optionGroupById = useMemo(() => new Map(configuration?.optionGroups.map((item) => [item.id, item]) ?? []), [configuration?.optionGroups]);

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Gestione"
        title="Configurazione operativa"
        description="Aree cucina, stampanti, categorie, voci menu, gruppi opzione e opzioni sono gestiti direttamente sui contratti backend esistenti."
        actions={(
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void configurationQuery.refetch()}>
            Aggiorna
          </Button>
        )}
      />
      {configurationQuery.isLoading ? <LoadingCard message="Caricamento configurazione..." /> : null}
      {configurationQuery.isError ? (
        <ErrorState
          description={configurationQuery.error instanceof ApiError ? configurationQuery.error.message : "Impossibile caricare la configurazione."}
          onRetry={() => void configurationQuery.refetch()}
        />
      ) : null}
      {configuration ? (
        <>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Card elevation={0} sx={{ flex: 1, border: "1px solid rgba(18, 102, 79, 0.14)" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Aree cucina</Typography>
                <Typography variant="h2">{configuration.kitchenAreas.length}</Typography>
              </CardContent>
            </Card>
            <Card elevation={0} sx={{ flex: 1, border: "1px solid rgba(18, 102, 79, 0.14)" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Stampanti</Typography>
                <Typography variant="h2">{configuration.printers.length}</Typography>
              </CardContent>
            </Card>
            <Card elevation={0} sx={{ flex: 1, border: "1px solid rgba(18, 102, 79, 0.14)" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Voci menu</Typography>
                <Typography variant="h2">{configuration.items.length}</Typography>
              </CardContent>
            </Card>
          </Stack>
          <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
            <Tabs value={tab} onChange={(_, nextValue) => setTab(nextValue)} variant="scrollable" scrollButtons="auto">
              <Tab label="Aree cucina" />
              <Tab label="Stampanti" />
              <Tab label="Categorie" />
              <Tab label="Voci menu" />
              <Tab label="Gruppi opzione" />
              <Tab label="Opzioni" />
            </Tabs>
          </Card>
          {tab === 0 ? (
            <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h3">Aree cucina</Typography>
                    <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={() => setCreatingKitchenArea(true)}>
                      Nuova area
                    </Button>
                  </Stack>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Sort order</TableCell>
                        <TableCell>Stato</TableCell>
                        <TableCell align="right">Azioni</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {configuration.kitchenAreas.map((area) => (
                        <TableRow key={area.id} hover>
                          <TableCell>{area.name}</TableCell>
                          <TableCell>{area.sortOrder}</TableCell>
                          <TableCell><EntityStatusChip active={area.isActive} /></TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingKitchenArea(area)}>
                              Modifica
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
          {tab === 1 ? (
            <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h3">Stampanti</Typography>
                    <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={() => setCreatingPrinter(true)}>
                      Nuova stampante
                    </Button>
                  </Stack>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Area</TableCell>
                        <TableCell>Trasporto</TableCell>
                        <TableCell>Stato</TableCell>
                        <TableCell align="right">Azioni</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {configuration.printers.map((printer) => (
                        <TableRow key={printer.id} hover>
                          <TableCell>{printer.name}</TableCell>
                          <TableCell>{kitchenAreaById.get(printer.kitchenAreaId)?.name ?? "-"}</TableCell>
                          <TableCell>{formatTransportTypeLabel(printer.transportType)}</TableCell>
                          <TableCell><EntityStatusChip active={printer.isEnabled} /></TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingPrinter(printer)}>
                              Modifica
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
          {tab === 2 ? (
            <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h3">Categorie menu</Typography>
                    <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={() => setCreatingCategory(true)}>
                      Nuova categoria
                    </Button>
                  </Stack>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Area</TableCell>
                        <TableCell>Sort order</TableCell>
                        <TableCell>Stato</TableCell>
                        <TableCell align="right">Azioni</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {configuration.categories.map((category) => (
                        <TableRow key={category.id} hover>
                          <TableCell>{category.name}</TableCell>
                          <TableCell>{kitchenAreaById.get(category.kitchenAreaId)?.name ?? "-"}</TableCell>
                          <TableCell>{category.sortOrder}</TableCell>
                          <TableCell><EntityStatusChip active={category.isActive} /></TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingCategory(category)}>
                              Modifica
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
          {tab === 3 ? (
            <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h3">Voci menu</Typography>
                    <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={() => setCreatingItem(true)}>
                      Nuova voce
                    </Button>
                  </Stack>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Categoria</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Prezzo base</TableCell>
                        <TableCell>Stato</TableCell>
                        <TableCell align="right">Azioni</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {configuration.items.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{categoryById.get(item.categoryId)?.name ?? "-"}</TableCell>
                          <TableCell>{item.itemType === "fixed" ? "Fissa" : "Componibile"}</TableCell>
                          <TableCell>{formatCurrency(item.basePriceCents)}</TableCell>
                          <TableCell><EntityStatusChip active={item.isActive} /></TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingItem(item)}>
                              Modifica
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
          {tab === 4 ? (
            <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h3">Gruppi opzione</Typography>
                    <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={() => setCreatingOptionGroup(true)}>
                      Nuovo gruppo
                    </Button>
                  </Stack>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Voce menu</TableCell>
                        <TableCell>Codice</TableCell>
                        <TableCell>Strategia</TableCell>
                        <TableCell>Selezioni</TableCell>
                        <TableCell>Stato</TableCell>
                        <TableCell align="right">Azioni</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {configuration.optionGroups.map((group) => (
                        <TableRow key={group.id} hover>
                          <TableCell>{group.name}</TableCell>
                          <TableCell>{itemById.get(group.menuItemId)?.name ?? "-"}</TableCell>
                          <TableCell>{group.code}</TableCell>
                          <TableCell>{group.pricingStrategy}</TableCell>
                          <TableCell>{group.minSelect} - {group.maxSelect}</TableCell>
                          <TableCell><EntityStatusChip active={group.isActive} /></TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingOptionGroup(group)}>
                              Modifica
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
          {tab === 5 ? (
            <Card elevation={0} sx={{ border: "1px solid rgba(18, 102, 79, 0.14)" }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h3">Opzioni</Typography>
                    <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={() => setCreatingOption(true)}>
                      Nuova opzione
                    </Button>
                  </Stack>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Gruppo</TableCell>
                        <TableCell>Codice</TableCell>
                        <TableCell>Delta</TableCell>
                        <TableCell>Stato</TableCell>
                        <TableCell align="right">Azioni</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {configuration.options.map((option) => (
                        <TableRow key={option.id} hover>
                          <TableCell>{option.name}</TableCell>
                          <TableCell>{optionGroupById.get(option.optionGroupId)?.name ?? "-"}</TableCell>
                          <TableCell>{option.code}</TableCell>
                          <TableCell>{formatCurrency(option.defaultDeltaCents)}</TableCell>
                          <TableCell><EntityStatusChip active={option.isActive} /></TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingOption(option)}>
                              Modifica
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
          <KitchenAreaDialog open={creatingKitchenArea || editingKitchenArea !== null} entity={editingKitchenArea} onClose={() => {
            setCreatingKitchenArea(false);
            setEditingKitchenArea(null);
          }} />
          <PrinterDialog open={creatingPrinter || editingPrinter !== null} entity={editingPrinter} kitchenAreas={configuration.kitchenAreas} onClose={() => {
            setCreatingPrinter(false);
            setEditingPrinter(null);
          }} />
          <CategoryDialog open={creatingCategory || editingCategory !== null} entity={editingCategory} kitchenAreas={configuration.kitchenAreas} onClose={() => {
            setCreatingCategory(false);
            setEditingCategory(null);
          }} />
          <MenuItemDialog open={creatingItem || editingItem !== null} entity={editingItem} kitchenAreas={configuration.kitchenAreas} categories={configuration.categories} onClose={() => {
            setCreatingItem(false);
            setEditingItem(null);
          }} />
          <OptionGroupDialog open={creatingOptionGroup || editingOptionGroup !== null} entity={editingOptionGroup} items={configuration.items} onClose={() => {
            setCreatingOptionGroup(false);
            setEditingOptionGroup(null);
          }} />
          <OptionDialog open={creatingOption || editingOption !== null} entity={editingOption} optionGroups={configuration.optionGroups} onClose={() => {
            setCreatingOption(false);
            setEditingOption(null);
          }} />
        </>
      ) : null}
    </Stack>
  );
}