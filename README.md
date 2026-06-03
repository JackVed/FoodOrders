# FoodOrders

FoodOrders is a small fair-ordering system with a desktop POS app, a mobile-first Tableside app, and a shared backend API.

## Authentication

- Default authentication is first-party username and password with app-managed user accounts.
- Passwords should be hashed with Argon2id.
- Authentication should use server-side sessions stored in PostgreSQL, with an opaque session id in a secure, HttpOnly cookie.
- Authorization should be enforced in the backend with the built-in `admin`, `management`, and `operator` roles.
- Disabling a user must immediately revoke access by invalidating active sessions.

## Hosting And Session Notes

- Prefer hosting the POS app, Tableside app, and API on the same site under one parent domain, for example `pos.foodorders.local`, `tableside.foodorders.local`, and `api.foodorders.local`.
- This keeps cookie-based authentication reliable across the apps and avoids common cross-site cookie failures on mobile browsers.
- CORS still needs to allow credentialed requests from the frontend origins even when those origins are same-site subdomains.
- Session records should be cleaned up periodically by deleting expired rows from the session store.

## Local Development

From the repository root, install dependencies once:

```powershell
pnpm install
```

Before starting the apps, make sure a local PostgreSQL instance is running.

Create `backend/.env.local` from `backend/.env.example` and fill in the required database and admin values. A simple local setup can use:

```env
NODE_ENV=development
HOST=0.0.0.0
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=food_orders_db
DATABASE_USER=postgres
DATABASE_PASSWORD=admin
DATABASE_SSL=false
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
```

Apply the database schema:

```powershell
pnpm --filter @foodorders/backend db:migrate
```

Seed the local database:

```powershell
pnpm --filter @foodorders/backend db:seed
```

The seed creates or updates:

- the bootstrap `admin` user from `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- three kitchen areas: `Cucina`, `Friggitrice`, and `Bar`
- one enabled mock printer for each kitchen area
- the canonical menu categories and fixed-price items
- the composable `Panino` and `Piadina` items with their meats, cheese, and vegetables option groups

Start each app in its own terminal, still from the repository root:

1. Backend API:

```powershell
pnpm --filter @foodorders/backend dev
```

2. POS app:

```powershell
pnpm dev:pos
```

3. Tableside app:

```powershell
pnpm dev:tableside
```

Local URLs:

- Backend API: `http://localhost:3000`
- POS app: `http://localhost:5173`
- Tableside app: `http://localhost:5174`

The POS and Tableside frontends already use `http://localhost:3000` as the default API base URL, so no extra frontend env setup is needed if the backend runs on the default port.

## Backend Scope Implemented

- Cookie-session authentication with `admin`, `management`, and `operator` backend authorization.
- User management APIs with immediate session revocation when an account is disabled.
- Management CRUD for kitchen areas, printers, menu categories, menu items, option groups, and options.
- Server-side order validation and pricing for `sum_options`, `any_selected`, `first_and_additional`, and `per_selected` option-group strategies.
- Transactional order creation with order items, selection snapshots, kitchen ticket splitting by kitchen area, and ticket payload snapshots.
- Mock printer delivery support with delivery-attempt tracking. `network` and `system` printer transports are registered as placeholders and currently record a failed attempt until a concrete integration is implemented.
- Read and operational APIs for orders and kitchen tickets, including manual retry and manual mark-printed flows.

## Backend API Overview

- Authentication: `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- Menu read: `/api/menu`
- User management: `/api/users`, `/api/users/:id`, `/api/users/:id/password`
- Orders: `/api/orders`, `/api/orders/:id`, `/api/orders/:id/retry-delivery`
- Kitchen tickets: `/api/kitchen-tickets`, `/api/kitchen-tickets/:id`, `/api/kitchen-tickets/:id/retry-delivery`, `/api/kitchen-tickets/:id/mark-printed`
- Management configuration: `/api/management/configuration` plus CRUD routes for kitchen areas, printers, categories, items, option groups, and options

## To Do

- Implement real kitchen-printer delivery for `network` and/or `system` transports. Today only `mock` can deliver successfully.
- Decide whether order submission must be blocked when no enabled printer is configured for a kitchen area. Today the backend can still create kitchen tickets with `printerId = null`, which requires manual operator attention.

## Notes

- Default bootstrap credentials come from `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Change them before running outside local development.
- The backend loads `.env.local` and then `.env` only in development and test. Release environments should inject environment variables at runtime and should not rely on env files on disk.
- Drizzle CLI uses the same backend config loader as the app, so migrations and the running server resolve the same database settings.
- If `CORS_ORIGINS` is empty, development and test environments allow browser origins by default, while production expects explicit allowed origins.
- Session cleanup runs periodically based on `SESSION_CLEANUP_INTERVAL_MINUTES` and deletes expired session rows.