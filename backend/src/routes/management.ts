import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import {
  kitchenAreas,
  kitchenTickets,
  menuCategories,
  menuItemOptionGroups,
  menuItemOptions,
  menuItems,
  printers,
} from "../db/schema/index.js";

const entityIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const nameSchema = z.string().trim().min(1).max(64);
const codeSchema = z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/);
const sortOrderSchema = z.coerce.number().int().min(0);
const priceCentsSchema = z.coerce.number().int().min(0);

const kitchenAreaCreateSchema = z.object({
  name: nameSchema,
  sortOrder: sortOrderSchema.default(0),
  isActive: z.boolean().default(true),
});

const kitchenAreaUpdateSchema = z.object({
  name: nameSchema.optional(),
  sortOrder: sortOrderSchema.optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "Devi specificare almeno un campo da aggiornare.",
});

const printerCreateSchema = z.object({
  kitchenAreaId: z.coerce.number().int().positive(),
  name: nameSchema,
  transportType: z.enum(["mock", "network", "system"]),
  connectionConfigJson: z.record(z.string(), z.unknown()).default({}),
  isEnabled: z.boolean().default(true),
});

const printerUpdateSchema = z.object({
  kitchenAreaId: z.coerce.number().int().positive().optional(),
  name: nameSchema.optional(),
  transportType: z.enum(["mock", "network", "system"]).optional(),
  connectionConfigJson: z.record(z.string(), z.unknown()).optional(),
  isEnabled: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "Devi specificare almeno un campo da aggiornare.",
});

const menuCategoryCreateSchema = z.object({
  kitchenAreaId: z.coerce.number().int().positive(),
  name: nameSchema,
  sortOrder: sortOrderSchema.default(0),
  isActive: z.boolean().default(true),
});

const menuCategoryUpdateSchema = z.object({
  kitchenAreaId: z.coerce.number().int().positive().optional(),
  name: nameSchema.optional(),
  sortOrder: sortOrderSchema.optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "Devi specificare almeno un campo da aggiornare.",
});

const menuItemCreateSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  kitchenAreaId: z.coerce.number().int().positive().nullable().optional(),
  name: nameSchema,
  itemType: z.enum(["fixed", "composable"]),
  basePriceCents: priceCentsSchema,
  sortOrder: sortOrderSchema.default(0),
  isActive: z.boolean().default(true),
});

const menuItemUpdateSchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  kitchenAreaId: z.coerce.number().int().positive().nullable().optional(),
  name: nameSchema.optional(),
  itemType: z.enum(["fixed", "composable"]).optional(),
  basePriceCents: priceCentsSchema.optional(),
  sortOrder: sortOrderSchema.optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "Devi specificare almeno un campo da aggiornare.",
});

const optionGroupStrategySchema = z.discriminatedUnion("pricingStrategy", [
  z.object({
    pricingStrategy: z.literal("sum_options"),
  }),
  z.object({
    pricingStrategy: z.literal("any_selected"),
    anySelectedDeltaCents: priceCentsSchema,
  }),
  z.object({
    pricingStrategy: z.literal("first_and_additional"),
    firstSelectedDeltaCents: priceCentsSchema,
    additionalSelectedDeltaCents: priceCentsSchema,
  }),
  z.object({
    pricingStrategy: z.literal("per_selected"),
    perSelectedDeltaCents: priceCentsSchema,
  }),
]);

const optionGroupCreateSchema = z.object({
  name: nameSchema,
  code: codeSchema,
  minSelect: z.coerce.number().int().min(0),
  maxSelect: z.coerce.number().int().positive(),
  sortOrder: sortOrderSchema.default(0),
  isActive: z.boolean().default(true),
}).and(optionGroupStrategySchema).refine((value) => value.maxSelect >= value.minSelect, {
  message: "maxSelect deve essere maggiore o uguale a minSelect.",
  path: ["maxSelect"],
});

const optionCreateSchema = z.object({
  name: nameSchema,
  code: codeSchema,
  defaultDeltaCents: priceCentsSchema.default(0),
  sortOrder: sortOrderSchema.default(0),
  isActive: z.boolean().default(true),
});

