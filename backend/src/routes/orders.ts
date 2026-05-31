import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { getOrderDetail, listOrders } from "../modules/orders/read-model.js";
import { createOrder, retryOrderDelivery } from "../modules/orders/service.js";
import { OrderValidationError } from "../modules/orders/pricing.js";

const orderIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const orderListQuerySchema = z.object({
  status: z.enum(["Sent", "Printed"]).optional(),
  sourceApp: z.enum(["POS", "Tableside"]).optional(),
  tableNumber: z.coerce.number().int().positive().optional(),
  createdByUserId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(250).default(100),
});

const createOrderSchema = z.object({
  sourceApp: z.enum(["POS", "Tableside"]),
  tableNumber: z.coerce.number().int().positive().max(999),
  items: z.array(z.object({
    menuItemId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive().max(50),
    selections: z.array(z.object({
      optionGroupId: z.coerce.number().int().positive(),
      optionId: z.coerce.number().int().positive(),
    })).default([]),
  })).min(1),
});

function validationError(reply: FastifyReply, issues: unknown) {
  reply.code(400).send({
    message: "Payload non valido.",
    issues,
  });
}

export async function registerOrderRoutes(app: FastifyInstance) {
  app.get("/orders", { preHandler: app.authorize("operator") }, async (request, reply) => {
    const parsedQuery = orderListQuerySchema.safeParse(request.query ?? {});

    if (!parsedQuery.success) {
      validationError(reply, parsedQuery.error.flatten());
      return;
    }

    reply.send({
      orders: await listOrders(app.db, parsedQuery.data),
    });
  });

  app.get("/orders/:id", { preHandler: app.authorize("operator") }, async (request, reply) => {
    const parsedParams = orderIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    const order = await getOrderDetail(app.db, parsedParams.data.id);

    if (!order) {
      reply.code(404).send({
        message: "Ordine non trovato.",
      });
      return;
    }

    reply.send({ order });
  });

  app.post("/orders", { preHandler: app.authorize("operator") }, async (request, reply) => {
    const parsedBody = createOrderSchema.safeParse(request.body);

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    if (!request.currentUser) {
      reply.code(401).send({
        message: "Autenticazione richiesta.",
      });
      return;
    }

    try {
      const result = await createOrder(app.db, request.currentUser, parsedBody.data);
      const order = await getOrderDetail(app.db, result.orderId);

      reply.code(201).send({
        order,
        deliveryResults: result.deliveryResults,
      });
    } catch (error) {
      if (error instanceof OrderValidationError) {
        reply.code(400).send({
          message: error.message,
        });
        return;
      }

      throw error;
    }
  });

  app.post("/orders/:id/retry-delivery", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = orderIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    const existingOrder = await getOrderDetail(app.db, parsedParams.data.id);

    if (!existingOrder) {
      reply.code(404).send({
        message: "Ordine non trovato.",
      });
      return;
    }

    const deliveryResults = await retryOrderDelivery(app.db, parsedParams.data.id);
    const order = await getOrderDetail(app.db, parsedParams.data.id);

    reply.send({
      order,
      deliveryResults,
    });
  });
}