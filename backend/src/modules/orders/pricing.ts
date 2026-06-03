import { and, eq, inArray } from "drizzle-orm";

import type { DatabaseClient } from "../../db/types.js";
import { kitchenAreas, menuCategories, menuItemOptionGroups, menuItemOptions, menuItems } from "../../db/schema/index.js";
import type { UserRole } from "../auth/session.js";

export interface RequestedOrderItemSelection {
  optionGroupId: number;
  optionId: number;
}

export interface RequestedOrderItem {
  menuItemId: number;
  quantity: number;
  selections: RequestedOrderItemSelection[];
}

export interface CreateOrderInput {
  sourceApp: "POS" | "Tableside";
  tableNumber: number;
  items: RequestedOrderItem[];
}

export interface PreparedOrderSelection {
  optionGroupId: number;
  optionId: number;
  optionGroupNameSnapshot: string;
  optionNameSnapshot: string;
  priceDeltaCents: number;
  sortOrder: number;
}

export interface PreparedOrderItem {
  menuItemId: number;
  kitchenAreaId: number;
  kitchenAreaName: string;
  displayNameSnapshot: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  selections: PreparedOrderSelection[];
}

export interface PreparedOrderDraft {
  sourceApp: CreateOrderInput["sourceApp"];
  tableNumber: number;
  items: PreparedOrderItem[];
  totalAmountCents: number;
}

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

export function buildSelectionDeltas(
  pricingStrategy: "sum_options" | "any_selected" | "first_and_additional" | "per_selected",
  selectedCount: number,
  group: {
    firstSelectedDeltaCents: number | null;
    additionalSelectedDeltaCents: number | null;
    anySelectedDeltaCents: number | null;
    perSelectedDeltaCents: number | null;
  },
  optionDefaultDeltas: number[],
) {
  switch (pricingStrategy) {
    case "sum_options":
      return optionDefaultDeltas;
    case "any_selected":
      return optionDefaultDeltas.map((_, index) => (index === 0 && selectedCount > 0 ? group.anySelectedDeltaCents ?? 0 : 0));
    case "first_and_additional":
      return optionDefaultDeltas.map((_, index) => {
        if (index === 0) {
          return group.firstSelectedDeltaCents ?? 0;
        }

        return group.additionalSelectedDeltaCents ?? 0;
      });
    case "per_selected":
      return optionDefaultDeltas.map(() => group.perSelectedDeltaCents ?? 0);
    default:
      return optionDefaultDeltas;
  }
}

