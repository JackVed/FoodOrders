import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { getKitchenTicketDetail, listKitchenTickets } from "../modules/orders/read-model.js";
import { deliverKitchenTicket, markKitchenTicketPrinted } from "../modules/printers/delivery.js";

const ticketIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const ticketListQuerySchema = z.object({
  status: z.enum(["Sent", "Printed"]).optional(),
  sourceApp: z.enum(["POS", "Tableside"]).optional(),
  tableNumber: z.coerce.number().int().positive().optional(),
  orderId: z.coerce.number().int().positive().optional(),
  kitchenAreaId: z.coerce.number().int().positive().optional(),
  printerId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(250).default(100),
});

function validationError(reply: FastifyReply, issues: unknown) {
  reply.code(400).send({
    message: "Payload non valido.",
    issues,
  });
}

export async function registerKitchenTicketRoutes(app: FastifyInstance) {
  app.get("/kitchen-tickets", { preHandler: app.authorize("operator") }, async (request, reply) => {
    const parsedQuery = ticketListQuerySchema.safeParse(request.query ?? {});

    if (!parsedQuery.success) {
      validationError(reply, parsedQuery.error.flatten());
      return;
    }

    reply.send({
      kitchenTickets: await listKitchenTickets(app.db, parsedQuery.data),
    });
  });

  app.get("/kitchen-tickets/:id", { preHandler: app.authorize("operator") }, async (request, reply) => {
    const parsedParams = ticketIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    const kitchenTicket = await getKitchenTicketDetail(app.db, parsedParams.data.id);

    if (!kitchenTicket) {
      reply.code(404).send({
        message: "Ticket cucina non trovato.",
      });
      return;
    }

    reply.send({ kitchenTicket });
  });

  app.post("/kitchen-tickets/:id/retry-delivery", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = ticketIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    const kitchenTicket = await getKitchenTicketDetail(app.db, parsedParams.data.id);

    if (!kitchenTicket) {
      reply.code(404).send({
        message: "Ticket cucina non trovato.",
      });
      return;
    }

    const deliveryResult = await deliverKitchenTicket(app.db, parsedParams.data.id);

    if (!deliveryResult) {
      reply.code(404).send({
        message: "Ticket cucina non trovato.",
      });
      return;
    }

    if (deliveryResult.alreadyPrinted) {
      reply.code(400).send({
        message: "Il ticket e gia stampato.",
      });
      return;
    }

    reply.send({
      kitchenTicket: await getKitchenTicketDetail(app.db, parsedParams.data.id),
      deliveryResult,
    });
  });

  app.patch("/kitchen-tickets/:id/mark-printed", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = ticketIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    const orderId = await markKitchenTicketPrinted(app.db, parsedParams.data.id);

    if (!orderId) {
      reply.code(404).send({
        message: "Ticket cucina non trovato.",
      });
      return;
    }

    reply.send({
      kitchenTicket: await getKitchenTicketDetail(app.db, parsedParams.data.id),
    });
  });
}