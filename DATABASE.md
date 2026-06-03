# FoodOrders Database Reference

FoodOrders uses PostgreSQL as the shared database for the backend, the POS app, and the Tableside app. In local development the default database name is `food_orders_db`, as defined in `backend/.env.example`.

This document describes the current schema: the database structure, every table, every column, the PostgreSQL enums, and the main relationships between records.

## Source Of Truth

The schema is defined in these files:

- `backend/src/db/schema/auth.ts`
- `backend/src/db/schema/menu.ts`
- `backend/src/db/schema/orders.ts`
- `backend/src/db/schema/enums.ts`
- `backend/src/db/schema/common.ts`

The generated SQL migration in `backend/drizzle/0000_eager_valkyrie.sql` is the best cross-check for exact SQL names, foreign keys, and indexes.

## Shared Schema Conventions

- Primary keys use an integer identity column named `id`.
- Timestamps are stored as `timestamp with time zone`.
- Monetary values are stored as integer cents, for example `500` means EUR 5.00.
- Snapshot columns preserve historical values on orders and tickets even if related records later change.
- JSON payloads and transport settings are stored in `jsonb` columns.
- Not every table has both `created_at` and `updated_at`. Some join and audit tables are intentionally lean.

## PostgreSQL Enums

| Enum | Values | Used For |
| --- | --- | --- |
| `user_role` | `admin`, `management`, `operator` | Application roles for backend authorization and user management. |
| `source_app` | `POS`, `Tableside` | Identifies which frontend created an order or ticket. |
| `order_status` | `Sent`, `Printed` | Current lifecycle state for orders and kitchen tickets. |
| `menu_item_type` | `fixed`, `composable` | Distinguishes fixed-price items from items with selectable options. |
| `pricing_strategy` | `sum_options`, `any_selected`, `first_and_additional`, `per_selected` | Defines how an option group affects price. |
| `printer_transport_type` | `mock`, `network`, `system` | Defines how a printer should be reached. Only `mock` is implemented today. |

## Relationship Overview

- One `users` row can own many `sessions` rows and many `orders` rows.
- One `kitchen_areas` row can own many `printers`, `menu_categories`, `menu_items`, `order_items`, and `kitchen_tickets` rows.
- One `menu_categories` row can own many `menu_items` rows.
- One `menu_items` row can own many `menu_item_option_groups` rows.
- One `menu_item_option_groups` row can own many `menu_item_options` rows.
- One `orders` row can own many `order_items` rows and many `kitchen_tickets` rows.
- One `order_items` row can own many `order_item_selections` rows and can appear on one `kitchen_ticket_items` row.
- One `kitchen_tickets` row can own many `kitchen_ticket_items` rows and many `ticket_delivery_attempts` rows.
- Ticket routing is kitchen-area based. `menu_items.kitchen_area_id` can override the category kitchen area; if it is null, the category kitchen area is used.
- The visible order reference is the `orders.id` value.

## Table Reference

### Auth And Sessions

#### `users`

Stores application-managed user accounts. Users are disabled rather than hard-deleted in normal product behavior, and disabling a user immediately revokes active sessions.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal user identifier. |
| `username` | `text` | Not null, unique | Login name and display name base for operators and admins. |
| `password_hash` | `text` | Not null | Stores the Argon2 password hash, never the plain password. |
| `role` | `user_role` | Not null, default `operator` | Stores the backend authorization role. |
| `is_enabled` | `boolean` | Not null, default `true` | Controls whether the account is allowed to authenticate and use the system. |
| `disabled_at` | `timestamp with time zone` | Nullable | Records when the account was disabled. |
| `created_at` | `timestamp with time zone` | Not null, default `now()` | Creation timestamp. |
| `updated_at` | `timestamp with time zone` | Not null, default `now()` | Last update timestamp. |

Relationship notes:

- Referenced by `sessions.user_id`.
- Referenced by `orders.created_by_user_id`.
- The `username` value is also copied into order and ticket snapshot columns so historical records still show who inserted them.