export async function prepareOrderDraft(db: DatabaseClient, input: CreateOrderInput) {
  if (input.items.length === 0) {
    throw new OrderValidationError("L'ordine deve contenere almeno una voce.");
  }

  const menuItemIds = Array.from(new Set(input.items.map((item) => item.menuItemId)));
  const itemRows = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      itemType: menuItems.itemType,
      basePriceCents: menuItems.basePriceCents,
      itemKitchenAreaId: menuItems.kitchenAreaId,
      categoryKitchenAreaId: menuCategories.kitchenAreaId,
    })
    .from(menuItems)
    .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(and(inArray(menuItems.id, menuItemIds), eq(menuItems.isActive, true), eq(menuCategories.isActive, true)));

  const itemById = new Map(itemRows.map((row) => [row.id, row]));
  const resolvedAreaIds = Array.from(new Set(itemRows.map((row) => row.itemKitchenAreaId ?? row.categoryKitchenAreaId)));
  const areaRows = resolvedAreaIds.length === 0
    ? []
    : await db
      .select({
        id: kitchenAreas.id,
        name: kitchenAreas.name,
      })
      .from(kitchenAreas)
      .where(and(inArray(kitchenAreas.id, resolvedAreaIds), eq(kitchenAreas.isActive, true)));
  const areaById = new Map(areaRows.map((row) => [row.id, row]));

  const optionGroupRows = menuItemIds.length === 0
    ? []
    : await db
      .select({
        id: menuItemOptionGroups.id,
        menuItemId: menuItemOptionGroups.menuItemId,
        name: menuItemOptionGroups.name,
        minSelect: menuItemOptionGroups.minSelect,
        maxSelect: menuItemOptionGroups.maxSelect,
        pricingStrategy: menuItemOptionGroups.pricingStrategy,
        firstSelectedDeltaCents: menuItemOptionGroups.firstSelectedDeltaCents,
        additionalSelectedDeltaCents: menuItemOptionGroups.additionalSelectedDeltaCents,
        anySelectedDeltaCents: menuItemOptionGroups.anySelectedDeltaCents,
        perSelectedDeltaCents: menuItemOptionGroups.perSelectedDeltaCents,
        sortOrder: menuItemOptionGroups.sortOrder,
      })
      .from(menuItemOptionGroups)
      .where(and(inArray(menuItemOptionGroups.menuItemId, menuItemIds), eq(menuItemOptionGroups.isActive, true)));
  const optionGroupIds = optionGroupRows.map((row) => row.id);
  const optionRows = optionGroupIds.length === 0
    ? []
    : await db
      .select({
        id: menuItemOptions.id,
        optionGroupId: menuItemOptions.optionGroupId,
        name: menuItemOptions.name,
        defaultDeltaCents: menuItemOptions.defaultDeltaCents,
        sortOrder: menuItemOptions.sortOrder,
      })
      .from(menuItemOptions)
      .where(and(inArray(menuItemOptions.optionGroupId, optionGroupIds), eq(menuItemOptions.isActive, true)));

  const groupsByItemId = new Map<number, typeof optionGroupRows>();
  const optionsByGroupId = new Map<number, typeof optionRows>();

  for (const optionGroupRow of optionGroupRows) {
    const existingRows = groupsByItemId.get(optionGroupRow.menuItemId) ?? [];
    existingRows.push(optionGroupRow);
    groupsByItemId.set(optionGroupRow.menuItemId, existingRows);
  }

  for (const optionRow of optionRows) {
    const existingRows = optionsByGroupId.get(optionRow.optionGroupId) ?? [];
    existingRows.push(optionRow);
    optionsByGroupId.set(optionRow.optionGroupId, existingRows);
  }

  const preparedItems: PreparedOrderItem[] = [];
  let totalAmountCents = 0;

  for (const requestedItem of input.items) {
    const menuItem = itemById.get(requestedItem.menuItemId);

    if (!menuItem) {
      throw new OrderValidationError(`La voce menu ${requestedItem.menuItemId} non e disponibile.`);
    }

    const effectiveKitchenAreaId = menuItem.itemKitchenAreaId ?? menuItem.categoryKitchenAreaId;
    const kitchenArea = areaById.get(effectiveKitchenAreaId);

    if (!kitchenArea) {
      throw new OrderValidationError(`La voce ${menuItem.name} non ha una area cucina attiva.`);
    }

    if (requestedItem.quantity <= 0) {
      throw new OrderValidationError(`La quantita per ${menuItem.name} deve essere positiva.`);
    }

    if (menuItem.itemType === "fixed" && requestedItem.selections.length > 0) {
      throw new OrderValidationError(`La voce ${menuItem.name} non accetta opzioni.`);
    }

    const itemOptionGroups = groupsByItemId.get(menuItem.id) ?? [];
    const optionGroupById = new Map(itemOptionGroups.map((row) => [row.id, row]));
    const selectionsByGroupId = new Map<number, RequestedOrderItemSelection[]>();
    const seenSelectionKeys = new Set<string>();

    for (const selection of requestedItem.selections) {
      const selectionKey = `${selection.optionGroupId}:${selection.optionId}`;

      if (seenSelectionKeys.has(selectionKey)) {
        throw new OrderValidationError(`La voce ${menuItem.name} contiene una opzione duplicata.`);
      }

      seenSelectionKeys.add(selectionKey);

      const optionGroup = optionGroupById.get(selection.optionGroupId);

      if (!optionGroup) {
        throw new OrderValidationError(`La selezione ${selection.optionGroupId} non appartiene alla voce ${menuItem.name}.`);
      }

      const existingSelections = selectionsByGroupId.get(selection.optionGroupId) ?? [];
      existingSelections.push(selection);
      selectionsByGroupId.set(selection.optionGroupId, existingSelections);
    }

    const preparedSelections: PreparedOrderSelection[] = [];
    let unitPriceCents = menuItem.basePriceCents;
    let selectionSortOrder = 1;

    for (const optionGroup of itemOptionGroups.sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)) {
      const selectedRows = selectionsByGroupId.get(optionGroup.id) ?? [];

      if (selectedRows.length < optionGroup.minSelect || selectedRows.length > optionGroup.maxSelect) {
        throw new OrderValidationError(
          `La voce ${menuItem.name} richiede tra ${optionGroup.minSelect} e ${optionGroup.maxSelect} selezioni per ${optionGroup.name}.`,
        );
      }

      const optionsForGroup = (optionsByGroupId.get(optionGroup.id) ?? []).sort(
        (left, right) => left.sortOrder - right.sortOrder || left.id - right.id,
      );
      const optionById = new Map(optionsForGroup.map((row) => [row.id, row]));
      const selectedOptions = selectedRows.map((selection) => {
        const option = optionById.get(selection.optionId);

        if (!option) {
          throw new OrderValidationError(
            `L'opzione ${selection.optionId} non e valida per ${optionGroup.name} nella voce ${menuItem.name}.`,
          );
        }

        return option;
      }).sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);

      const deltas = buildSelectionDeltas(
        optionGroup.pricingStrategy,
        selectedOptions.length,
        optionGroup,
        selectedOptions.map((option) => option.defaultDeltaCents),
      );

      deltas.forEach((delta) => {
        unitPriceCents += delta;
      });

      selectedOptions.forEach((option, index) => {
        preparedSelections.push({
          optionGroupId: optionGroup.id,
          optionId: option.id,
          optionGroupNameSnapshot: optionGroup.name,
          optionNameSnapshot: option.name,
          priceDeltaCents: deltas[index] ?? 0,
          sortOrder: selectionSortOrder,
        });
        selectionSortOrder += 1;
      });
    }

    const lineTotalCents = unitPriceCents * requestedItem.quantity;
    totalAmountCents += lineTotalCents;
    preparedItems.push({
      menuItemId: menuItem.id,
      kitchenAreaId: kitchenArea.id,
      kitchenAreaName: kitchenArea.name,
      displayNameSnapshot: menuItem.name,
      quantity: requestedItem.quantity,
      unitPriceCents,
      lineTotalCents,
      selections: preparedSelections,
    });
  }

  return {
    sourceApp: input.sourceApp,
    tableNumber: input.tableNumber,
    items: preparedItems,
    totalAmountCents,
  } satisfies PreparedOrderDraft;
}