import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { createdAtColumn, identityId, updatedAtColumn } from "./common.js";
import { menuItemTypeEnum, pricingStrategyEnum, printerTransportTypeEnum } from "./enums.js";

export const kitchenAreas = pgTable(
  "kitchen_areas",
  {
    id: identityId(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("kitchen_areas_name_key").on(table.name),
    index("kitchen_areas_is_active_idx").on(table.isActive),
  ],
);

export const printers = pgTable(
  "printers",
  {
    id: identityId(),
    kitchenAreaId: integer("kitchen_area_id")
      .notNull()
      .references(() => kitchenAreas.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    transportType: printerTransportTypeEnum("transport_type").notNull().default("mock"),
    connectionConfigJson: jsonb("connection_config_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("printers_name_key").on(table.name),
    uniqueIndex("printers_id_kitchen_area_key").on(table.id, table.kitchenAreaId),
    index("printers_kitchen_area_id_idx").on(table.kitchenAreaId),
    index("printers_is_enabled_idx").on(table.isEnabled),
    foreignKey({
      name: "printers_kitchen_area_id_kitchen_areas_id_fk",
      columns: [table.kitchenAreaId],
      foreignColumns: [kitchenAreas.id],
    }).onDelete("restrict"),
  ],
);

export const menuCategories = pgTable(
  "menu_categories",
  {
    id: identityId(),
    kitchenAreaId: integer("kitchen_area_id")
      .notNull()
      .references(() => kitchenAreas.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("menu_categories_kitchen_area_name_key").on(table.kitchenAreaId, table.name),
    index("menu_categories_kitchen_area_id_idx").on(table.kitchenAreaId),
    index("menu_categories_is_active_idx").on(table.isActive),
  ],
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: identityId(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => menuCategories.id, { onDelete: "restrict" }),
    kitchenAreaId: integer("kitchen_area_id").references(() => kitchenAreas.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    itemType: menuItemTypeEnum("item_type").notNull().default("fixed"),
    basePriceCents: integer("base_price_cents").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("menu_items_category_name_key").on(table.categoryId, table.name),
    index("menu_items_category_id_idx").on(table.categoryId),
    index("menu_items_kitchen_area_id_idx").on(table.kitchenAreaId),
    index("menu_items_is_active_idx").on(table.isActive),
  ],
);

export const menuItemOptionGroups = pgTable(
  "menu_item_option_groups",
  {
    id: identityId(),
    menuItemId: integer("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    minSelect: integer("min_select").notNull().default(0),
    maxSelect: integer("max_select").notNull().default(1),
    pricingStrategy: pricingStrategyEnum("pricing_strategy").notNull().default("sum_options"),
    firstSelectedDeltaCents: integer("first_selected_delta_cents"),
    additionalSelectedDeltaCents: integer("additional_selected_delta_cents"),
    anySelectedDeltaCents: integer("any_selected_delta_cents"),
    perSelectedDeltaCents: integer("per_selected_delta_cents"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("menu_item_option_groups_item_code_key").on(table.menuItemId, table.code),
    index("menu_item_option_groups_menu_item_id_idx").on(table.menuItemId),
    index("menu_item_option_groups_is_active_idx").on(table.isActive),
  ],
);

export const menuItemOptions = pgTable(
  "menu_item_options",
  {
    id: identityId(),
    optionGroupId: integer("option_group_id")
      .notNull()
      .references(() => menuItemOptionGroups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    defaultDeltaCents: integer("default_delta_cents").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("menu_item_options_group_code_key").on(table.optionGroupId, table.code),
    index("menu_item_options_option_group_id_idx").on(table.optionGroupId),
    index("menu_item_options_is_active_idx").on(table.isActive),
  ],
);