#### `sessions`

Stores server-side login sessions. The cookie sent to the browser maps to a hashed token stored here, not to a raw token value.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal session identifier. |
| `user_id` | `integer` | Not null, foreign key to `users.id`, delete cascade | Links the session to the owning user. |
| `session_token_hash` | `text` | Not null, unique | Stores the SHA-256 hash of the opaque session token. |
| `expires_at` | `timestamp with time zone` | Not null | Absolute session expiry time. |
| `revoked_at` | `timestamp with time zone` | Nullable | Set when the session is manually revoked, logged out, or invalidated because the user was disabled. |
| `last_seen_at` | `timestamp with time zone` | Not null, default `now()` | Tracks the last successful use of the session. |
| `user_agent` | `text` | Nullable | Stores the browser or client user agent when available. |
| `ip_address` | `text` | Nullable | Stores the client IP address when available. |
| `created_at` | `timestamp with time zone` | Not null, default `now()` | Creation timestamp for the session record. |

Relationship notes:

- Many sessions can belong to one user.
- Expired sessions are cleaned up periodically by backend maintenance.

### Kitchen And Menu Configuration

#### `kitchen_areas`

Defines the operational kitchen stations or production areas used for routing menu items and tickets, such as kitchen, fryer, or bar.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal kitchen area identifier. |
| `name` | `text` | Not null, unique | Human-readable kitchen area name. |
| `sort_order` | `integer` | Not null, default `0` | Controls display order in management and read models. |
| `is_active` | `boolean` | Not null, default `true` | Controls whether the kitchen area can be used for active menu routing. |
| `created_at` | `timestamp with time zone` | Not null, default `now()` | Creation timestamp. |
| `updated_at` | `timestamp with time zone` | Not null, default `now()` | Last update timestamp. |

Relationship notes:

- Referenced by `printers.kitchen_area_id`.
- Referenced by `menu_categories.kitchen_area_id`.
- Optionally referenced by `menu_items.kitchen_area_id`.
- Referenced by `order_items.kitchen_area_id` and `kitchen_tickets.kitchen_area_id`.

#### `printers`

Stores the printer endpoints configured for each kitchen area. A printer has a transport type and a JSON configuration payload used by the delivery layer.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal printer identifier. |
| `kitchen_area_id` | `integer` | Not null, foreign key to `kitchen_areas.id`, delete restrict | Assigns the printer to a kitchen area. |
| `name` | `text` | Not null, unique | Human-readable printer name. |
| `transport_type` | `printer_transport_type` | Not null, default `mock` | Chooses the delivery transport implementation. |
| `connection_config_json` | `jsonb` | Not null, default `{}` | Transport-specific configuration such as mock settings or future network/system settings. |
| `is_enabled` | `boolean` | Not null, default `true` | Controls whether the printer can be selected for new tickets. |
| `created_at` | `timestamp with time zone` | Not null, default `now()` | Creation timestamp. |
| `updated_at` | `timestamp with time zone` | Not null, default `now()` | Last update timestamp. |

Relationship notes:

- One kitchen area can have multiple printers.
- `kitchen_tickets.printer_id` points to the assigned printer, but that reference can become null if the printer row is removed.
- `ticket_delivery_attempts.printer_id` keeps the printer used for a delivery attempt when available.

#### `menu_categories`

Groups menu items inside a kitchen area. Categories are the main menu sections shown to operators, for example panini, fritti, or birre.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal menu category identifier. |
| `kitchen_area_id` | `integer` | Not null, foreign key to `kitchen_areas.id`, delete restrict | Assigns the whole category to a kitchen area. |
| `name` | `text` | Not null | Category name. |
| `sort_order` | `integer` | Not null, default `0` | Controls category ordering. |
| `is_active` | `boolean` | Not null, default `true` | Controls whether the category is available for active ordering. |
| `created_at` | `timestamp with time zone` | Not null, default `now()` | Creation timestamp. |
| `updated_at` | `timestamp with time zone` | Not null, default `now()` | Last update timestamp. |

