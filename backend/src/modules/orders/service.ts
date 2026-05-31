import { and, asc, eq, inArray } from "drizzle-orm";

import type { Database } from "../../db/types.js";
import {
  kitchenTicketItems,
  kitchenTickets,
  orderItemSelections,
  orderItems,
  orders,
  printers,
} from "../../db/schema/index.js";
import { deliverPendingTicketsForOrder, type TicketDeliveryResult } from "../printers/delivery.js";
import type { AuthenticatedUser } from "../auth/session.js";
import { type CreateOrderInput, prepareOrderDraft } from "./pricing.js";

export async function createOrder(db: Database, actor: AuthenticatedUser, input: CreateOrderInput) {
  const preparedOrder = await prepareOrderDraft(db, input);

  const createdOrder = await db.transaction(async (tx) => {
    const insertedOrder = (
      await tx
        .insert(orders)
        .values({
          createdByUserId: actor.id,
          createdByUsernameSnapshot: actor.username,
          sourceApp: preparedOrder.sourceApp,
          tableNumber: preparedOrder.tableNumber,
          status: "Sent",
        })
        .returning({
          id: orders.id,
          createdAt: orders.createdAt,
        })
    )[0];

    if (!insertedOrder) {
      throw new Error("Impossibile creare l'ordine.");
    }

    const kitchenAreaIds = Array.from(new Set(preparedOrder.items.map((item) => item.kitchenAreaId)));
    const printerRows = kitchenAreaIds.length === 0
      ? []
      : await tx
        .select({
          id: printers.id,
          kitchenAreaId: printers.kitchenAreaId,
          name: printers.name,
          transportType: printers.transportType,
        })
        .from(printers)
        .where(and(inArray(printers.kitchenAreaId, kitchenAreaIds), eq(printers.isEnabled, true)))
        .orderBy(asc(printers.id));
    const printerByKitchenAreaId = new Map<number, (typeof printerRows)[number]>();

    for (const printerRow of printerRows) {
      if (!printerByKitchenAreaId.has(printerRow.kitchenAreaId)) {
        printerByKitchenAreaId.set(printerRow.kitchenAreaId, printerRow);
      }
    }

    const insertedOrderItems: Array<{
      id: number;
      kitchenAreaId: number;
      kitchenAreaName: string;
      displayNameSnapshot: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
      selections: (typeof preparedOrder.items)[number]["selections"];
    }> = [];

    for (const preparedItem of preparedOrder.items) {
      const insertedOrderItem = (
        await tx
          .insert(orderItems)
          .values({
            orderId: insertedOrder.id,
            menuItemId: preparedItem.menuItemId,
            kitchenAreaId: preparedItem.kitchenAreaId,
            displayNameSnapshot: preparedItem.displayNameSnapshot,
            quantity: preparedItem.quantity,
            unitPriceCents: preparedItem.unitPriceCents,
            lineTotalCents: preparedItem.lineTotalCents,
          })
          .returning({ id: orderItems.id })
      )[0];

      if (!insertedOrderItem) {
        throw new Error("Impossibile creare una riga ordine.");
      }

      if (preparedItem.selections.length > 0) {
        await tx.insert(orderItemSelections).values(
          preparedItem.selections.map((selection) => ({
            orderItemId: insertedOrderItem.id,
            optionGroupNameSnapshot: selection.optionGroupNameSnapshot,
            optionNameSnapshot: selection.optionNameSnapshot,
            priceDeltaCents: selection.priceDeltaCents,
            sortOrder: selection.sortOrder,
          })),
        );
      }

      insertedOrderItems.push({
        id: insertedOrderItem.id,
        kitchenAreaId: preparedItem.kitchenAreaId,
        kitchenAreaName: preparedItem.kitchenAreaName,
        displayNameSnapshot: preparedItem.displayNameSnapshot,
        quantity: preparedItem.quantity,
        unitPriceCents: preparedItem.unitPriceCents,
        lineTotalCents: preparedItem.lineTotalCents,
        selections: preparedItem.selections,
      });
    }

    const orderItemsByKitchenAreaId = new Map<number, typeof insertedOrderItems>();

    for (const insertedOrderItem of insertedOrderItems) {
      const existingRows = orderItemsByKitchenAreaId.get(insertedOrderItem.kitchenAreaId) ?? [];
      existingRows.push(insertedOrderItem);
      orderItemsByKitchenAreaId.set(insertedOrderItem.kitchenAreaId, existingRows);
    }

    for (const [kitchenAreaId, groupedItems] of orderItemsByKitchenAreaId.entries()) {
      const assignedPrinter = printerByKitchenAreaId.get(kitchenAreaId) ?? null;
      const insertedTicket = (
        await tx
          .insert(kitchenTickets)
          .values({
            orderId: insertedOrder.id,
            kitchenAreaId,
            printerId: assignedPrinter?.id ?? null,
            insertedByUsernameSnapshot: actor.username,
            sourceApp: preparedOrder.sourceApp,
            tableNumber: preparedOrder.tableNumber,
            status: "Sent",
            payloadJson: {},
          })
          .returning({ id: kitchenTickets.id })
      )[0];

      if (!insertedTicket) {
        throw new Error("Impossibile creare il ticket cucina.");
      }

      await tx.insert(kitchenTicketItems).values(
        groupedItems.map((groupedItem, index) => ({
          kitchenTicketId: insertedTicket.id,
          orderItemId: groupedItem.id,
          displayNameSnapshot: groupedItem.displayNameSnapshot,
          quantity: groupedItem.quantity,
          sortOrder: index + 1,
        })),
      );

      const payloadJson = {
        ticketId: insertedTicket.id,
        orderId: insertedOrder.id,
        orderReference: insertedOrder.id,
        insertedByUsernameSnapshot: actor.username,
        sourceApp: preparedOrder.sourceApp,
        tableNumber: preparedOrder.tableNumber,
        createdAt: insertedOrder.createdAt.toISOString(),
        kitchenArea: {
          id: kitchenAreaId,
          name: groupedItems[0]?.kitchenAreaName ?? null,
        },
        printer: assignedPrinter
          ? {
              id: assignedPrinter.id,
              name: assignedPrinter.name,
              transportType: assignedPrinter.transportType,
            }
          : null,
        items: groupedItems.map((groupedItem) => ({
          orderItemId: groupedItem.id,
          displayNameSnapshot: groupedItem.displayNameSnapshot,
          quantity: groupedItem.quantity,
          unitPriceCents: groupedItem.unitPriceCents,
          lineTotalCents: groupedItem.lineTotalCents,
          selections: groupedItem.selections,
        })),
      };

      await tx
        .update(kitchenTickets)
        .set({ payloadJson })
        .where(eq(kitchenTickets.id, insertedTicket.id));
    }

    return insertedOrder.id;
  });

  const deliveryResults = await deliverPendingTicketsForOrder(db, createdOrder);

  return {
    orderId: createdOrder,
    deliveryResults,
  } satisfies {
    orderId: number;
    deliveryResults: TicketDeliveryResult[];
  };
}

export async function retryOrderDelivery(db: Database, orderId: number) {
  return deliverPendingTicketsForOrder(db, orderId);
}