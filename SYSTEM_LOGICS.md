# FoodOrders System Logics

This document collects implementation and behavior notes that explain why some parts of the software work the way they do. It complements `README.md` and `DATABASE.md`: those files describe the product and the schema, while this file explains the current runtime logic behind specific features.

## Ticket Delivery Attempts

### What `ticket_delivery_attempts` is

`ticket_delivery_attempts` is an append-only audit table for kitchen-ticket delivery. It is not a queue and it is not the source of truth for current ticket state.

Each row means:

- the backend tried to deliver one kitchen ticket
- the attempt happened at a specific timestamp
- the attempt either succeeded or failed
- if it failed, the table stores the reason
- if the transport returned useful metadata, the table stores it in `raw_response_json`

The current state of a ticket still lives in `kitchen_tickets.status`, and the aggregate order state still lives in `orders.status`.

### How the flow works

When a new order is created, the backend first writes the order, order items, selections, kitchen tickets, and kitchen ticket items. After that, it immediately tries to deliver every ticket that is still in `Sent` state.

The delivery logic then checks the ticket and its assigned printer:

1. If the ticket does not exist, the operation returns `null`.
2. If the ticket is already `Printed`, the operation returns early and does not create a new delivery-attempt row.
3. If no printer is assigned, the attempt fails.
4. If the assigned printer is disabled, the attempt fails.
5. If the printer transport is `mock`, the backend simulates delivery:
   - if `connection_config_json.forceFailure` is `true`, the attempt fails
   - otherwise the attempt succeeds and a mock response payload is stored
6. If the printer transport is `network` or `system`, the attempt currently fails because those transports are still placeholders.
7. After the result is known, the backend inserts one row into `ticket_delivery_attempts`.
8. If the attempt succeeded, the kitchen ticket is marked as `Printed`.
9. The backend then recomputes the parent order status: the order becomes `Printed` only when all of its kitchen tickets are `Printed`.

### Why this table exists separately from `kitchen_tickets`

The separation is intentional:

- `kitchen_tickets` stores the current state of the ticket
- `ticket_delivery_attempts` stores the history of what happened while trying to deliver it

That distinction is useful because one ticket can have multiple failures and then later succeed. If that history were stored only on the ticket row, earlier failures would be lost.

### How it is currently used

Today the table is written in two main situations:

1. Automatic delivery immediately after order creation.
2. Manual retry actions triggered by management users.

There are two retry entry points in the backend:

- retry all pending tickets for one order
- retry a single kitchen ticket

The read model then loads delivery attempts and exposes them together with ticket details, ordered from newest to oldest. That means the API can show the full recent delivery history for each ticket.

### What is not recorded here

This table only records actual delivery executions.

- If a ticket is already printed and a retry is attempted, no new attempt row is created.
- If a manager manually marks a ticket as printed, the ticket status changes, but that manual action does not create a `ticket_delivery_attempts` row because no delivery execution happened.

### Current operational context

Right now this table is especially important because only the `mock` transport can succeed.

- `mock` can succeed normally
- `mock` can also be forced to fail with `{"forceFailure": true}` in the printer JSON configuration
- `network` and `system` are not implemented yet, so they currently produce failed delivery attempts by design

The POS management UI already reflects this behavior:

- it warns that `network` and `system` are placeholders
- it suggests `{"forceFailure": true}` as a way to simulate a mock printer failure

So in the current version of FoodOrders, `ticket_delivery_attempts` is the main operational history for understanding why a ticket remained `Sent`, why a retry was needed, and what happened during mock or placeholder printer delivery.

### Practical summary

In one sentence:

`ticket_delivery_attempts` tells the story of delivery attempts, while `kitchen_tickets` tells the current truth about the ticket, and `orders` tells the current truth about the whole order.