Relationship notes:

- Unique by the pair `kitchen_area_id` and `name`.
- Parent table for `menu_items`.

#### `menu_items`

Stores sellable menu entries. Items can be fixed-price products or composable products with option groups.

Short note: the current seeded and observed data leaves `kitchen_area_id` null on menu items, so routing currently inherits from `menu_categories.kitchen_area_id`. The column is still kept on `menu_items` as an optional per-item override for future exceptions where a single item in a category may need different kitchen routing.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal menu item identifier. |
| `category_id` | `integer` | Not null, foreign key to `menu_categories.id`, delete restrict | Parent menu category for the item. |
| `kitchen_area_id` | `integer` | Nullable, foreign key to `kitchen_areas.id`, delete set null | Optional routing override for the item. If null, the category kitchen area is used. |
| `name` | `text` | Not null | Menu item name shown to operators. |
| `item_type` | `menu_item_type` | Not null, default `fixed` | Marks the item as fixed-price or composable. |
| `base_price_cents` | `integer` | Not null, default `0` | Base item price before option adjustments. |
| `is_active` | `boolean` | Not null, default `true` | Controls whether the item can be ordered. |
| `sort_order` | `integer` | Not null, default `0` | Controls item ordering inside the category. |
| `created_at` | `timestamp with time zone` | Not null, default `now()` | Creation timestamp. |
| `updated_at` | `timestamp with time zone` | Not null, default `now()` | Last update timestamp. |

Relationship notes:

- Unique by the pair `category_id` and `name`.
- Parent table for `menu_item_option_groups`.
- Referenced by `order_items.menu_item_id`, but that order reference is nullable so old order lines remain valid even if the menu item changes or is deleted.

#### `menu_item_option_groups`

Defines selectable groups for a composable menu item, for example meats, cheeses, or vegetables, including the pricing rule for the group.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal option group identifier. |
| `menu_item_id` | `integer` | Not null, foreign key to `menu_items.id`, delete cascade | Parent menu item. |
| `name` | `text` | Not null | Human-readable option group name. |
| `code` | `text` | Not null | Stable machine-oriented key inside the menu item. |
| `min_select` | `integer` | Not null, default `0` | Minimum number of options that must be selected from this group. |
| `max_select` | `integer` | Not null, default `1` | Maximum number of options that can be selected from this group. |
| `pricing_strategy` | `pricing_strategy` | Not null, default `sum_options` | Pricing rule used to interpret the delta columns. |
| `first_selected_delta_cents` | `integer` | Nullable | Price delta for the first selection when using `first_and_additional`. |
| `additional_selected_delta_cents` | `integer` | Nullable | Price delta for each extra selection when using `first_and_additional`. |
| `any_selected_delta_cents` | `integer` | Nullable | Single price delta applied once when at least one option is chosen and the strategy is `any_selected`. |
| `per_selected_delta_cents` | `integer` | Nullable | Price delta applied per selected option when the strategy is `per_selected`. |
| `sort_order` | `integer` | Not null, default `0` | Controls option group ordering on the menu item. |
| `is_active` | `boolean` | Not null, default `true` | Controls whether the option group participates in validation and pricing. |

Relationship notes:

- Unique by the pair `menu_item_id` and `code`.
- Parent table for `menu_item_options`.
- This table intentionally has no `created_at` or `updated_at` columns.

#### `menu_item_options`

Stores the individual selectable values inside an option group, for example `porchetta`, `salsiccia`, or `funghi`.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal option identifier. |
| `option_group_id` | `integer` | Not null, foreign key to `menu_item_option_groups.id`, delete cascade | Parent option group. |
| `name` | `text` | Not null | Human-readable option name. |
| `code` | `text` | Not null | Stable machine-oriented option key inside the group. |
| `default_delta_cents` | `integer` | Not null, default `0` | Default per-option delta, used directly for `sum_options` and available as base metadata for other strategies. |
| `sort_order` | `integer` | Not null, default `0` | Controls option ordering inside the group. |
| `is_active` | `boolean` | Not null, default `true` | Controls whether the option can be selected. |