const optionUpdateSchema = z.object({
  name: nameSchema.optional(),
  code: codeSchema.optional(),
  defaultDeltaCents: priceCentsSchema.optional(),
  sortOrder: sortOrderSchema.optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "Devi specificare almeno un campo da aggiornare.",
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

function isForeignKeyViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23503";
}

function getConstraintName(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  if ("constraint_name" in error && typeof error.constraint_name === "string") {
    return error.constraint_name;
  }

  if ("constraint" in error && typeof error.constraint === "string") {
    return error.constraint;
  }

  return null;
}

function buildPricingStrategyFields(value: z.infer<typeof optionGroupCreateSchema>) {
  return {
    pricingStrategy: value.pricingStrategy,
    firstSelectedDeltaCents:
      value.pricingStrategy === "first_and_additional" ? value.firstSelectedDeltaCents : null,
    additionalSelectedDeltaCents:
      value.pricingStrategy === "first_and_additional" ? value.additionalSelectedDeltaCents : null,
    anySelectedDeltaCents:
      value.pricingStrategy === "any_selected" ? value.anySelectedDeltaCents : null,
    perSelectedDeltaCents:
      value.pricingStrategy === "per_selected" ? value.perSelectedDeltaCents : null,
  };
}

async function hasActiveOptionGroups(app: FastifyInstance, menuItemId: number) {
  const rows = await app.db
    .select({ id: menuItemOptionGroups.id })
    .from(menuItemOptionGroups)
    .where(and(eq(menuItemOptionGroups.menuItemId, menuItemId), eq(menuItemOptionGroups.isActive, true)))
    .limit(1);

  return rows.length > 0;
}

async function getManagementConfiguration(app: FastifyInstance) {
  const [areaRows, printerRows, categoryRows, itemRows, optionGroupRows, optionRows] = await Promise.all([
    app.db.select().from(kitchenAreas).orderBy(asc(kitchenAreas.sortOrder), asc(kitchenAreas.name)),
    app.db.select().from(printers).orderBy(asc(printers.name)),
    app.db.select().from(menuCategories).orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name)),
    app.db.select().from(menuItems).orderBy(asc(menuItems.sortOrder), asc(menuItems.name)),
    app.db
      .select()
      .from(menuItemOptionGroups)
      .orderBy(asc(menuItemOptionGroups.sortOrder), asc(menuItemOptionGroups.name)),
    app.db.select().from(menuItemOptions).orderBy(asc(menuItemOptions.sortOrder), asc(menuItemOptions.name)),
  ]);

  return {
    kitchenAreas: areaRows,
    printers: printerRows,
    categories: categoryRows,
    items: itemRows,
    optionGroups: optionGroupRows,
    options: optionRows,
  };
}

