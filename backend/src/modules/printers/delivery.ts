import { and, asc, eq, isNotNull } from "drizzle-orm";

import type { DatabaseClient } from "../../db/types.js";
import { kitchenAreas, kitchenTickets, orders, printers, ticketDeliveryAttempts } from "../../db/schema/index.js";

export interface TicketDeliveryResult {
  ticketId: number;
  orderId: number;
  success: boolean;
  alreadyPrinted?: boolean | undefined;
  attemptId?: number | undefined;
  errorMessage?: string | null | undefined;
  rawResponseJson?: Record<string, unknown> | null | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function recomputeOrderPrintState(db: DatabaseClient, orderId: number) {
  const orderTicketRows = await db
    .select({
      id: kitchenTickets.id,
      status: kitchenTickets.status,
      printedAt: kitchenTickets.printedAt,
    })
    .from(kitchenTickets)
    .where(eq(kitchenTickets.orderId, orderId));

  const allPrinted = orderTicketRows.length > 0 && orderTicketRows.every((row) => row.status === "Printed");
  const printedAt = allPrinted
    ? orderTicketRows.reduce<Date | null>((currentValue, row) => {
      if (!row.printedAt) {
        return currentValue;
      }

      if (!currentValue || row.printedAt > currentValue) {
        return row.printedAt;
      }

      return currentValue;
    }, null)
    : null;

  await db
    .update(orders)
    .set({
      status: allPrinted ? "Printed" : "Sent",
      printedAt,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
}

export async function deliverKitchenTicket(db: DatabaseClient, ticketId: number) {
  const ticketRow = (
    await db
      .select({
        ticketId: kitchenTickets.id,
        orderId: kitchenTickets.orderId,
        status: kitchenTickets.status,
        printerId: kitchenTickets.printerId,
        payloadJson: kitchenTickets.payloadJson,
        kitchenAreaName: kitchenAreas.name,
        printerName: printers.name,
        printerTransportType: printers.transportType,
        printerIsEnabled: printers.isEnabled,
        connectionConfigJson: printers.connectionConfigJson,
      })
      .from(kitchenTickets)
      .innerJoin(kitchenAreas, eq(kitchenTickets.kitchenAreaId, kitchenAreas.id))
      .leftJoin(printers, eq(kitchenTickets.printerId, printers.id))
      .where(eq(kitchenTickets.id, ticketId))
      .limit(1)
  )[0];

  if (!ticketRow) {
    return null;
  }

  if (ticketRow.status === "Printed") {
    return {
      ticketId: ticketRow.ticketId,
      orderId: ticketRow.orderId,
      success: true,
      alreadyPrinted: true,
    } satisfies TicketDeliveryResult;
  }

  const attemptedAt = new Date();
  let success = false;
  let errorMessage: string | null = null;
  let rawResponseJson: Record<string, unknown> | null = null;

  if (ticketRow.printerId === null || ticketRow.printerName === null) {
    errorMessage = "Nessuna stampante assegnata al ticket.";
  } else if (!ticketRow.printerIsEnabled) {
    errorMessage = "La stampante assegnata e disabilitata.";
  } else if (ticketRow.printerTransportType === "mock") {
    const connectionConfig = isRecord(ticketRow.connectionConfigJson) ? ticketRow.connectionConfigJson : {};

    if (connectionConfig.forceFailure === true) {
      errorMessage = "La stampante mock e configurata per simulare un errore.";
    } else {
      success = true;
      rawResponseJson = {
        transport: "mock",
        printerName: ticketRow.printerName,
        kitchenAreaName: ticketRow.kitchenAreaName,
        deliveredAt: attemptedAt.toISOString(),
        payload: ticketRow.payloadJson ?? {},
      };
    }
  } else {
    errorMessage = `Il trasporto ${ticketRow.printerTransportType} non e ancora implementato.`;
  }

  const attempt = (
    await db
      .insert(ticketDeliveryAttempts)
      .values({
        kitchenTicketId: ticketRow.ticketId,
        printerId: ticketRow.printerId,
        attemptedAt,
        success,
        errorMessage,
        rawResponseJson,
      })
      .returning({ id: ticketDeliveryAttempts.id })
  )[0];

  if (success) {
    await db
      .update(kitchenTickets)
      .set({
        status: "Printed",
        printedAt: attemptedAt,
      })
      .where(eq(kitchenTickets.id, ticketRow.ticketId));
  }

  await recomputeOrderPrintState(db, ticketRow.orderId);

  return {
    ticketId: ticketRow.ticketId,
    orderId: ticketRow.orderId,
    success,
    attemptId: attempt?.id,
    errorMessage,
    rawResponseJson,
  } satisfies TicketDeliveryResult;
}

export async function deliverPendingTicketsForOrder(db: DatabaseClient, orderId: number) {
  const ticketRows = await db
    .select({ id: kitchenTickets.id })
    .from(kitchenTickets)
    .where(and(eq(kitchenTickets.orderId, orderId), eq(kitchenTickets.status, "Sent")))
    .orderBy(asc(kitchenTickets.id));

  const results: TicketDeliveryResult[] = [];

  for (const ticketRow of ticketRows) {
    const result = await deliverKitchenTicket(db, ticketRow.id);

    if (result) {
      results.push(result);
    }
  }

  return results;
}

export async function markKitchenTicketPrinted(db: DatabaseClient, ticketId: number) {
  const ticketRow = (
    await db
      .select({
        orderId: kitchenTickets.orderId,
        status: kitchenTickets.status,
      })
      .from(kitchenTickets)
      .where(eq(kitchenTickets.id, ticketId))
      .limit(1)
  )[0];

  if (!ticketRow) {
    return null;
  }

  if (ticketRow.status !== "Printed") {
    await db
      .update(kitchenTickets)
      .set({
        status: "Printed",
        printedAt: new Date(),
      })
      .where(eq(kitchenTickets.id, ticketId));
  }

  await recomputeOrderPrintState(db, ticketRow.orderId);

  return ticketRow.orderId;
}