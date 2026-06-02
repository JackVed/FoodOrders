import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { users } from "./auth.js";
import { createdAtColumn, identityId, updatedAtColumn } from "./common.js";
import { orderStatusEnum, sourceAppEnum } from "./enums.js";
import { kitchenAreas, menuItems, printers } from "./menu.js";

export const orders = pgTable(
  "orders",
  {
    id: identityId(),
    createdByUserId: integer("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdByUsernameSnapshot: text("created_by_username_snapshot").notNull(),
    sourceApp: sourceAppEnum("source_app").notNull(),
    tableNumber: integer("table_number").notNull(),
    status: orderStatusEnum("status").notNull().default("Sent"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    printedAt: timestamp("printed_at", { withTimezone: true }),
  },
  (table) => [
    index("orders_created_by_user_id_idx").on(table.createdByUserId),
    index("orders_status_idx").on(table.status),
    index("orders_created_at_idx").on(table.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: identityId(),
    orderId: integer("order_id").notNull(),
    menuItemId: integer("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
    kitchenAreaId: integer("kitchen_area_id").notNull(),
    displayNameSnapshot: text("display_name_snapshot").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("order_items_id_order_kitchen_area_key").on(table.id, table.orderId, table.kitchenAreaId),
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_kitchen_area_id_idx").on(table.kitchenAreaId),
    foreignKey({
      name: "order_items_order_id_orders_id_fk",
      columns: [table.orderId],
      foreignColumns: [orders.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "order_items_kitchen_area_id_kitchen_areas_id_fk",
      columns: [table.kitchenAreaId],
      foreignColumns: [kitchenAreas.id],
    }).onDelete("restrict"),
  ],
);

export const orderItemSelections = pgTable(
  "order_item_selections",
  {
    id: identityId(),
    orderItemId: integer("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    optionGroupNameSnapshot: text("option_group_name_snapshot").notNull(),
    optionNameSnapshot: text("option_name_snapshot").notNull(),
    priceDeltaCents: integer("price_delta_cents").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("order_item_selections_order_item_id_idx").on(table.orderItemId)],
);

export const kitchenTickets = pgTable(
  "kitchen_tickets",
  {
    id: identityId(),
    orderId: integer("order_id").notNull(),
    kitchenAreaId: integer("kitchen_area_id").notNull(),
    printerId: integer("printer_id").references(() => printers.id, { onDelete: "set null" }),
    insertedByUsernameSnapshot: text("inserted_by_username_snapshot").notNull(),
    sourceApp: sourceAppEnum("source_app").notNull(),
    tableNumber: integer("table_number").notNull(),
    status: orderStatusEnum("status").notNull().default("Sent"),
    createdAt: createdAtColumn(),
    printedAt: timestamp("printed_at", { withTimezone: true }),
    payloadJson: jsonb("payload_json").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  },
  (table) => [
    uniqueIndex("kitchen_tickets_id_order_kitchen_area_key").on(table.id, table.orderId, table.kitchenAreaId),
    uniqueIndex("kitchen_tickets_order_kitchen_area_key").on(table.orderId, table.kitchenAreaId),
    index("kitchen_tickets_status_idx").on(table.status),
    index("kitchen_tickets_kitchen_area_id_idx").on(table.kitchenAreaId),
    index("kitchen_tickets_created_at_idx").on(table.createdAt),
    foreignKey({
      name: "kitchen_tickets_order_id_orders_id_fk",
      columns: [table.orderId],
      foreignColumns: [orders.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "kitchen_tickets_kitchen_area_id_kitchen_areas_id_fk",
      columns: [table.kitchenAreaId],
      foreignColumns: [kitchenAreas.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "kitchen_tickets_printer_area_fk",
      columns: [table.printerId, table.kitchenAreaId],
      foreignColumns: [printers.id, printers.kitchenAreaId],
    }),
  ],
);

export const kitchenTicketItems = pgTable(
  "kitchen_ticket_items",
  {
    id: identityId(),
    kitchenTicketId: integer("kitchen_ticket_id").notNull(),
    orderItemId: integer("order_item_id").notNull(),
    orderId: integer("order_id").notNull(),
    kitchenAreaId: integer("kitchen_area_id").notNull(),
    displayNameSnapshot: text("display_name_snapshot").notNull(),
    quantity: integer("quantity").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("kitchen_ticket_items_ticket_order_item_key").on(table.kitchenTicketId, table.orderItemId),
    index("kitchen_ticket_items_kitchen_ticket_id_idx").on(table.kitchenTicketId),
    foreignKey({
      name: "kitchen_ticket_items_ticket_order_area_fk",
      columns: [table.kitchenTicketId, table.orderId, table.kitchenAreaId],
      foreignColumns: [kitchenTickets.id, kitchenTickets.orderId, kitchenTickets.kitchenAreaId],
    }).onDelete("cascade"),
    foreignKey({
      name: "kitchen_ticket_items_order_item_order_area_fk",
      columns: [table.orderItemId, table.orderId, table.kitchenAreaId],
      foreignColumns: [orderItems.id, orderItems.orderId, orderItems.kitchenAreaId],
    }).onDelete("cascade"),
  ],
);

export const ticketDeliveryAttempts = pgTable(
  "ticket_delivery_attempts",
  {
    id: identityId(),
    kitchenTicketId: integer("kitchen_ticket_id")
      .notNull()
      .references(() => kitchenTickets.id, { onDelete: "cascade" }),
    printerId: integer("printer_id").references(() => printers.id, { onDelete: "set null" }),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
    success: boolean("success").notNull(),
    errorMessage: text("error_message"),
    rawResponseJson: jsonb("raw_response_json").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("ticket_delivery_attempts_kitchen_ticket_id_idx").on(table.kitchenTicketId),
    index("ticket_delivery_attempts_success_idx").on(table.success),
    index("ticket_delivery_attempts_attempted_at_idx").on(table.attemptedAt),
  ],
);