Relationship notes:

- Unique by the pair `option_group_id` and `code`.
- This table intentionally has no `created_at` or `updated_at` columns.

### Orders And Printing

#### `orders`

Stores the order header. This is the root record for a submitted order, and its `id` is the visible order reference shared by all split kitchen tickets.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal order identifier and visible order reference. |
| `created_by_user_id` | `integer` | Not null, foreign key to `users.id`, delete restrict | Links the order to the current user account. |
| `created_by_username_snapshot` | `text` | Not null | Stores the username at order time so history remains readable even if the user is renamed or disabled. |
| `source_app` | `source_app` | Not null | Stores whether the order came from POS or Tableside. |
| `table_number` | `integer` | Not null | Stores the customer table number. |
| `status` | `order_status` | Not null, default `Sent` | Aggregate order state. The order becomes `Printed` only when all related kitchen tickets are printed. |
| `created_at` | `timestamp with time zone` | Not null, default `now()` | Creation timestamp. |
| `updated_at` | `timestamp with time zone` | Not null, default `now()` | Last update timestamp. |
| `printed_at` | `timestamp with time zone` | Nullable | Stores the effective print completion time when the full order becomes printed. |

Relationship notes:

- Parent table for `order_items`.
- Parent table for `kitchen_tickets`.

#### `order_items`

Stores the individual order lines that belong to an order. Each row captures the resolved kitchen area and the final price snapshot used when the order was submitted.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal order item identifier. |
| `order_id` | `integer` | Not null, foreign key to `orders.id`, delete cascade | Parent order. |
| `menu_item_id` | `integer` | Nullable, foreign key to `menu_items.id`, delete set null | Optional link back to the menu item definition. |
| `kitchen_area_id` | `integer` | Not null, foreign key to `kitchen_areas.id`, delete restrict | Stores the effective kitchen area used for routing this line. |
| `display_name_snapshot` | `text` | Not null | Stores the item name as submitted. |
| `quantity` | `integer` | Not null, default `1` | Quantity ordered for this line. |
| `unit_price_cents` | `integer` | Not null | Final unit price used for the line. |
| `line_total_cents` | `integer` | Not null | Total price for the line, including quantity and option pricing. |
| `created_at` | `timestamp with time zone` | Not null, default `now()` | Creation timestamp for the line. |

Relationship notes:

- Parent table for `order_item_selections`.
- Referenced by `kitchen_ticket_items.order_item_id`.
- The snapshot fields keep the order readable even if the source menu item is later edited or removed.

#### `order_item_selections`

Stores the selected options for an order item. This table is a historical snapshot of the actual chosen configuration, not a live pointer back to menu option definitions.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal selection identifier. |
| `order_item_id` | `integer` | Not null, foreign key to `order_items.id`, delete cascade | Parent order item. |
| `option_group_name_snapshot` | `text` | Not null | Stores the option group name as it appeared when ordered. |
| `option_name_snapshot` | `text` | Not null | Stores the selected option name as it appeared when ordered. |
| `price_delta_cents` | `integer` | Not null, default `0` | Stores the final price effect of this selected option. |
| `sort_order` | `integer` | Not null, default `0` | Preserves the display order of selections. |

Relationship notes:

- Many selections can belong to one order item.
- This table intentionally has no timestamps because it only exists as historical order detail.

#### `kitchen_tickets`

