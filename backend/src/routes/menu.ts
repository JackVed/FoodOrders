import { asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import {
  kitchenAreas,
  menuCategories,
  menuItemOptionGroups,
  menuItemOptions,
  menuItems,
} from "../db/schema/index.js";

export async function registerMenuRoutes(app: FastifyInstance) {
  app.get("/menu", { preHandler: app.authenticate }, async () => {
    const [kitchenAreaRows, categoryRows, itemRows, optionGroupRows, optionRows] = await Promise.all([
      app.db
        .select({
          id: kitchenAreas.id,
          name: kitchenAreas.name,
        })
        .from(kitchenAreas)
        .where(eq(kitchenAreas.isActive, true))
        .orderBy(asc(kitchenAreas.sortOrder), asc(kitchenAreas.name)),
      app.db
        .select({
          id: menuCategories.id,
          kitchenAreaId: menuCategories.kitchenAreaId,
          name: menuCategories.name,
        })
        .from(menuCategories)
        .where(eq(menuCategories.isActive, true))
        .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name)),
      app.db
        .select({
          id: menuItems.id,
          categoryId: menuItems.categoryId,
          kitchenAreaId: menuItems.kitchenAreaId,
          name: menuItems.name,
          itemType: menuItems.itemType,
          basePriceCents: menuItems.basePriceCents,
        })
        .from(menuItems)
        .where(eq(menuItems.isActive, true))
        .orderBy(asc(menuItems.sortOrder), asc(menuItems.name)),
      app.db
        .select({
          id: menuItemOptionGroups.id,
          menuItemId: menuItemOptionGroups.menuItemId,
          name: menuItemOptionGroups.name,
          code: menuItemOptionGroups.code,
          minSelect: menuItemOptionGroups.minSelect,
          maxSelect: menuItemOptionGroups.maxSelect,
          pricingStrategy: menuItemOptionGroups.pricingStrategy,
          firstSelectedDeltaCents: menuItemOptionGroups.firstSelectedDeltaCents,
          additionalSelectedDeltaCents: menuItemOptionGroups.additionalSelectedDeltaCents,
          anySelectedDeltaCents: menuItemOptionGroups.anySelectedDeltaCents,
          perSelectedDeltaCents: menuItemOptionGroups.perSelectedDeltaCents,
        })
        .from(menuItemOptionGroups)
        .where(eq(menuItemOptionGroups.isActive, true))
        .orderBy(asc(menuItemOptionGroups.sortOrder), asc(menuItemOptionGroups.name)),
      app.db
        .select({
          id: menuItemOptions.id,
          optionGroupId: menuItemOptions.optionGroupId,
          name: menuItemOptions.name,
          code: menuItemOptions.code,
          defaultDeltaCents: menuItemOptions.defaultDeltaCents,
        })
        .from(menuItemOptions)
        .where(eq(menuItemOptions.isActive, true))
        .orderBy(asc(menuItemOptions.sortOrder), asc(menuItemOptions.name)),
    ]);

    const kitchenAreaById = new Map(kitchenAreaRows.map((row) => [row.id, row]));
    const optionRowsByGroupId = new Map<number, typeof optionRows>();

    for (const optionRow of optionRows) {
      const existingRows = optionRowsByGroupId.get(optionRow.optionGroupId) ?? [];
      existingRows.push(optionRow);
      optionRowsByGroupId.set(optionRow.optionGroupId, existingRows);
    }

    const optionGroupsByItemId = new Map<number, ReturnType<typeof buildOptionGroup>[]>()

    function buildOptionGroup(optionGroupRow: (typeof optionGroupRows)[number]) {
      return {
        id: optionGroupRow.id,
        name: optionGroupRow.name,
        code: optionGroupRow.code,
        minSelect: optionGroupRow.minSelect,
        maxSelect: optionGroupRow.maxSelect,
        pricingStrategy: optionGroupRow.pricingStrategy,
        firstSelectedDeltaCents: optionGroupRow.firstSelectedDeltaCents,
        additionalSelectedDeltaCents: optionGroupRow.additionalSelectedDeltaCents,
        anySelectedDeltaCents: optionGroupRow.anySelectedDeltaCents,
        perSelectedDeltaCents: optionGroupRow.perSelectedDeltaCents,
        options:
          optionRowsByGroupId.get(optionGroupRow.id)?.map((optionRow) => ({
            id: optionRow.id,
            name: optionRow.name,
            code: optionRow.code,
            defaultDeltaCents: optionRow.defaultDeltaCents,
          })) ?? [],
      };
    }

    for (const optionGroupRow of optionGroupRows) {
      const existingRows = optionGroupsByItemId.get(optionGroupRow.menuItemId) ?? [];
      existingRows.push(buildOptionGroup(optionGroupRow));
      optionGroupsByItemId.set(optionGroupRow.menuItemId, existingRows);
    }

    const itemsByCategoryId = new Map<number, Array<{
      id: number;
      name: string;
      itemType: string;
      basePriceCents: number;
      kitchenAreaId: number | null;
      optionGroups: ReturnType<typeof buildOptionGroup>[];
    }>>();

    for (const itemRow of itemRows) {
      const existingRows = itemsByCategoryId.get(itemRow.categoryId) ?? [];
      existingRows.push({
        id: itemRow.id,
        name: itemRow.name,
        itemType: itemRow.itemType,
        basePriceCents: itemRow.basePriceCents,
        kitchenAreaId: itemRow.kitchenAreaId,
        optionGroups: optionGroupsByItemId.get(itemRow.id) ?? [],
      });
      itemsByCategoryId.set(itemRow.categoryId, existingRows);
    }

    return {
      categories: categoryRows.map((categoryRow) => ({
        id: categoryRow.id,
        name: categoryRow.name,
        kitchenArea: kitchenAreaById.get(categoryRow.kitchenAreaId) ?? null,
        items: itemsByCategoryId.get(categoryRow.id) ?? [],
      })),
    };
  });
}