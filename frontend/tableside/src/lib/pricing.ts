import type { MenuItem, PricingStrategy } from "../types";

function buildSelectionDeltas(
  pricingStrategy: PricingStrategy,
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
      return optionDefaultDeltas.map((_, index) => (index === 0 ? group.firstSelectedDeltaCents ?? 0 : group.additionalSelectedDeltaCents ?? 0));
    case "per_selected":
      return optionDefaultDeltas.map(() => group.perSelectedDeltaCents ?? 0);
  }
}

export function estimateMenuItemUnitPriceCents(
  menuItem: MenuItem,
  selectedOptionIdsByGroupId: Record<number, number[]>,
) {
  let unitPriceCents = menuItem.basePriceCents;

  for (const optionGroup of menuItem.optionGroups) {
    const selectedIds = selectedOptionIdsByGroupId[optionGroup.id] ?? [];
    const selectedOptions = optionGroup.options.filter((option) => selectedIds.includes(option.id));
    const deltas = buildSelectionDeltas(
      optionGroup.pricingStrategy,
      selectedOptions.length,
      optionGroup,
      selectedOptions.map((option) => option.defaultDeltaCents),
    );

    for (const delta of deltas) {
      unitPriceCents += delta;
    }
  }

  return unitPriceCents;
}