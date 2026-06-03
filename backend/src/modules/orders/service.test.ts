import { fileURLToPath } from "node:url";

import { asc, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { getConfig } from "../../config/env.js";
import { createDbConnection, type DbConnection } from "../../db/client.js";
import {
  kitchenAreas,
  kitchenTicketItems,
  kitchenTickets,
  menuCategories,
  menuItemOptionGroups,
  menuItemOptions,
  menuItems,
  orderItemSelections,
  orderItems,
  orders,
  printers,
  sessions,
  ticketDeliveryAttempts,
  users,
} from "../../db/schema/index.js";
import type { AuthenticatedUser } from "../auth/session.js";
import { hashPassword } from "../auth/password.js";
import { createOrder } from "./service.js";

const migrationsFolder = fileURLToPath(new URL("../../../drizzle", import.meta.url));

function expectDefined<T>(value: T | undefined, message: string) {
  expect(value, message).toBeDefined();
  return value as T;
}

async function resetDatabase(db: DbConnection["db"]) {
  await db.delete(ticketDeliveryAttempts);
  await db.delete(kitchenTicketItems);
  await db.delete(kitchenTickets);
  await db.delete(orderItemSelections);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(sessions);
  await db.delete(users);
  await db.delete(menuItemOptions);
  await db.delete(menuItemOptionGroups);
  await db.delete(menuItems);
  await db.delete(menuCategories);
  await db.delete(printers);
  await db.delete(kitchenAreas);
}

async function createFixture(db: DbConnection["db"]) {
  const operatorPassword = "operatore-test";
  const managementPassword = "gestione-test";
  const operatorPasswordHash = await hashPassword(operatorPassword);
  const managementPasswordHash = await hashPassword(managementPassword);

  const operatorUser = expectDefined(
    (
      await db
        .insert(users)
        .values({
          username: "operatore-test",
          passwordHash: operatorPasswordHash,
          role: "operator",
          isEnabled: true,
          disabledAt: null,
        })
        .returning({
          id: users.id,
          username: users.username,
          role: users.role,
        })
    )[0],
    "Missing operator test user.",
  );

  const managementUser = expectDefined(
    (
      await db
        .insert(users)
        .values({
          username: "gestione-test",
          passwordHash: managementPasswordHash,
          role: "management",
          isEnabled: true,
          disabledAt: null,
        })
        .returning({
          id: users.id,
          username: users.username,
          role: users.role,
        })
    )[0],
    "Missing management test user.",
  );

  const areaRows = await db
    .insert(kitchenAreas)
    .values([
      { name: "Cucina test", sortOrder: 1, isActive: true },
      { name: "Bar test", sortOrder: 2, isActive: true },
    ])
    .returning({
      id: kitchenAreas.id,
      name: kitchenAreas.name,
    });
  const kitchenArea = expectDefined(areaRows[0], "Missing kitchen area.");
  const barArea = expectDefined(areaRows[1], "Missing bar area.");

  const printerRows = await db
    .insert(printers)
    .values([
      {
        kitchenAreaId: kitchenArea.id,
        name: "Stampante cucina test",
        transportType: "mock",
        connectionConfigJson: {},
        isEnabled: true,
      },
      {
        kitchenAreaId: barArea.id,
        name: "Stampante bar test",
        transportType: "mock",
        connectionConfigJson: {},
        isEnabled: true,
      },
    ])
    .returning({
      id: printers.id,
      kitchenAreaId: printers.kitchenAreaId,
      name: printers.name,
    });
  const kitchenPrinter = expectDefined(printerRows[0], "Missing kitchen printer.");
  const barPrinter = expectDefined(printerRows[1], "Missing bar printer.");

  const categoryRows = await db
    .insert(menuCategories)
    .values([
      {
        kitchenAreaId: kitchenArea.id,
        name: "Cucina categoria test",
        sortOrder: 1,
        isActive: true,
      },
      {
        kitchenAreaId: barArea.id,
        name: "Bar categoria test",
        sortOrder: 2,
        isActive: true,
      },
    ])
    .returning({
      id: menuCategories.id,
      kitchenAreaId: menuCategories.kitchenAreaId,
      name: menuCategories.name,
    });
  const kitchenCategory = expectDefined(categoryRows[0], "Missing kitchen category.");
  const barCategory = expectDefined(categoryRows[1], "Missing bar category.");

  const menuItemRows = await db
    .insert(menuItems)
    .values([
      {
        categoryId: kitchenCategory.id,
        kitchenAreaId: kitchenArea.id,
        name: "Panino test",
        itemType: "fixed",
        basePriceCents: 700,
        sortOrder: 1,
        isActive: true,
      },
      {
        categoryId: barCategory.id,
        kitchenAreaId: barArea.id,
        name: "Bibita test",
        itemType: "fixed",
        basePriceCents: 300,
        sortOrder: 1,
        isActive: true,
      },
    ])
    .returning({
      id: menuItems.id,
      kitchenAreaId: menuItems.kitchenAreaId,
      name: menuItems.name,
    });
  const kitchenItem = expectDefined(menuItemRows[0], "Missing kitchen menu item.");
  const barItem = expectDefined(menuItemRows[1], "Missing bar menu item.");

  return {
    operator: {
      id: operatorUser.id,
      username: operatorUser.username,
      role: operatorUser.role,
      sessionId: 0,
    } satisfies AuthenticatedUser,
    managementUser,
    managementPassword,
    kitchenArea,
    barArea,
    kitchenPrinter,
    barPrinter,
    kitchenItem,
    barItem,
  };
}

function getSessionCookie(response: { headers: Record<string, unknown> }) {
  const setCookieHeader = response.headers["set-cookie"];

  if (typeof setCookieHeader !== "string" && !Array.isArray(setCookieHeader)) {
    throw new Error("Missing session cookie in login response.");
  }

  const cookieHeader = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;

  if (!cookieHeader) {
    throw new Error("Missing session cookie in login response.");
  }

  return cookieHeader.split(";")[0];
}

describe.sequential("kitchen ticket integrity", () => {
  let connection: DbConnection;
  let app: FastifyInstance | null = null;

  beforeAll(async () => {
    connection = createDbConnection(getConfig());
    await migrate(connection.db, { migrationsFolder });
  });

  beforeEach(async () => {
    await resetDatabase(connection.db);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  afterAll(async () => {
    await resetDatabase(connection.db);
    await connection.sql.end();
  });

  it("creates tickets with same-area printers and persists ticket item order/area columns", async () => {
    const fixture = await createFixture(connection.db);
    const result = await createOrder(connection.db, fixture.operator, {
      sourceApp: "POS",
      tableNumber: 12,
      items: [
        { menuItemId: fixture.kitchenItem.id, quantity: 2, selections: [] },
        { menuItemId: fixture.barItem.id, quantity: 1, selections: [] },
      ],
    });

    const ticketRows = await connection.db
      .select({
        id: kitchenTickets.id,
        orderId: kitchenTickets.orderId,
        kitchenAreaId: kitchenTickets.kitchenAreaId,
        printerId: kitchenTickets.printerId,
      })
      .from(kitchenTickets)
      .where(eq(kitchenTickets.orderId, result.orderId))
      .orderBy(asc(kitchenTickets.id));

    expect(ticketRows).toHaveLength(2);

    const ticketByAreaId = new Map(ticketRows.map((row) => [row.kitchenAreaId, row]));
    expect(ticketByAreaId.get(fixture.kitchenArea.id)?.printerId).toBe(fixture.kitchenPrinter.id);
    expect(ticketByAreaId.get(fixture.barArea.id)?.printerId).toBe(fixture.barPrinter.id);

    const orderItemRows = await connection.db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        kitchenAreaId: orderItems.kitchenAreaId,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, result.orderId))
      .orderBy(asc(orderItems.id));

    const ticketItemRows = await connection.db
      .select({
        id: kitchenTicketItems.id,
        kitchenTicketId: kitchenTicketItems.kitchenTicketId,
        orderItemId: kitchenTicketItems.orderItemId,
        orderId: kitchenTicketItems.orderId,
        kitchenAreaId: kitchenTicketItems.kitchenAreaId,
      })
      .from(kitchenTicketItems)
      .where(eq(kitchenTicketItems.orderId, result.orderId))
      .orderBy(asc(kitchenTicketItems.id));

    expect(ticketItemRows).toHaveLength(2);

    const ticketById = new Map(ticketRows.map((row) => [row.id, row]));
    const orderItemById = new Map(orderItemRows.map((row) => [row.id, row]));

    for (const ticketItemRow of ticketItemRows) {
      const ticketRow = expectDefined(ticketById.get(ticketItemRow.kitchenTicketId), "Missing kitchen ticket.");
      const orderItemRow = expectDefined(orderItemById.get(ticketItemRow.orderItemId), "Missing order item.");

      expect(ticketItemRow.orderId).toBe(result.orderId);
      expect(ticketItemRow.orderId).toBe(ticketRow.orderId);
      expect(ticketItemRow.orderId).toBe(orderItemRow.orderId);
      expect(ticketItemRow.kitchenAreaId).toBe(ticketRow.kitchenAreaId);
      expect(ticketItemRow.kitchenAreaId).toBe(orderItemRow.kitchenAreaId);
    }
  });

  it("rejects raw kitchen ticket item inserts that cross kitchen areas or orders", async () => {
    const fixture = await createFixture(connection.db);
    const firstOrder = await createOrder(connection.db, fixture.operator, {
      sourceApp: "POS",
      tableNumber: 5,
      items: [
        { menuItemId: fixture.kitchenItem.id, quantity: 1, selections: [] },
        { menuItemId: fixture.barItem.id, quantity: 1, selections: [] },
      ],
    });

    const firstOrderTickets = await connection.db
      .select({
        id: kitchenTickets.id,
        orderId: kitchenTickets.orderId,
        kitchenAreaId: kitchenTickets.kitchenAreaId,
      })
      .from(kitchenTickets)
      .where(eq(kitchenTickets.orderId, firstOrder.orderId))
      .orderBy(asc(kitchenTickets.id));

    const firstOrderItems = await connection.db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        kitchenAreaId: orderItems.kitchenAreaId,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, firstOrder.orderId))
      .orderBy(asc(orderItems.id));

    const kitchenTicket = expectDefined(
      firstOrderTickets.find((ticket) => ticket.kitchenAreaId === fixture.kitchenArea.id),
      "Missing kitchen ticket for kitchen area.",
    );
    const barOrderItem = expectDefined(
      firstOrderItems.find((item) => item.kitchenAreaId === fixture.barArea.id),
      "Missing order item for bar area.",
    );

    await expect(
      connection.db.insert(kitchenTicketItems).values({
        kitchenTicketId: kitchenTicket.id,
        orderItemId: barOrderItem.id,
        orderId: firstOrder.orderId,
        kitchenAreaId: kitchenTicket.kitchenAreaId,
        displayNameSnapshot: "Inserimento area non valida",
        quantity: 1,
        sortOrder: 50,
      }),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({ code: "23503" }),
    });

    const secondOrder = await createOrder(connection.db, fixture.operator, {
      sourceApp: "POS",
      tableNumber: 6,
      items: [{ menuItemId: fixture.kitchenItem.id, quantity: 1, selections: [] }],
    });

    const secondOrderItem = expectDefined(
      (
        await connection.db
          .select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            kitchenAreaId: orderItems.kitchenAreaId,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, secondOrder.orderId))
          .limit(1)
      )[0],
      "Missing order item for second order.",
    );

    await expect(
      connection.db.insert(kitchenTicketItems).values({
        kitchenTicketId: kitchenTicket.id,
        orderItemId: secondOrderItem.id,
        orderId: firstOrder.orderId,
        kitchenAreaId: kitchenTicket.kitchenAreaId,
        displayNameSnapshot: "Inserimento ordine non valido",
        quantity: 1,
        sortOrder: 51,
      }),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({ code: "23503" }),
    });
  });

  it("rejects printer area reassignment when kitchen tickets still reference the printer", async () => {
    const fixture = await createFixture(connection.db);
    await createOrder(connection.db, fixture.operator, {
      sourceApp: "POS",
      tableNumber: 7,
      items: [{ menuItemId: fixture.kitchenItem.id, quantity: 1, selections: [] }],
    });

    app = buildApp();
    await app.ready();

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: fixture.managementUser.username,
        password: fixture.managementPassword,
      },
    });

    expect(loginResponse.statusCode).toBe(200);

    const response = await app.inject({
      method: "PATCH",
      url: `/api/management/printers/${fixture.kitchenPrinter.id}`,
      headers: {
        cookie: getSessionCookie(loginResponse),
      },
      payload: {
        kitchenAreaId: fixture.barArea.id,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "Non puoi spostare la stampante in un'altra area cucina finche esistono ticket che la referenziano.",
    });
  });

  it("allows printer area reassignment when the printer is not referenced by any ticket", async () => {
    const fixture = await createFixture(connection.db);

    app = buildApp();
    await app.ready();

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: fixture.managementUser.username,
        password: fixture.managementPassword,
      },
    });

    expect(loginResponse.statusCode).toBe(200);

    const response = await app.inject({
      method: "PATCH",
      url: `/api/management/printers/${fixture.kitchenPrinter.id}`,
      headers: {
        cookie: getSessionCookie(loginResponse),
      },
      payload: {
        kitchenAreaId: fixture.barArea.id,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.printer.kitchenAreaId).toBe(fixture.barArea.id);
  });
});