export async function registerManagementRoutes(app: FastifyInstance) {
  app.get("/configuration", { preHandler: app.authorize("management") }, async () => {
    return getManagementConfiguration(app);
  });

  app.post("/kitchen-areas", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedBody = kitchenAreaCreateSchema.safeParse(request.body);

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    try {
      const kitchenArea = (
        await app.db
          .insert(kitchenAreas)
          .values(parsedBody.data)
          .returning()
      )[0];

      reply.code(201).send({ kitchenArea });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia un area cucina con questo nome.",
        });
        return;
      }

      throw error;
    }
  });

  app.patch("/kitchen-areas/:id", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = entityIdParamsSchema.safeParse(request.params);
    const parsedBody = kitchenAreaUpdateSchema.safeParse(request.body);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    try {
      const kitchenArea = (
        await app.db
          .update(kitchenAreas)
          .set({
            ...(parsedBody.data.name !== undefined ? { name: parsedBody.data.name } : {}),
            ...(parsedBody.data.sortOrder !== undefined ? { sortOrder: parsedBody.data.sortOrder } : {}),
            ...(parsedBody.data.isActive !== undefined ? { isActive: parsedBody.data.isActive } : {}),
            updatedAt: new Date(),
          })
          .where(eq(kitchenAreas.id, parsedParams.data.id))
          .returning()
      )[0];

      if (!kitchenArea) {
        reply.code(404).send({
          message: "Area cucina non trovata.",
        });
        return;
      }

      reply.send({ kitchenArea });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia un area cucina con questo nome.",
        });
        return;
      }

      throw error;
    }
  });

  app.post("/printers", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedBody = printerCreateSchema.safeParse(request.body);

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    try {
      const printer = (
        await app.db
          .insert(printers)
          .values(parsedBody.data)
          .returning()
      )[0];

      reply.code(201).send({ printer });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia una stampante con questo nome.",
        });
        return;
      }

      if (isForeignKeyViolation(error)) {
        reply.code(400).send({
          message: "Area cucina non valida per la stampante.",
        });
        return;
      }

      throw error;
    }
  });

  app.patch("/printers/:id", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = entityIdParamsSchema.safeParse(request.params);
    const parsedBody = printerUpdateSchema.safeParse(request.body);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    try {
      const existingPrinter = (
        await app.db
          .select({
            id: printers.id,
            kitchenAreaId: printers.kitchenAreaId,
          })
          .from(printers)
          .where(eq(printers.id, parsedParams.data.id))
          .limit(1)
      )[0];

      if (!existingPrinter) {
        reply.code(404).send({
          message: "Stampante non trovata.",
        });
        return;
      }

      const isChangingKitchenArea =
        parsedBody.data.kitchenAreaId !== undefined
        && parsedBody.data.kitchenAreaId !== existingPrinter.kitchenAreaId;

      if (isChangingKitchenArea) {
        const referencedTicket = (
          await app.db
            .select({ id: kitchenTickets.id })
            .from(kitchenTickets)
            .where(eq(kitchenTickets.printerId, existingPrinter.id))
            .limit(1)
        )[0];

        if (referencedTicket) {
          reply.code(409).send({
            message: "Non puoi spostare la stampante in un'altra area cucina finche esistono ticket che la referenziano.",
          });
          return;
        }
      }

      const printer = (
        await app.db
          .update(printers)
          .set({
            ...(parsedBody.data.kitchenAreaId !== undefined
              ? { kitchenAreaId: parsedBody.data.kitchenAreaId }
              : {}),
            ...(parsedBody.data.name !== undefined ? { name: parsedBody.data.name } : {}),
            ...(parsedBody.data.transportType !== undefined
              ? { transportType: parsedBody.data.transportType }
              : {}),
            ...(parsedBody.data.connectionConfigJson !== undefined
              ? { connectionConfigJson: parsedBody.data.connectionConfigJson }
              : {}),
            ...(parsedBody.data.isEnabled !== undefined ? { isEnabled: parsedBody.data.isEnabled } : {}),
            updatedAt: new Date(),
          })
            .where(eq(printers.id, existingPrinter.id))
          .returning()
      )[0];

      if (!printer) {
        reply.code(404).send({
          message: "Stampante non trovata.",
        });
        return;
      }

      reply.send({ printer });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia una stampante con questo nome.",
        });
        return;
      }

      if (isForeignKeyViolation(error)) {
        if (
          getConstraintName(error)
          === "kitchen_tickets_printer_area_fk"
        ) {
          reply.code(409).send({
            message: "Non puoi spostare la stampante in un'altra area cucina finche esistono ticket che la referenziano.",
          });
          return;
        }

        reply.code(400).send({
          message: "Area cucina non valida per la stampante.",
        });
        return;
      }

      throw error;
    }
  });

  app.post("/menu-categories", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedBody = menuCategoryCreateSchema.safeParse(request.body);

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    try {
      const category = (
        await app.db
          .insert(menuCategories)
          .values(parsedBody.data)
          .returning()
      )[0];

      reply.code(201).send({ category });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia una categoria con questo nome in questa area.",
        });
        return;
      }

      if (isForeignKeyViolation(error)) {
        reply.code(400).send({
          message: "Area cucina non valida per la categoria.",
        });
        return;
      }

      throw error;
    }
  });

  app.patch("/menu-categories/:id", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = entityIdParamsSchema.safeParse(request.params);
    const parsedBody = menuCategoryUpdateSchema.safeParse(request.body);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    try {
      const category = (
        await app.db
          .update(menuCategories)
          .set({
            ...(parsedBody.data.kitchenAreaId !== undefined
              ? { kitchenAreaId: parsedBody.data.kitchenAreaId }
              : {}),
            ...(parsedBody.data.name !== undefined ? { name: parsedBody.data.name } : {}),
            ...(parsedBody.data.sortOrder !== undefined ? { sortOrder: parsedBody.data.sortOrder } : {}),
            ...(parsedBody.data.isActive !== undefined ? { isActive: parsedBody.data.isActive } : {}),
            updatedAt: new Date(),
          })
          .where(eq(menuCategories.id, parsedParams.data.id))
          .returning()
      )[0];

      if (!category) {
        reply.code(404).send({
          message: "Categoria non trovata.",
        });
        return;
      }

      reply.send({ category });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia una categoria con questo nome in questa area.",
        });
        return;
      }

      if (isForeignKeyViolation(error)) {
        reply.code(400).send({
          message: "Area cucina non valida per la categoria.",
        });
        return;
      }

      throw error;
    }
  });

  app.post("/menu-items", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedBody = menuItemCreateSchema.safeParse(request.body);

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    try {
      const item = (
        await app.db
          .insert(menuItems)
          .values({
            ...parsedBody.data,
            kitchenAreaId: parsedBody.data.kitchenAreaId ?? null,
          })
          .returning()
      )[0];

      reply.code(201).send({ item });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia una voce con questo nome nella categoria.",
        });
        return;
      }

      if (isForeignKeyViolation(error)) {
        reply.code(400).send({
          message: "Categoria o area cucina non valida per questa voce.",
        });
        return;
      }

      throw error;
    }
  });

  app.patch("/menu-items/:id", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = entityIdParamsSchema.safeParse(request.params);
    const parsedBody = menuItemUpdateSchema.safeParse(request.body);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    if (parsedBody.data.itemType === "fixed" && await hasActiveOptionGroups(app, parsedParams.data.id)) {
      reply.code(400).send({
        message: "Disattiva prima i gruppi opzione prima di impostare la voce come fissa.",
      });
      return;
    }

    try {
      const item = (
        await app.db
          .update(menuItems)
          .set({
            ...(parsedBody.data.categoryId !== undefined ? { categoryId: parsedBody.data.categoryId } : {}),
            ...(parsedBody.data.kitchenAreaId !== undefined
              ? { kitchenAreaId: parsedBody.data.kitchenAreaId }
              : {}),
            ...(parsedBody.data.name !== undefined ? { name: parsedBody.data.name } : {}),
            ...(parsedBody.data.itemType !== undefined ? { itemType: parsedBody.data.itemType } : {}),
            ...(parsedBody.data.basePriceCents !== undefined
              ? { basePriceCents: parsedBody.data.basePriceCents }
              : {}),
            ...(parsedBody.data.sortOrder !== undefined ? { sortOrder: parsedBody.data.sortOrder } : {}),
            ...(parsedBody.data.isActive !== undefined ? { isActive: parsedBody.data.isActive } : {}),
            updatedAt: new Date(),
          })
          .where(eq(menuItems.id, parsedParams.data.id))
          .returning()
      )[0];

      if (!item) {
        reply.code(404).send({
          message: "Voce menu non trovata.",
        });
        return;
      }

      reply.send({ item });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia una voce con questo nome nella categoria.",
        });
        return;
      }

      if (isForeignKeyViolation(error)) {
        reply.code(400).send({
          message: "Categoria o area cucina non valida per questa voce.",
        });
        return;
      }

      throw error;
    }
  });

  app.post("/menu-items/:id/option-groups", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = entityIdParamsSchema.safeParse(request.params);
    const parsedBody = optionGroupCreateSchema.safeParse(request.body);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    const item = (
      await app.db
        .select({ id: menuItems.id, itemType: menuItems.itemType })
        .from(menuItems)
        .where(eq(menuItems.id, parsedParams.data.id))
        .limit(1)
    )[0];

    if (!item) {
      reply.code(404).send({
        message: "Voce menu non trovata.",
      });
      return;
    }

    if (item.itemType !== "composable") {
      reply.code(400).send({
        message: "Solo le voci componibili possono avere gruppi opzione.",
      });
      return;
    }

    try {
      const optionGroup = (
        await app.db
          .insert(menuItemOptionGroups)
          .values({
            menuItemId: item.id,
            name: parsedBody.data.name,
            code: parsedBody.data.code,
            minSelect: parsedBody.data.minSelect,
            maxSelect: parsedBody.data.maxSelect,
            sortOrder: parsedBody.data.sortOrder,
            isActive: parsedBody.data.isActive,
            ...buildPricingStrategyFields(parsedBody.data),
          })
          .returning()
      )[0];

      reply.code(201).send({ optionGroup });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia un gruppo opzione con questo codice per questa voce.",
        });
        return;
      }

      throw error;
    }
  });

  app.patch("/option-groups/:id", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = entityIdParamsSchema.safeParse(request.params);
    const parsedBody = optionGroupCreateSchema.safeParse(request.body);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    try {
      const optionGroup = (
        await app.db
          .update(menuItemOptionGroups)
          .set({
            name: parsedBody.data.name,
            code: parsedBody.data.code,
            minSelect: parsedBody.data.minSelect,
            maxSelect: parsedBody.data.maxSelect,
            sortOrder: parsedBody.data.sortOrder,
            isActive: parsedBody.data.isActive,
            ...buildPricingStrategyFields(parsedBody.data),
          })
          .where(eq(menuItemOptionGroups.id, parsedParams.data.id))
          .returning()
      )[0];

      if (!optionGroup) {
        reply.code(404).send({
          message: "Gruppo opzione non trovato.",
        });
        return;
      }

      reply.send({ optionGroup });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia un gruppo opzione con questo codice per questa voce.",
        });
        return;
      }

      throw error;
    }
  });

  app.post("/option-groups/:id/options", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = entityIdParamsSchema.safeParse(request.params);
    const parsedBody = optionCreateSchema.safeParse(request.body);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    const optionGroup = (
      await app.db
        .select({ id: menuItemOptionGroups.id })
        .from(menuItemOptionGroups)
        .where(eq(menuItemOptionGroups.id, parsedParams.data.id))
        .limit(1)
    )[0];

    if (!optionGroup) {
      reply.code(404).send({
        message: "Gruppo opzione non trovato.",
      });
      return;
    }

    try {
      const option = (
        await app.db
          .insert(menuItemOptions)
          .values({
            optionGroupId: optionGroup.id,
            ...parsedBody.data,
          })
          .returning()
      )[0];

      reply.code(201).send({ option });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia una opzione con questo codice per il gruppo selezionato.",
        });
        return;
      }

      throw error;
    }
  });

  app.patch("/options/:id", { preHandler: app.authorize("management") }, async (request, reply) => {
    const parsedParams = entityIdParamsSchema.safeParse(request.params);
    const parsedBody = optionUpdateSchema.safeParse(request.body);

    if (!parsedParams.success) {
      validationError(reply, parsedParams.error.flatten());
      return;
    }

    if (!parsedBody.success) {
      validationError(reply, parsedBody.error.flatten());
      return;
    }

    try {
      const option = (
        await app.db
          .update(menuItemOptions)
          .set({
            ...(parsedBody.data.name !== undefined ? { name: parsedBody.data.name } : {}),
            ...(parsedBody.data.code !== undefined ? { code: parsedBody.data.code } : {}),
            ...(parsedBody.data.defaultDeltaCents !== undefined
              ? { defaultDeltaCents: parsedBody.data.defaultDeltaCents }
              : {}),
            ...(parsedBody.data.sortOrder !== undefined ? { sortOrder: parsedBody.data.sortOrder } : {}),
            ...(parsedBody.data.isActive !== undefined ? { isActive: parsedBody.data.isActive } : {}),
          })
          .where(eq(menuItemOptions.id, parsedParams.data.id))
          .returning()
      )[0];

      if (!option) {
        reply.code(404).send({
          message: "Opzione non trovata.",
        });
        return;
      }

      reply.send({ option });
    } catch (error) {
      if (isUniqueViolation(error)) {
        reply.code(409).send({
          message: "Esiste gia una opzione con questo codice per il gruppo selezionato.",
        });
        return;
      }

      throw error;
    }
  });
}