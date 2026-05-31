import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "management", "operator"]);

export const sourceAppEnum = pgEnum("source_app", ["POS", "Tableside"]);

export const orderStatusEnum = pgEnum("order_status", ["Sent", "Printed"]);

export const menuItemTypeEnum = pgEnum("menu_item_type", ["fixed", "composable"]);

export const pricingStrategyEnum = pgEnum("pricing_strategy", [
  "sum_options",
  "any_selected",
  "first_and_additional",
  "per_selected",
]);

export const printerTransportTypeEnum = pgEnum("printer_transport_type", [
  "mock",
  "network",
  "system",
]);