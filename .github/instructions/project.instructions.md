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

## Example Menu And Pricing Logic

- Use the following menu as a canonical example of how configurable food items and fixed-price items can coexist in the same menu.
- All the prices are in euros. We assume the currency is euros and do not add multi-currency support unless the user asks for it.
- Example menu categories and items:
	- Panini: compose your sandwich.
	- Piadine: compose your piadina.
	- Fried: patatine fritte piccole 4; patatine fritte grandi 6; nuggets 5.
	- Beers: birra pils piccola 3.5; birra pils grande 6; birra ipa piccola 4; birra ipa grande 7; birra helles piccola 4; birra helles grande 6.
	- Soft drinks: coca cola 4; tea 4; coffee 1.5.
	- Drinks: gin tonic 6; moscow mule 9; london mule 8.
- Panini pricing logic:
	- Base price: 5.
	- First meat: +1.00.
	- Each additional meat after the first: +1.50.
	- Cheese: +0.50.
	- Vegetables: +0.50 once if at least one vegetable is selected, regardless of how many vegetables are chosen.
- Piadine follow the same composition and pricing logic as panini.
- Example meat options for panini and piadine: cotto, porchetta, salsiccia.
- Example vegetable options for panini and piadine: cipolle, peperoni, funghi.
- Worked examples:
	- Panino with cotto + porchetta + cheese + peperoni = 8.5 because 5 + 1.0 + 1.5 + 0.5 + 0.5 = 8.5.
	- Panino with porchetta + cipolle + funghi = 6.5 because 5 + 1.0 + 0.5 = 6.5 and any number of vegetables still costs only 0.5.

## Scope Boundaries

- Do not invent payment workflows, discounts, delivery flows, reservations, accounting features, cancellation flows, or reprint flows unless the user asks for them.
- Treat missing business rules as open questions to clarify with the user.