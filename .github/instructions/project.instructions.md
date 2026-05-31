---
name: Project Functional Context
description: "Always-on FoodOrders product context. Use for all FoodOrders tasks, especially product behavior, user workflows, business rules, acceptance criteria, and feature scope."
applyTo: "**"
---

# FoodOrders Product Context

Use this file for stable product behavior and scope.
Use [technical instructions](../copilot-instructions.md) for architecture, implementation, tooling, and coding conventions.

If product behavior is unclear, ask the user for the missing rule instead of inventing it.

## Project Summary

- FoodOrders is a hobby app for managing food orders during a fair.
- The project is expected to serve about 20 users.
- The expected load is about 300 new records per day, concentrated in about 5 days per year.
- Optimize for operational simplicity and reliability during fair days rather than enterprise breadth.

## Frontend Apps

- The POS app is desktop-only.
- The Tableside app is mobile-first.
- Both the POS app and the Tableside app can create food orders that must become kitchen tickets.
- The Tableside app scope is intentionally narrow: create food orders and view food orders that were already sent.
- Management and administration features live in the POS app.

## Language

- User-facing labels and interface text are Italian only.
- Do not assume multi-language support unless the user asks for it.

## Roles

- `admin`: can do everything `management` can do and can also disable users of any role.
- `management`: can do everything `operator` can do and can also manage menu items, prices, users, access, and printers. Management can disable `operator` users, but not other `management` users or `admin` users.
- `operator`: can create food orders and view food orders already sent.
- Users are never hard-deleted. User removal is handled by disabling accounts.

## Order And Ticket Behavior

- Payment is out of scope because a separate system handles it.
- Orders become kitchen tickets immediately when they are sent from the POS app or the Tableside app.
- Printer routing is by kitchen area or category.
- A single order can split across multiple printers by item.
- Each printer ticket must contain only the items relevant to that kitchen area.
- Each printer ticket must include the user name that inserted the order, the table number, and whether the order was inserted from the POS app or the Tableside app.
- All split tickets from the same order must share the same visible order number or reference.
- The visible order number or reference is the standard PostgreSQL auto-incrementing integer for the order record.
- Current known order states are `Sent` and `Printed`.
- Do not assume cancellation or reprint behavior for the first version.
- Do not invent additional kitchen-progress states unless the user asks for them.

## Product Scope

- The core goal is to let operators, management, or admins enter orders without manually telling kitchen staff what to cook.
- The app must support menu and price management.
- The app must support user and access management.
- The app must support printer management.
- Prefer straightforward CRUD-oriented workflows and explicit statuses.
- Keep features small and easy to operate by a single hobby maintainer.

## Scope Boundaries

- Do not invent payment workflows, discounts, delivery flows, reservations, accounting features, cancellation flows, or reprint flows unless the user asks for them.
- Treat missing business rules as open questions to clarify with the user.