Stores the kitchen tickets created from an order. The backend creates one ticket per order and kitchen area pair, so a single order can be split across multiple kitchen printers.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal kitchen ticket identifier. |
| `order_id` | `integer` | Not null, foreign key to `orders.id`, delete cascade | Parent order. |
| `kitchen_area_id` | `integer` | Not null, foreign key to `kitchen_areas.id`, delete restrict | Kitchen area served by this ticket. |
| `printer_id` | `integer` | Nullable, foreign key to `printers.id`, delete set null | Assigned printer for the ticket, if one was available when the order was created. |
| `inserted_by_username_snapshot` | `text` | Not null | Username copied onto the ticket for kitchen visibility. |
| `source_app` | `source_app` | Not null | Records whether the ticket came from POS or Tableside. |
| `table_number` | `integer` | Not null | Customer table number shown on the ticket. |
| `status` | `order_status` | Not null, default `Sent` | Ticket delivery state. |
| `created_at` | `timestamp with time zone` | Not null, default `now()` | Creation timestamp. |
| `printed_at` | `timestamp with time zone` | Nullable | Set when the ticket is successfully printed or manually marked as printed. |
| `payload_json` | `jsonb` | Nullable, default `{}` | Stores the printer-facing snapshot payload built after the ticket items are created. |

Relationship notes:

- Unique by the pair `order_id` and `kitchen_area_id`.
- Parent table for `kitchen_ticket_items`.
- Parent table for `ticket_delivery_attempts`.
- This table is the center of printer routing and retry behavior.

#### `kitchen_ticket_items`

Maps the order items that belong on a specific kitchen ticket. Because a ticket is already scoped to one kitchen area, this table identifies the exact subset of order lines printed on that ticket.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal ticket-item identifier. |
| `kitchen_ticket_id` | `integer` | Not null, foreign key to `kitchen_tickets.id`, delete cascade | Parent kitchen ticket. |
| `order_item_id` | `integer` | Not null, foreign key to `order_items.id`, delete cascade | Linked order item included on the ticket. |
| `display_name_snapshot` | `text` | Not null | Stores the item name as shown on the ticket. |
| `quantity` | `integer` | Not null, default `1` | Quantity shown on the ticket for that line. |
| `sort_order` | `integer` | Not null, default `0` | Preserves print order of lines inside the ticket. |

Relationship notes:

- Unique by the pair `kitchen_ticket_id` and `order_item_id`.
- This table intentionally has no timestamps because it is a ticket composition table.

#### `ticket_delivery_attempts`

Stores the audit trail for every attempt to deliver a kitchen ticket to a printer. It is used for diagnostics, retry flows, and manual follow-up.

Short note: this table records real delivery executions, both during automatic delivery right after order creation and during manual retry actions. It is a delivery history table, not the source of truth for current ticket state: the current state remains on `kitchen_tickets.status` and `orders.status`.

| Column | Type | Notes | What It Does |
| --- | --- | --- | --- |
| `id` | `integer` | Primary key, identity | Internal delivery-attempt identifier. |
| `kitchen_ticket_id` | `integer` | Not null, foreign key to `kitchen_tickets.id`, delete cascade | Ticket that was being delivered. |
| `printer_id` | `integer` | Nullable, foreign key to `printers.id`, delete set null | Printer targeted by the attempt, if any. |
| `attempted_at` | `timestamp with time zone` | Not null, default `now()` | When the attempt happened. |
| `success` | `boolean` | Not null | Whether the delivery succeeded. |
| `error_message` | `text` | Nullable | Failure reason when delivery fails. |
| `raw_response_json` | `jsonb` | Nullable | Transport-specific payload returned by the delivery layer, such as mock printer output metadata. |

Relationship notes:

- Many attempts can belong to one kitchen ticket.
- Successful attempts are what drive the automatic transition from `Sent` to `Printed` on tickets and eventually on the parent order.

## Practical Summary

At a high level, the schema works like this:

1. `users` and `sessions` handle login and revocation.
2. `kitchen_areas`, `printers`, `menu_categories`, `menu_items`, `menu_item_option_groups`, and `menu_item_options` define what can be sold and where it should be produced.
3. `orders`, `order_items`, and `order_item_selections` capture the submitted order as immutable historical data.
4. `kitchen_tickets`, `kitchen_ticket_items`, and `ticket_delivery_attempts` split the order into kitchen-specific tickets and track printing outcomes.

That model keeps menu configuration flexible while preserving a stable historical record of what was ordered, who inserted it, which app inserted it, which table it belonged to, and how each kitchen ticket was delivered.