import { and, desc, eq, inArray } from "drizzle-orm";

import type { DatabaseClient } from "../../db/types.js";
import {
  kitchenAreas,
  kitchenTicketItems,
  kitchenTickets,
  orderItemSelections,
  orderItems,
  orders,
  printers,
  ticketDeliveryAttempts,
} from "../../db/schema/index.js";

export interface OrderListFilters {
  status?: "Sent" | "Printed" | undefined;
  sourceApp?: "POS" | "Tableside" | undefined;
  tableNumber?: number | undefined;
  createdByUserId?: number | undefined;
  limit: number;
}

export interface KitchenTicketListFilters {
  ticketId?: number | undefined;
  status?: "Sent" | "Printed" | undefined;
  sourceApp?: "POS" | "Tableside" | undefined;
  tableNumber?: number | undefined;
  orderId?: number | undefined;
  kitchenAreaId?: number | undefined;
  printerId?: number | undefined;
  limit: number;
}

function groupByKey<TKey, TValue>(rows: TValue[], getKey: (row: TValue) => TKey) {
  const groupedRows = new Map<TKey, TValue[]>();

  for (const row of rows) {
    const key = getKey(row);
    const existingRows = groupedRows.get(key) ?? [];
    existingRows.push(row);
    groupedRows.set(key, existingRows);
  }

  return groupedRows;
}

async function loadOrderRelations(db: DatabaseClient, orderIds: number[]) {
  if (orderIds.length === 0) {
    return {
      orderItemRows: [],
      selectionRows: [],
      ticketRows: [],
      ticketItemRows: [],
      attemptRows: [],
      areaRows: [],
      printerRows: [],
    };
  }

  const orderItemRows = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      menuItemId: orderItems.menuItemId,
      kitchenAreaId: orderItems.kitchenAreaId,
      displayNameSnapshot: orderItems.displayNameSnapshot,
      quantity: orderItems.quantity,
      unitPriceCents: orderItems.unitPriceCents,
      lineTotalCents: orderItems.lineTotalCents,
      createdAt: orderItems.createdAt,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(orderItems.id);

  const orderItemIds = orderItemRows.map((row) => row.id);
  const selectionRows = orderItemIds.length === 0
    ? []
    : await db
      .select({
        id: orderItemSelections.id,
        orderItemId: orderItemSelections.orderItemId,
        optionGroupNameSnapshot: orderItemSelections.optionGroupNameSnapshot,
        optionNameSnapshot: orderItemSelections.optionNameSnapshot,
        priceDeltaCents: orderItemSelections.priceDeltaCents,
        sortOrder: orderItemSelections.sortOrder,
      })
      .from(orderItemSelections)
      .where(inArray(orderItemSelections.orderItemId, orderItemIds))
      .orderBy(orderItemSelections.sortOrder, orderItemSelections.id);

  const ticketRows = await db
    .select({
      id: kitchenTickets.id,
      orderId: kitchenTickets.orderId,
      kitchenAreaId: kitchenTickets.kitchenAreaId,
      printerId: kitchenTickets.printerId,
      insertedByUsernameSnapshot: kitchenTickets.insertedByUsernameSnapshot,
      sourceApp: kitchenTickets.sourceApp,
      tableNumber: kitchenTickets.tableNumber,
      status: kitchenTickets.status,
      createdAt: kitchenTickets.createdAt,
      printedAt: kitchenTickets.printedAt,
      payloadJson: kitchenTickets.payloadJson,
    })
    .from(kitchenTickets)
    .where(inArray(kitchenTickets.orderId, orderIds))
    .orderBy(kitchenTickets.id);

  const ticketIds = ticketRows.map((row) => row.id);
  const ticketItemRows = ticketIds.length === 0
    ? []
    : await db
      .select({
        id: kitchenTicketItems.id,
        kitchenTicketId: kitchenTicketItems.kitchenTicketId,
        orderItemId: kitchenTicketItems.orderItemId,
        displayNameSnapshot: kitchenTicketItems.displayNameSnapshot,
        quantity: kitchenTicketItems.quantity,
        sortOrder: kitchenTicketItems.sortOrder,
      })
      .from(kitchenTicketItems)
      .where(inArray(kitchenTicketItems.kitchenTicketId, ticketIds))
      .orderBy(kitchenTicketItems.sortOrder, kitchenTicketItems.id);
  const attemptRows = ticketIds.length === 0
    ? []
    : await db
      .select({
        id: ticketDeliveryAttempts.id,
        kitchenTicketId: ticketDeliveryAttempts.kitchenTicketId,
        printerId: ticketDeliveryAttempts.printerId,
        attemptedAt: ticketDeliveryAttempts.attemptedAt,
        success: ticketDeliveryAttempts.success,
        errorMessage: ticketDeliveryAttempts.errorMessage,
        rawResponseJson: ticketDeliveryAttempts.rawResponseJson,
      })
      .from(ticketDeliveryAttempts)
      .where(inArray(ticketDeliveryAttempts.kitchenTicketId, ticketIds))
      .orderBy(desc(ticketDeliveryAttempts.attemptedAt), desc(ticketDeliveryAttempts.id));

  const areaIds = Array.from(new Set([
    ...orderItemRows.map((row) => row.kitchenAreaId),
    ...ticketRows.map((row) => row.kitchenAreaId),
  ]));
  const printerIds = Array.from(new Set(ticketRows.flatMap((row) => (row.printerId === null ? [] : [row.printerId]))));
  const [areaRows, printerRows] = await Promise.all([
    areaIds.length === 0
      ? Promise.resolve([])
      : db
        .select({
          id: kitchenAreas.id,
          name: kitchenAreas.name,
        })
        .from(kitchenAreas)
        .where(inArray(kitchenAreas.id, areaIds)),
    printerIds.length === 0
      ? Promise.resolve([])
      : db
        .select({
          id: printers.id,
          name: printers.name,
          transportType: printers.transportType,
          isEnabled: printers.isEnabled,
        })
        .from(printers)
        .where(inArray(printers.id, printerIds)),
  ]);

  return {
    orderItemRows,
    selectionRows,
    ticketRows,
    ticketItemRows,
    attemptRows,
    areaRows,
    printerRows,
  };
}

