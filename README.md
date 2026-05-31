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