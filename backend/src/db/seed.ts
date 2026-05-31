import { hashPassword } from "../modules/auth/password.js";
import { loadConfig } from "../config/env.js";
import { createDbConnection } from "./client.js";
import {
  kitchenAreas,
  menuCategories,
  menuItemOptionGroups,
  menuItemOptions,
  menuItems,
  printers,
  users,
} from "./schema/index.js";

type MenuItemType = "fixed" | "composable";
type PricingStrategy = "sum_options" | "any_selected" | "first_and_additional" | "per_selected";

interface SeedMenuItem {
  key: string;
  categoryKey: string;
  name: string;
  itemType: MenuItemType;
  basePriceCents: number;
  sortOrder: number;
}

interface SeedOptionGroup {
  key: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  pricingStrategy: PricingStrategy;
  firstSelectedDeltaCents?: number;
  additionalSelectedDeltaCents?: number;
  anySelectedDeltaCents?: number;
  perSelectedDeltaCents?: number;
  sortOrder: number;
  options: readonly string[];
}

interface SeedOptionGroupSet {
  menuItemKey: string;
  groups: readonly SeedOptionGroup[];
}

function expectRow<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new Error(message);
  }

  return row;
}

const kitchenAreaSeed = [
  { key: "kitchen", name: "Cucina", sortOrder: 1 },
  { key: "fried", name: "Friggitrice", sortOrder: 2 },
  { key: "bar", name: "Bar", sortOrder: 3 },
] as const;

const categorySeed = [
  { key: "panini", kitchenAreaKey: "kitchen", name: "Panini", sortOrder: 1 },
  { key: "piadine", kitchenAreaKey: "kitchen", name: "Piadine", sortOrder: 2 },
  { key: "fritti", kitchenAreaKey: "fried", name: "Fritti", sortOrder: 3 },
  { key: "birre", kitchenAreaKey: "bar", name: "Birre", sortOrder: 4 },
  { key: "bibite", kitchenAreaKey: "bar", name: "Bibite", sortOrder: 5 },
  { key: "cocktail", kitchenAreaKey: "bar", name: "Cocktail", sortOrder: 6 },
] as const;

const menuItemSeed: readonly SeedMenuItem[] = [
  { key: "panino", categoryKey: "panini", name: "Panino componibile", itemType: "composable", basePriceCents: 500, sortOrder: 1 },
  { key: "piadina", categoryKey: "piadine", name: "Piadina componibile", itemType: "composable", basePriceCents: 500, sortOrder: 1 },
  { key: "patatine-piccole", categoryKey: "fritti", name: "Patatine fritte piccole", itemType: "fixed", basePriceCents: 400, sortOrder: 1 },
  { key: "patatine-grandi", categoryKey: "fritti", name: "Patatine fritte grandi", itemType: "fixed", basePriceCents: 600, sortOrder: 2 },
  { key: "nuggets", categoryKey: "fritti", name: "Nuggets", itemType: "fixed", basePriceCents: 500, sortOrder: 3 },
  { key: "birra-pils-piccola", categoryKey: "birre", name: "Birra pils piccola", itemType: "fixed", basePriceCents: 350, sortOrder: 1 },
  { key: "birra-pils-grande", categoryKey: "birre", name: "Birra pils grande", itemType: "fixed", basePriceCents: 600, sortOrder: 2 },
  { key: "birra-ipa-piccola", categoryKey: "birre", name: "Birra ipa piccola", itemType: "fixed", basePriceCents: 400, sortOrder: 3 },
  { key: "birra-ipa-grande", categoryKey: "birre", name: "Birra ipa grande", itemType: "fixed", basePriceCents: 700, sortOrder: 4 },
  { key: "birra-helles-piccola", categoryKey: "birre", name: "Birra helles piccola", itemType: "fixed", basePriceCents: 400, sortOrder: 5 },
  { key: "birra-helles-grande", categoryKey: "birre", name: "Birra helles grande", itemType: "fixed", basePriceCents: 600, sortOrder: 6 },
  { key: "coca-cola", categoryKey: "bibite", name: "Coca cola", itemType: "fixed", basePriceCents: 400, sortOrder: 1 },
  { key: "te", categoryKey: "bibite", name: "Te", itemType: "fixed", basePriceCents: 400, sortOrder: 2 },
  { key: "caffe", categoryKey: "bibite", name: "Caffe", itemType: "fixed", basePriceCents: 150, sortOrder: 3 },
  { key: "gin-tonic", categoryKey: "cocktail", name: "Gin tonic", itemType: "fixed", basePriceCents: 600, sortOrder: 1 },
  { key: "moscow-mule", categoryKey: "cocktail", name: "Moscow mule", itemType: "fixed", basePriceCents: 900, sortOrder: 2 },
  { key: "london-mule", categoryKey: "cocktail", name: "London mule", itemType: "fixed", basePriceCents: 800, sortOrder: 3 },
] as const;