function buildOrderItems(orderItemRows: Awaited<ReturnType<typeof loadOrderRelations>>["orderItemRows"], selectionRows: Awaited<ReturnType<typeof loadOrderRelations>>["selectionRows"], areaRows: Awaited<ReturnType<typeof loadOrderRelations>>["areaRows"]) {
  const selectionsByOrderItemId = groupByKey(selectionRows, (row) => row.orderItemId);
  const areaById = new Map(areaRows.map((row) => [row.id, row]));

  return orderItemRows.map((orderItemRow) => ({
    id: orderItemRow.id,
    menuItemId: orderItemRow.menuItemId,
    displayNameSnapshot: orderItemRow.displayNameSnapshot,
    quantity: orderItemRow.quantity,
    unitPriceCents: orderItemRow.unitPriceCents,
    lineTotalCents: orderItemRow.lineTotalCents,
    createdAt: orderItemRow.createdAt,
    kitchenArea: areaById.get(orderItemRow.kitchenAreaId) ?? null,
    selections: selectionsByOrderItemId.get(orderItemRow.id) ?? [],
  }));
}

export async function listOrders(db: DatabaseClient, filters: OrderListFilters) {
  const conditions = [];

  if (filters.status) {
    conditions.push(eq(orders.status, filters.status));
  }

  if (filters.sourceApp) {
    conditions.push(eq(orders.sourceApp, filters.sourceApp));
  }

  if (filters.tableNumber !== undefined) {
    conditions.push(eq(orders.tableNumber, filters.tableNumber));
  }

  if (filters.createdByUserId !== undefined) {
    conditions.push(eq(orders.createdByUserId, filters.createdByUserId));
  }

  const orderRows = conditions.length > 0
    ? await db
      .select({
        id: orders.id,
        createdByUserId: orders.createdByUserId,
        createdByUsernameSnapshot: orders.createdByUsernameSnapshot,
        sourceApp: orders.sourceApp,
        tableNumber: orders.tableNumber,
        status: orders.status,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        printedAt: orders.printedAt,
      })
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(filters.limit)
    : await db
      .select({
        id: orders.id,
        createdByUserId: orders.createdByUserId,
        createdByUsernameSnapshot: orders.createdByUsernameSnapshot,
        sourceApp: orders.sourceApp,
        tableNumber: orders.tableNumber,
        status: orders.status,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        printedAt: orders.printedAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(filters.limit);

  const relations = await loadOrderRelations(db, orderRows.map((row) => row.id));
  const orderItemsWithSelections = buildOrderItems(relations.orderItemRows, relations.selectionRows, relations.areaRows);
  const orderItemsByOrderId = groupByKey(orderItemsWithSelections, (row) => {
    const orderItem = relations.orderItemRows.find((candidate) => candidate.id === row.id);
    return orderItem?.orderId ?? 0;
  });
  const printerById = new Map(relations.printerRows.map((row) => [row.id, row]));
  const areaById = new Map(relations.areaRows.map((row) => [row.id, row]));
  const attemptsByTicketId = groupByKey(relations.attemptRows, (row) => row.kitchenTicketId);
  const orderItemWithSelectionsById = new Map(orderItemsWithSelections.map((row) => [row.id, row]));
  const ticketItemsByTicketId = groupByKey(relations.ticketItemRows, (row) => row.kitchenTicketId);
  const ticketsByOrderId = groupByKey(relations.ticketRows, (row) => row.orderId);

  return orderRows.map((orderRow) => {
    const items = orderItemsByOrderId.get(orderRow.id) ?? [];
    const tickets = (ticketsByOrderId.get(orderRow.id) ?? []).map((ticketRow) => ({
      id: ticketRow.id,
      orderId: ticketRow.orderId,
      orderReference: ticketRow.orderId,
      insertedByUsernameSnapshot: ticketRow.insertedByUsernameSnapshot,
      sourceApp: ticketRow.sourceApp,
      tableNumber: ticketRow.tableNumber,
      status: ticketRow.status,
      createdAt: ticketRow.createdAt,
      printedAt: ticketRow.printedAt,
      payloadJson: ticketRow.payloadJson ?? {},
      kitchenArea: areaById.get(ticketRow.kitchenAreaId) ?? null,
      printer: ticketRow.printerId === null ? null : printerById.get(ticketRow.printerId) ?? null,
      items: (ticketItemsByTicketId.get(ticketRow.id) ?? []).map((ticketItemRow) => ({
        id: ticketItemRow.id,
        orderItemId: ticketItemRow.orderItemId,
        displayNameSnapshot: ticketItemRow.displayNameSnapshot,
        quantity: ticketItemRow.quantity,
        sortOrder: ticketItemRow.sortOrder,
        selections: orderItemWithSelectionsById.get(ticketItemRow.orderItemId)?.selections ?? [],
      })),
      deliveryAttempts: attemptsByTicketId.get(ticketRow.id) ?? [],
    }));

    return {
      id: orderRow.id,
      reference: orderRow.id,
      createdByUserId: orderRow.createdByUserId,
      createdByUsernameSnapshot: orderRow.createdByUsernameSnapshot,
      sourceApp: orderRow.sourceApp,
      tableNumber: orderRow.tableNumber,
      status: orderRow.status,
      createdAt: orderRow.createdAt,
      updatedAt: orderRow.updatedAt,
      printedAt: orderRow.printedAt,
      totalAmountCents: items.reduce((total, item) => total + item.lineTotalCents, 0),
      items,
      tickets,
    };
  });
}

export async function getOrderDetail(db: DatabaseClient, orderId: number) {
  const orderRows = await db
    .select({
      id: orders.id,
      createdByUserId: orders.createdByUserId,
      createdByUsernameSnapshot: orders.createdByUsernameSnapshot,
      sourceApp: orders.sourceApp,
      tableNumber: orders.tableNumber,
      status: orders.status,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      printedAt: orders.printedAt,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  const orderRow = orderRows[0];

  if (!orderRow) {
    return null;
  }

  const relations = await loadOrderRelations(db, [orderId]);
  const orderItemsWithSelections = buildOrderItems(relations.orderItemRows, relations.selectionRows, relations.areaRows);
  const orderItemsByOrderId = groupByKey(orderItemsWithSelections, (row) => {
    const orderItem = relations.orderItemRows.find((candidate) => candidate.id === row.id);
    return orderItem?.orderId ?? 0;
  });
  const printerById = new Map(relations.printerRows.map((row) => [row.id, row]));
  const areaById = new Map(relations.areaRows.map((row) => [row.id, row]));
  const attemptsByTicketId = groupByKey(relations.attemptRows, (row) => row.kitchenTicketId);
  const orderItemWithSelectionsById = new Map(orderItemsWithSelections.map((row) => [row.id, row]));
  const ticketItemsByTicketId = groupByKey(relations.ticketItemRows, (row) => row.kitchenTicketId);
  const tickets = relations.ticketRows.map((ticketRow) => ({
    id: ticketRow.id,
    orderId: ticketRow.orderId,
    orderReference: ticketRow.orderId,
    insertedByUsernameSnapshot: ticketRow.insertedByUsernameSnapshot,
    sourceApp: ticketRow.sourceApp,
    tableNumber: ticketRow.tableNumber,
    status: ticketRow.status,
    createdAt: ticketRow.createdAt,
    printedAt: ticketRow.printedAt,
    payloadJson: ticketRow.payloadJson ?? {},
    kitchenArea: areaById.get(ticketRow.kitchenAreaId) ?? null,
    printer: ticketRow.printerId === null ? null : printerById.get(ticketRow.printerId) ?? null,
    items: (ticketItemsByTicketId.get(ticketRow.id) ?? []).map((ticketItemRow) => ({
      id: ticketItemRow.id,
      orderItemId: ticketItemRow.orderItemId,
      displayNameSnapshot: ticketItemRow.displayNameSnapshot,
      quantity: ticketItemRow.quantity,
      sortOrder: ticketItemRow.sortOrder,
      selections: orderItemWithSelectionsById.get(ticketItemRow.orderItemId)?.selections ?? [],
    })),
    deliveryAttempts: attemptsByTicketId.get(ticketRow.id) ?? [],
  }));
  const items = orderItemsByOrderId.get(orderId) ?? [];

  return {
    id: orderRow.id,
    reference: orderRow.id,
    createdByUserId: orderRow.createdByUserId,
    createdByUsernameSnapshot: orderRow.createdByUsernameSnapshot,
    sourceApp: orderRow.sourceApp,
    tableNumber: orderRow.tableNumber,
    status: orderRow.status,
    createdAt: orderRow.createdAt,
    updatedAt: orderRow.updatedAt,
    printedAt: orderRow.printedAt,
    totalAmountCents: items.reduce((total, item) => total + item.lineTotalCents, 0),
    items,
    tickets,
  };
}

export async function listKitchenTickets(db: DatabaseClient, filters: KitchenTicketListFilters) {
  const conditions = [];

  if (filters.status) {
    conditions.push(eq(kitchenTickets.status, filters.status));
  }

  if (filters.ticketId !== undefined) {
    conditions.push(eq(kitchenTickets.id, filters.ticketId));
  }

  if (filters.sourceApp) {
    conditions.push(eq(kitchenTickets.sourceApp, filters.sourceApp));
  }

  if (filters.tableNumber !== undefined) {
    conditions.push(eq(kitchenTickets.tableNumber, filters.tableNumber));
  }

  if (filters.orderId !== undefined) {
    conditions.push(eq(kitchenTickets.orderId, filters.orderId));
  }

  if (filters.kitchenAreaId !== undefined) {
    conditions.push(eq(kitchenTickets.kitchenAreaId, filters.kitchenAreaId));
  }

  if (filters.printerId !== undefined) {
    conditions.push(eq(kitchenTickets.printerId, filters.printerId));
  }

  const ticketRows = conditions.length > 0
    ? await db
      .select({
        id: kitchenTickets.id,
        orderId: kitchenTickets.orderId,
        kitchenAreaId: kitchenTickets.kitchenAreaId,
        printerId: kitchenTickets.printerId,
        insertedByUsernameSnapshot: kitchenTickets.insertedByUsernameSnapshot,
        sourceApp: kitchenTickets.sourceApp,
        tableNumber: kitchenTickets.tableNumber,
        status: kitchenTickets.status,
        createdAt: kitchenTickets.createdAt,
        printedAt: kitchenTickets.printedAt,
        payloadJson: kitchenTickets.payloadJson,
      })
      .from(kitchenTickets)
      .where(and(...conditions))
      .orderBy(desc(kitchenTickets.createdAt), desc(kitchenTickets.id))
      .limit(filters.limit)
    : await db
      .select({
        id: kitchenTickets.id,
        orderId: kitchenTickets.orderId,
        kitchenAreaId: kitchenTickets.kitchenAreaId,
        printerId: kitchenTickets.printerId,
        insertedByUsernameSnapshot: kitchenTickets.insertedByUsernameSnapshot,
        sourceApp: kitchenTickets.sourceApp,
        tableNumber: kitchenTickets.tableNumber,
        status: kitchenTickets.status,
        createdAt: kitchenTickets.createdAt,
        printedAt: kitchenTickets.printedAt,
        payloadJson: kitchenTickets.payloadJson,
      })
      .from(kitchenTickets)
      .orderBy(desc(kitchenTickets.createdAt), desc(kitchenTickets.id))
      .limit(filters.limit);

  const ticketIds = ticketRows.map((row) => row.id);

  if (ticketIds.length === 0) {
    return [];
  }

  const printerIds = Array.from(new Set(ticketRows.flatMap((row) => row.printerId === null ? [] : [row.printerId])));
  const [ticketItemRows, attemptRows, areaRows, printerRows, orderRows] = await Promise.all([
    db
      .select({
        id: kitchenTicketItems.id,
        kitchenTicketId: kitchenTicketItems.kitchenTicketId,
        orderItemId: kitchenTicketItems.orderItemId,
        displayNameSnapshot: kitchenTicketItems.displayNameSnapshot,
        quantity: kitchenTicketItems.quantity,
        sortOrder: kitchenTicketItems.sortOrder,
      })
      .from(kitchenTicketItems)
      .where(inArray(kitchenTicketItems.kitchenTicketId, ticketIds))
      .orderBy(kitchenTicketItems.sortOrder, kitchenTicketItems.id),
    db
      .select({
        id: ticketDeliveryAttempts.id,
        kitchenTicketId: ticketDeliveryAttempts.kitchenTicketId,
        printerId: ticketDeliveryAttempts.printerId,
        attemptedAt: ticketDeliveryAttempts.attemptedAt,
        success: ticketDeliveryAttempts.success,
        errorMessage: ticketDeliveryAttempts.errorMessage,
        rawResponseJson: ticketDeliveryAttempts.rawResponseJson,
      })
      .from(ticketDeliveryAttempts)
      .where(inArray(ticketDeliveryAttempts.kitchenTicketId, ticketIds))
      .orderBy(desc(ticketDeliveryAttempts.attemptedAt), desc(ticketDeliveryAttempts.id)),
    db
      .select({
        id: kitchenAreas.id,
        name: kitchenAreas.name,
      })
      .from(kitchenAreas)
      .where(inArray(kitchenAreas.id, Array.from(new Set(ticketRows.map((row) => row.kitchenAreaId))))),
    printerIds.length === 0
      ? Promise.resolve([])
      : db
        .select({
          id: printers.id,
          name: printers.name,
          transportType: printers.transportType,
          isEnabled: printers.isEnabled,
        })
        .from(printers)
        .where(inArray(printers.id, printerIds)),
    db
      .select({
        id: orders.id,
        createdByUserId: orders.createdByUserId,
        createdByUsernameSnapshot: orders.createdByUsernameSnapshot,
        status: orders.status,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        printedAt: orders.printedAt,
      })
      .from(orders)
        .where(inArray(orders.id, Array.from(new Set(ticketRows.map((row) => row.orderId))))),
  ]);
  const orderItemIds = Array.from(new Set(ticketItemRows.map((row) => row.orderItemId)));
  const [orderItemRows, selectionRows] = await Promise.all([
    orderItemIds.length === 0
      ? Promise.resolve([])
      : db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          kitchenAreaId: orderItems.kitchenAreaId,
          displayNameSnapshot: orderItems.displayNameSnapshot,
          quantity: orderItems.quantity,
          unitPriceCents: orderItems.unitPriceCents,
          lineTotalCents: orderItems.lineTotalCents,
        })
        .from(orderItems)
        .where(inArray(orderItems.id, orderItemIds)),
    orderItemIds.length === 0
      ? Promise.resolve([])
      : db
        .select({
          id: orderItemSelections.id,
          orderItemId: orderItemSelections.orderItemId,
          optionGroupNameSnapshot: orderItemSelections.optionGroupNameSnapshot,
          optionNameSnapshot: orderItemSelections.optionNameSnapshot,
          priceDeltaCents: orderItemSelections.priceDeltaCents,
          sortOrder: orderItemSelections.sortOrder,
        })
        .from(orderItemSelections)
        .where(inArray(orderItemSelections.orderItemId, orderItemIds))
        .orderBy(orderItemSelections.sortOrder, orderItemSelections.id),
  ]);

  const areaById = new Map(areaRows.map((row) => [row.id, row]));
  const printerById = new Map(printerRows.map((row) => [row.id, row]));
  const orderById = new Map(orderRows.map((row) => [row.id, row]));
  const orderItemById = new Map(orderItemRows.map((row) => [row.id, row]));
  const selectionsByOrderItemId = groupByKey(selectionRows, (row) => row.orderItemId);
  const attemptsByTicketId = groupByKey(attemptRows, (row) => row.kitchenTicketId);
  const ticketItemsByTicketId = groupByKey(ticketItemRows, (row) => row.kitchenTicketId);

  return ticketRows.map((ticketRow) => ({
    id: ticketRow.id,
    orderId: ticketRow.orderId,
    orderReference: ticketRow.orderId,
    insertedByUsernameSnapshot: ticketRow.insertedByUsernameSnapshot,
    sourceApp: ticketRow.sourceApp,
    tableNumber: ticketRow.tableNumber,
    status: ticketRow.status,
    createdAt: ticketRow.createdAt,
    printedAt: ticketRow.printedAt,
    payloadJson: ticketRow.payloadJson ?? {},
    kitchenArea: areaById.get(ticketRow.kitchenAreaId) ?? null,
    printer: ticketRow.printerId === null ? null : printerById.get(ticketRow.printerId) ?? null,
    order: orderById.get(ticketRow.orderId) ?? null,
    items: (ticketItemsByTicketId.get(ticketRow.id) ?? []).map((ticketItemRow) => ({
      id: ticketItemRow.id,
      orderItemId: ticketItemRow.orderItemId,
      displayNameSnapshot: ticketItemRow.displayNameSnapshot,
      quantity: ticketItemRow.quantity,
      sortOrder: ticketItemRow.sortOrder,
      unitPriceCents: orderItemById.get(ticketItemRow.orderItemId)?.unitPriceCents ?? 0,
      lineTotalCents: orderItemById.get(ticketItemRow.orderItemId)?.lineTotalCents ?? 0,
      selections: selectionsByOrderItemId.get(ticketItemRow.orderItemId) ?? [],
    })),
    deliveryAttempts: attemptsByTicketId.get(ticketRow.id) ?? [],
  }));
}

export async function getKitchenTicketDetail(db: DatabaseClient, ticketId: number) {
  const kitchenTicketRows = await db
    .select({ id: kitchenTickets.id })
    .from(kitchenTickets)
    .where(eq(kitchenTickets.id, ticketId))
    .limit(1);

  if (kitchenTicketRows.length === 0) {
    return null;
  }

  return (await listKitchenTickets(db, { limit: 1, ticketId })).find((ticket) => ticket.id === ticketId) ?? null;
}