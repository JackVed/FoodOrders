# FoodOrders Technical Guidance

This workspace is building FoodOrders, a small fair-ordering system with two frontend apps and a shared backend.
Use [product context](./instructions/project.instructions.md) for workflow, role, and scope rules.

## Stack Direction

- Frontend direction: React with TypeScript.
- Frontend build tool: Vite.
- Frontend router: React Router.
- Frontend server-state library: TanStack Query.
- Frontend form stack: React Hook Form with Zod validation.
- Frontend UI baseline: shadcn/ui.
- Backend direction: Node.js with TypeScript.
- Backend HTTP framework: Fastify.
- Backend schema validation: Zod.
- Backend ORM/query layer: Drizzle ORM.
- Backend logging: Pino.
- Backend test runner: Vitest.
- Backend integration-test infrastructure: Testcontainers.
- Database direction: PostgreSQL.
- Background job strategy for durable print work: pg-boss on PostgreSQL when asynchronous printer delivery is needed.
- Package manager: pnpm.
- Monorepo/workspace tool: pnpm workspaces.
- The current local database name is `food_orders_db`.
- Use the selected frontend stack by default unless the user explicitly asks to revisit a choice.
- Development starts locally and deploys to the cloud. Keep deployment guidance provider-neutral unless the user chooses a cloud platform.

## Repository And Architecture Assumptions

- Keep the architecture simple and modular.
- Assume a shared backend API and shared data model for the POS app and the Tableside app unless the repository later says otherwise.
- Keep POS and Tableside concerns separated even when they share backend logic.
- Treat kitchen printing as a core domain capability, not as an afterthought.
- Isolate printer transport behind an adapter so the domain stays unchanged whether printers connect over Wi-Fi or cable.
- Model printer routing so a single order can split across multiple kitchen tickets by item while preserving a shared order reference.
- Model printer ticket data so each ticket carries the shared order reference, the inserted-by user name, the table number, and the source app (`POS` or `Tableside`).
- Use the order table's PostgreSQL auto-incrementing integer column as the shared visible ticket or order reference unless the user asks for a different numbering scheme.
- Prefer explicit domain models for orders, order items, menu items, kitchen areas or stations, printers, users, and roles such as `admin`, `management`, and `operator`.
- Model user lifecycle around disable/enable behavior rather than hard deletes.
- Keep administration and configuration concerns in the POS side of the system.

## Implementation Guidance

- Default to TypeScript across frontend and backend.
- Favor clarity, maintainability, and reliability over scale-driven complexity.
- Avoid premature microservices, event buses, or heavy infrastructure.
- Prefer Fastify plugins, route modules, and explicit services over heavier framework patterns unless the project requirements change.
- Prefer Drizzle ORM to keep SQL and database behavior explicit, especially around orders, ticket splitting, and printer routing.
- Use Zod as the default validation layer for backend inputs, outputs, and shared contracts.
- Use pg-boss only when printer execution or other work must be retried or decoupled from request handling; do not introduce extra infrastructure such as Redis unless there is a clear need.
- For libraries outside the selected frontend stack, present a small set of options and explain the tradeoffs before committing.
- Keep mobile-first constraints in mind for the Tableside app.
- Keep desktop efficiency in mind for the POS app.
- Use React Router for app navigation instead of introducing a heavier full-stack framework by default.
- Use TanStack Query for backend data fetching, caching, and mutation state in the frontend apps.
- Use React Hook Form and Zod for forms and validation unless the user asks for a simpler alternative.
- Use shadcn/ui as the base component system and adapt its components to the project's design and workflow needs.
- Treat shared schemas, API contracts, and reusable frontend utilities as good candidates for workspace packages when they are used by more than one app.
- Prefer a documented REST JSON API between frontend apps and backend unless the user asks to revisit that choice.
- Keep user-facing labels and UI copy Italian-only unless the user explicitly asks for localization.
- Do not add multi-language infrastructure or translation layers unless the user asks for them.
- Assume the apps operate online. Do not design for offline-first sync, queued local mutations, or disconnected workflows unless the user asks for them.
- Default to long-lived authenticated sessions of about 7 days so operators and waiters are not forced to log in repeatedly during operations.
- Payment integration is out of scope and should not drive the design.
- Cancellation and reprint behavior are out of scope for the first version unless the user asks for them.
- Add brief code comments where they help explain non-obvious logic or business rules, especially around ticket splitting, printer routing, or POS versus Tableside behavior.

## Working Style For Copilot

- Ask for missing operational details instead of inventing them.
- Good examples of details to clarify are printer failure handling, exact authentication flow, printer protocol or vendor specifics, and any remaining library choices.
- If MCP tools, database access, or browser automation are needed, tell the user what is needed and how to provide or enable it.
- If a shadcn/ui MCP server is configured, use it when working on shadcn/ui components or patterns so generated UI stays aligned with the upstream component guidance.
- Do not assume Azure, Playwright, or database MCP access is already configured just because the project may use those tools later.
- Keep changes aligned with the current early-stage repository and avoid scaffolding more than the task requires.