const optionGroupSeed: readonly SeedOptionGroupSet[] = [
  {
    menuItemKey: "panino",
    groups: [
      {
        key: "carni",
        name: "Carni",
        minSelect: 1,
        maxSelect: 3,
        pricingStrategy: "first_and_additional",
        firstSelectedDeltaCents: 100,
        additionalSelectedDeltaCents: 150,
        sortOrder: 1,
        options: ["cotto", "porchetta", "salsiccia"],
      },
      {
        key: "formaggi",
        name: "Formaggi",
        minSelect: 0,
        maxSelect: 1,
        pricingStrategy: "per_selected",
        perSelectedDeltaCents: 50,
        sortOrder: 2,
        options: ["formaggio"],
      },
      {
        key: "verdure",
        name: "Verdure",
        minSelect: 0,
        maxSelect: 3,
        pricingStrategy: "any_selected",
        anySelectedDeltaCents: 50,
        sortOrder: 3,
        options: ["cipolle", "peperoni", "funghi"],
      },
    ],
  },
  {
    menuItemKey: "piadina",
    groups: [
      {
        key: "carni",
        name: "Carni",
        minSelect: 1,
        maxSelect: 3,
        pricingStrategy: "first_and_additional",
        firstSelectedDeltaCents: 100,
        additionalSelectedDeltaCents: 150,
        sortOrder: 1,
        options: ["cotto", "porchetta", "salsiccia"],
      },
      {
        key: "formaggi",
        name: "Formaggi",
        minSelect: 0,
        maxSelect: 1,
        pricingStrategy: "per_selected",
        perSelectedDeltaCents: 50,
        sortOrder: 2,
        options: ["formaggio"],
      },
      {
        key: "verdure",
        name: "Verdure",
        minSelect: 0,
        maxSelect: 3,
        pricingStrategy: "any_selected",
        anySelectedDeltaCents: 50,
        sortOrder: 3,
        options: ["cipolle", "peperoni", "funghi"],
      },
    ],
  },
] as const;

const config = loadConfig();
const { db, sql } = createDbConnection(config);

