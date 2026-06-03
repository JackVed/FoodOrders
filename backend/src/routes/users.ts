import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { canAssignRole, canManageRole } from "../modules/auth/authorization.js";
import {
  createUser,
  getUserById,
  listUsers,
  revokeActiveSessionsForUser,
  setUserPassword,
  type UpdateUserInput,
  updateUser,
} from "../modules/users/service.js";

const userIdParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(8).max(128),
  role: z.enum(["admin", "management", "operator"]),
});

const updateUserSchema = z.object({
  username: z.string().trim().min(3).max(64).optional(),
  role: z.enum(["admin", "management", "operator"]).optional(),
  isEnabled: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "Devi specificare almeno un campo da aggiornare.",
});

const updateUserPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

function validationError(reply: FastifyReply, issues: unknown) {
  reply.code(400).send({
    message: "Payload non valido.",
    issues,
  });
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function registerUserRoutes(app: FastifyInstance) {
  app.get("/users", { preHandler: app.authorize("management") }, async () => {
    return {
      users: await listUsers(app.db),
    };
  });

  app.post("/users", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedBody = createUserSchema.safeParse(request.body);

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    const actor = request.currentUser;

    if (!actor || !canAssignRole(actor.role, parsedBody.data.role)) {
      reply.code(403).send({
        message: "Permessi insufficienti per creare questo utente.",
      });
      return;
    }

    try {
      const user = await createUser(app.db, parsedBody.data);

      reply.code(201).send({ user });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia un utente con questo username.",
        });
        return;
      }

      throw error;
    }
  });

  app.get("/users/:userId", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = userIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    const user = await getUserById(app.db, parsedParams.data.userId);

    if (!user) {
      reply.code(404).send({
        message: "Utente non trovato.",
      });
      return;
    }

    reply.send({ user });
  });

  app.patch("/users/:userId", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = userIdParamsSchema.safeParse(request.params);
    const parsedBody = updateUserSchema.safeParse(request.body);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    const actor = request.currentUser;

    if (!actor) {
      reply.code(401).send({
        message: "Autenticazione richiesta.",
      });
      return;
    }

    const targetUser = await getUserById(app.db, parsedParams.data.userId);

    if (!targetUser) {
      reply.code(404).send({
        message: "Utente non trovato.",
      });
      return;
    }

    if (!canManageRole(actor.role, targetUser.role)) {
      reply.code(403).send({
        message: "Non puoi gestire questo utente.",
      });
      return;
    }

    if (actor.id === targetUser.id && (parsedBody.data.role !== undefined || parsedBody.data.isEnabled === false)) {
      reply.code(400).send({
        message: "Non puoi disattivare o cambiare il ruolo del tuo account da questa rotta.",
      });
      return;
    }

    if (parsedBody.data.role !== undefined && !canAssignRole(actor.role, parsedBody.data.role)) {
      reply.code(403).send({
        message: "Permessi insufficienti per assegnare questo ruolo.",
      });
      return;
    }

    const now = new Date();
    const updates: UpdateUserInput = {};

    if (parsedBody.data.username !== undefined) {
      updates.username = parsedBody.data.username;
    }

    if (parsedBody.data.role !== undefined) {
      updates.role = parsedBody.data.role;
    }

    if (parsedBody.data.isEnabled !== undefined) {
      updates.isEnabled = parsedBody.data.isEnabled;
    }

    try {
      const user = await app.db.transaction(async (tx) => {
        const updatedUser = await updateUser(tx, targetUser.id, updates, now);

        if (!updatedUser) {
          return null;
        }

        if (parsedBody.data.isEnabled === false) {
          await revokeActiveSessionsForUser(tx, targetUser.id, now);
        }

        return updatedUser;
      });

      if (!user) {
        reply.code(404).send({
          message: "Utente non trovato.",
        });
        return;
      }

      reply.send({ user });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia un utente con questo username.",
        });
        return;
      }

      throw error;
    }
  });

  app.patch("/users/:userId/password", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = userIdParamsSchema.safeParse(request.params);
    const parsedBody = updateUserPasswordSchema.safeParse(request.body);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    const actor = request.currentUser;

    if (!actor) {
      reply.code(401).send({
        message: "Autenticazione richiesta.",
      });
      return;
    }

    const targetUser = await getUserById(app.db, parsedParams.data.userId);

    if (!targetUser) {
      reply.code(404).send({
        message: "Utente non trovato.",
      });
      return;
    }

    if (!canManageRole(actor.role, targetUser.role)) {
      reply.code(403).send({
        message: "Non puoi gestire questo utente.",
      });
      return;
    }

    const user = await setUserPassword(app.db, targetUser.id, parsedBody.data.password, new Date());

    reply.send({ user });
  });
}