try {
  const passwordHash = await hashPassword(config.ADMIN_PASSWORD);

  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({
        username: config.ADMIN_USERNAME,
        passwordHash,
        role: "admin",
        isEnabled: true,
        disabledAt: null,
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          passwordHash,
          role: "admin",
          isEnabled: true,
          disabledAt: null,
          updatedAt: new Date(),
        },
      });

    const kitchenAreaIds = new Map<string, number>();

    for (const area of kitchenAreaSeed) {
      const insertedRows = await tx
        .insert(kitchenAreas)
        .values({
          name: area.name,
          sortOrder: area.sortOrder,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: kitchenAreas.name,
          set: {
            sortOrder: area.sortOrder,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning({ id: kitchenAreas.id });

      const row = expectRow(insertedRows[0], `Missing returning row for kitchen area ${area.key}`);

      kitchenAreaIds.set(area.key, row.id);
    }

    for (const area of kitchenAreaSeed) {
      const kitchenAreaId = kitchenAreaIds.get(area.key);

      if (!kitchenAreaId) {
        throw new Error(`Missing kitchen area id for ${area.key}`);
      }

      await tx
        .insert(printers)
        .values({
          kitchenAreaId,
          name: `Stampante ${area.name}`,
          transportType: "mock",
          connectionConfigJson: { mode: "placeholder", kitchenArea: area.key },
          isEnabled: true,
        })
        .onConflictDoUpdate({
          target: printers.name,
          set: {
            kitchenAreaId,
            transportType: "mock",
            connectionConfigJson: { mode: "placeholder", kitchenArea: area.key },
            isEnabled: true,
            updatedAt: new Date(),
          },
        });
    }

    const categoryIds = new Map<string, number>();

    for (const category of categorySeed) {
      const kitchenAreaId = kitchenAreaIds.get(category.kitchenAreaKey);

      if (!kitchenAreaId) {
        throw new Error(`Missing kitchen area id for ${category.kitchenAreaKey}`);
      }

      const insertedRows = await tx
        .insert(menuCategories)
        .values({
          kitchenAreaId,
          name: category.name,
          sortOrder: category.sortOrder,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [menuCategories.kitchenAreaId, menuCategories.name],
          set: {
            sortOrder: category.sortOrder,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning({ id: menuCategories.id });

      const row = expectRow(insertedRows[0], `Missing returning row for category ${category.key}`);

      categoryIds.set(category.key, row.id);
    }

    const menuItemIds = new Map<string, number>();

    for (const item of menuItemSeed) {
      const categoryId = categoryIds.get(item.categoryKey);

      if (!categoryId) {
        throw new Error(`Missing category id for ${item.categoryKey}`);
      }

      const insertedRows = await tx
        .insert(menuItems)
        .values({
          categoryId,
          name: item.name,
          itemType: item.itemType,
          basePriceCents: item.basePriceCents,
          isActive: true,
          sortOrder: item.sortOrder,
        })
        .onConflictDoUpdate({
          target: [menuItems.categoryId, menuItems.name],
          set: {
            itemType: item.itemType,
            basePriceCents: item.basePriceCents,
            isActive: true,
            sortOrder: item.sortOrder,
            updatedAt: new Date(),
          },
        })
        .returning({ id: menuItems.id });

      const row = expectRow(insertedRows[0], `Missing returning row for menu item ${item.key}`);

      menuItemIds.set(item.key, row.id);
    }

    for (const seededItem of optionGroupSeed) {
      const menuItemId = menuItemIds.get(seededItem.menuItemKey);

      if (!menuItemId) {
        throw new Error(`Missing menu item id for ${seededItem.menuItemKey}`);
      }

      for (const group of seededItem.groups) {
        const insertedGroupRows = await tx
          .insert(menuItemOptionGroups)
          .values({
            menuItemId,
            name: group.name,
            code: group.key,
            minSelect: group.minSelect,
            maxSelect: group.maxSelect,
            pricingStrategy: group.pricingStrategy,
            firstSelectedDeltaCents: group.firstSelectedDeltaCents ?? null,
            additionalSelectedDeltaCents: group.additionalSelectedDeltaCents ?? null,
            anySelectedDeltaCents: group.anySelectedDeltaCents ?? null,
            perSelectedDeltaCents: group.perSelectedDeltaCents ?? null,
            sortOrder: group.sortOrder,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: [menuItemOptionGroups.menuItemId, menuItemOptionGroups.code],
            set: {
              name: group.name,
              minSelect: group.minSelect,
              maxSelect: group.maxSelect,
              pricingStrategy: group.pricingStrategy,
              firstSelectedDeltaCents: group.firstSelectedDeltaCents ?? null,
              additionalSelectedDeltaCents: group.additionalSelectedDeltaCents ?? null,
              anySelectedDeltaCents: group.anySelectedDeltaCents ?? null,
              perSelectedDeltaCents: group.perSelectedDeltaCents ?? null,
              sortOrder: group.sortOrder,
              isActive: true,
            },
          })
          .returning({ id: menuItemOptionGroups.id });

        const groupRow = expectRow(
          insertedGroupRows[0],
          `Missing returning row for option group ${group.key} of ${seededItem.menuItemKey}`,
        );

        for (const [index, optionName] of group.options.entries()) {
          const optionCode = optionName
            .toLowerCase()
            .replaceAll(" ", "-");

          await tx
            .insert(menuItemOptions)
            .values({
              optionGroupId: groupRow.id,
              name: optionName,
              code: optionCode,
              defaultDeltaCents: 0,
              sortOrder: index + 1,
              isActive: true,
            })
            .onConflictDoUpdate({
              target: [menuItemOptions.optionGroupId, menuItemOptions.code],
              set: {
                name: optionName,
                defaultDeltaCents: 0,
                sortOrder: index + 1,
                isActive: true,
              },
            });
        }
      }
    }
  });

  console.log("Seed completed successfully.");
} finally {
  await sql.end();
}